import nodemailer from 'nodemailer';
import { EmailTemplate, EmailJob } from '../../shared/types';
import { EmailTemplateModel, EmailJobModel } from '../../shared/database/models';
import { generateId } from '../../shared/utils/helpers';
import logger from '../../shared/utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
      return true;
    } catch (error) {
      logger.error('SMTP connection verification failed:', error);
      return false;
    }
  }

  // Template Management
  async createTemplate(templateData: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate> {
    try {
      const template: EmailTemplate = {
        id: generateId(),
        ...templateData
      };

      const savedTemplate = await new EmailTemplateModel(template).save();
      logger.info(`Email template created: ${template.id}`);
      
      return savedTemplate.toObject();
    } catch (error) {
      logger.error('Error creating email template:', error);
      throw new Error('Failed to create email template');
    }
  }

  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    try {
      const template = await EmailTemplateModel.findOne({ id: templateId }).lean();
      return template;
    } catch (error) {
      logger.error('Error fetching email template:', error);
      throw new Error('Failed to fetch email template');
    }
  }

  async getTemplatesByCategory(category: string): Promise<EmailTemplate[]> {
    try {
      const templates = await EmailTemplateModel.find({ category }).lean();
      return templates;
    } catch (error) {
      logger.error('Error fetching templates by category:', error);
      throw new Error('Failed to fetch templates by category');
    }
  }

  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    try {
      const updatedTemplate = await EmailTemplateModel.findOneAndUpdate(
        { id: templateId },
        updates,
        { new: true }
      ).lean();

      if (updatedTemplate) {
        logger.info(`Email template updated: ${templateId}`);
      }

      return updatedTemplate;
    } catch (error) {
      logger.error('Error updating email template:', error);
      throw new Error('Failed to update email template');
    }
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const result = await EmailTemplateModel.deleteOne({ id: templateId });
      
      if (result.deletedCount > 0) {
        logger.info(`Email template deleted: ${templateId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error deleting email template:', error);
      throw new Error('Failed to delete email template');
    }
  }

  // Email Job Management
  async queueEmail(emailData: Omit<EmailJob, 'id' | 'status'>): Promise<EmailJob> {
    try {
      const emailJob: EmailJob = {
        id: generateId(),
        ...emailData,
        status: 'queued'
      };

      const savedJob = await new EmailJobModel(emailJob).save();
      logger.info(`Email queued: ${emailJob.id}`);
      
      return savedJob.toObject();
    } catch (error) {
      logger.error('Error queuing email:', error);
      throw new Error('Failed to queue email');
    }
  }

  async sendEmail(emailJobId: string): Promise<boolean> {
    try {
      const emailJob = await EmailJobModel.findOne({ id: emailJobId });
      if (!emailJob) {
        throw new Error('Email job not found');
      }

      if (emailJob.status !== 'queued') {
        throw new Error('Email job is not in queued status');
      }

      // Update status to sending
      await EmailJobModel.findOneAndUpdate(
        { id: emailJobId },
        { status: 'sending' }
      );

      // Prepare email content
      let content = emailJob.content;
      
      // If using template, replace variables
      if (emailJob.templateId && emailJob.variables) {
        const template = await this.getTemplate(emailJob.templateId);
        if (template) {
          content = this.replaceTemplateVariables(template.htmlContent, emailJob.variables);
        }
      }

      // Send email
      const mailOptions = {
        from: process.env.EMAIL_FROM!,
        to: emailJob.to.join(', '),
        cc: emailJob.cc?.join(', '),
        bcc: emailJob.bcc?.join(', '),
        subject: emailJob.subject,
        html: content,
        text: this.stripHtml(content)
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Update status to sent
      await EmailJobModel.findOneAndUpdate(
        { id: emailJobId },
        { 
          status: 'sent',
          sentAt: new Date()
        }
      );

      logger.info(`Email sent successfully: ${emailJobId}, MessageId: ${info.messageId}`);
      return true;

    } catch (error) {
      logger.error(`Error sending email ${emailJobId}:`, error);
      
      // Update status to failed
      await EmailJobModel.findOneAndUpdate(
        { id: emailJobId },
        { 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );

      return false;
    }
  }

  async sendEmailDirect(
    to: string[],
    subject: string,
    content: string,
    templateId?: string,
    variables?: Record<string, any>
  ): Promise<string> {
    try {
      // Queue the email first
      const emailJob = await this.queueEmail({
        to,
        subject,
        content,
        templateId,
        variables
      });

      // Send immediately
      const success = await this.sendEmail(emailJob.id);
      
      if (!success) {
        throw new Error('Failed to send email');
      }

      return emailJob.id;
    } catch (error) {
      logger.error('Error sending direct email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendBulkEmails(emails: Array<{
    to: string[];
    subject: string;
    content: string;
    templateId?: string;
    variables?: Record<string, any>;
  }>): Promise<string[]> {
    const emailJobIds: string[] = [];

    for (const emailData of emails) {
      try {
        const emailJob = await this.queueEmail(emailData);
        emailJobIds.push(emailJob.id);
      } catch (error) {
        logger.error('Error queuing bulk email:', error);
      }
    }

    // Process queued emails
    await this.processEmailQueue();

    return emailJobIds;
  }

  async processEmailQueue(): Promise<void> {
    try {
      const queuedEmails = await EmailJobModel.find({ 
        status: 'queued',
        $or: [
          { scheduledAt: { $exists: false } },
          { scheduledAt: { $lte: new Date() } }
        ]
      }).limit(10); // Process 10 at a time

      for (const email of queuedEmails) {
        await this.sendEmail(email.id);
        // Add small delay to avoid overwhelming SMTP server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (queuedEmails.length > 0) {
        logger.info(`Processed ${queuedEmails.length} emails from queue`);
      }
    } catch (error) {
      logger.error('Error processing email queue:', error);
    }
  }

  async scheduleEmail(
    emailData: Omit<EmailJob, 'id' | 'status'>,
    scheduledAt: Date
  ): Promise<EmailJob> {
    try {
      const emailJob = await this.queueEmail({
        ...emailData,
        scheduledAt
      });

      logger.info(`Email scheduled for ${scheduledAt}: ${emailJob.id}`);
      return emailJob;
    } catch (error) {
      logger.error('Error scheduling email:', error);
      throw new Error('Failed to schedule email');
    }
  }

  async getEmailStatus(emailJobId: string): Promise<EmailJob | null> {
    try {
      const emailJob = await EmailJobModel.findOne({ id: emailJobId }).lean();
      return emailJob;
    } catch (error) {
      logger.error('Error fetching email status:', error);
      throw new Error('Failed to fetch email status');
    }
  }

  async getEmailHistory(
    limit: number = 50,
    status?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<EmailJob[]> {
    try {
      const query: any = {};
      
      if (status) {
        query.status = status;
      }
      
      if (startDate || endDate) {
        query.sentAt = {};
        if (startDate) query.sentAt.$gte = startDate;
        if (endDate) query.sentAt.$lte = endDate;
      }

      const emails = await EmailJobModel
        .find(query)
        .sort({ sentAt: -1 })
        .limit(limit)
        .lean();

      return emails;
    } catch (error) {
      logger.error('Error fetching email history:', error);
      throw new Error('Failed to fetch email history');
    }
  }

  // Email Analytics
  async getEmailAnalytics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const emails = await EmailJobModel.find({
        sentAt: { $gte: startDate, $lte: endDate }
      }).lean();

      const analytics = {
        totalSent: emails.filter(e => e.status === 'sent').length,
        totalFailed: emails.filter(e => e.status === 'failed').length,
        totalQueued: emails.filter(e => e.status === 'queued').length,
        totalEmails: emails.length,
        deliveryRate: 0,
        failureRate: 0,
        byDay: {} as Record<string, number>,
        byStatus: {} as Record<string, number>
      };

      analytics.deliveryRate = analytics.totalEmails > 0 
        ? (analytics.totalSent / analytics.totalEmails) * 100 
        : 0;
      
      analytics.failureRate = analytics.totalEmails > 0 
        ? (analytics.totalFailed / analytics.totalEmails) * 100 
        : 0;

      // Group by day
      emails.forEach(email => {
        if (email.sentAt) {
          const day = email.sentAt.toISOString().split('T')[0];
          analytics.byDay[day] = (analytics.byDay[day] || 0) + 1;
        }
        
        analytics.byStatus[email.status] = (analytics.byStatus[email.status] || 0) + 1;
      });

      return analytics;
    } catch (error) {
      logger.error('Error generating email analytics:', error);
      throw new Error('Failed to generate email analytics');
    }
  }

  // Helper methods
  private replaceTemplateVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Predefined Templates
  async createDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        name: 'Booking Confirmation',
        subject: 'Booking Confirmation - {{bookingReference}}',
        htmlContent: `
          <h2>Booking Confirmation</h2>
          <p>Dear {{customerName}},</p>
          <p>Your booking has been confirmed! Here are the details:</p>
          <ul>
            <li><strong>Booking Reference:</strong> {{bookingReference}}</li>
            <li><strong>Service:</strong> {{serviceName}}</li>
            <li><strong>Check-in:</strong> {{checkIn}}</li>
            <li><strong>Check-out:</strong> {{checkOut}}</li>
            <li><strong>Guests:</strong> {{guests}}</li>
            <li><strong>Total Amount:</strong> ${{totalAmount}}</li>
          </ul>
          <p>Thank you for choosing our services!</p>
          <p>Best regards,<br>Your Hotel Team</p>
        `,
        textContent: 'Booking Confirmation - {{bookingReference}}\n\nDear {{customerName}},\n\nYour booking has been confirmed!',
        variables: ['customerName', 'bookingReference', 'serviceName', 'checkIn', 'checkOut', 'guests', 'totalAmount'],
        category: 'booking' as const
      },
      {
        name: 'Payment Receipt',
        subject: 'Payment Receipt - {{paymentId}}',
        htmlContent: `
          <h2>Payment Receipt</h2>
          <p>Dear {{customerName}},</p>
          <p>We have received your payment. Here are the details:</p>
          <ul>
            <li><strong>Payment ID:</strong> {{paymentId}}</li>
            <li><strong>Amount:</strong> ${{amount}}</li>
            <li><strong>Method:</strong> {{paymentMethod}}</li>
            <li><strong>Status:</strong> {{status}}</li>
            <li><strong>Date:</strong> {{paymentDate}}</li>
          </ul>
          <p>Thank you for your payment!</p>
        `,
        textContent: 'Payment Receipt - {{paymentId}}\n\nDear {{customerName}},\n\nWe have received your payment.',
        variables: ['customerName', 'paymentId', 'amount', 'paymentMethod', 'status', 'paymentDate'],
        category: 'payment' as const
      },
      {
        name: 'Welcome Email',
        subject: 'Welcome to {{companyName}}!',
        htmlContent: `
          <h2>Welcome to {{companyName}}!</h2>
          <p>Dear {{customerName}},</p>
          <p>Welcome to our service! We're excited to have you as our customer.</p>
          <p>Here's what you can expect:</p>
          <ul>
            <li>Excellent customer service</li>
            <li>Quality accommodations and services</li>
            <li>Easy booking and payment processes</li>
          </ul>
          <p>If you have any questions, feel free to contact us.</p>
          <p>Best regards,<br>{{companyName}} Team</p>
        `,
        textContent: 'Welcome to {{companyName}}!\n\nDear {{customerName}},\n\nWelcome to our service!',
        variables: ['customerName', 'companyName'],
        category: 'marketing' as const
      }
    ];

    for (const template of defaultTemplates) {
      try {
        const existing = await EmailTemplateModel.findOne({ name: template.name });
        if (!existing) {
          await this.createTemplate(template);
          logger.info(`Created default template: ${template.name}`);
        }
      } catch (error) {
        logger.error(`Error creating default template ${template.name}:`, error);
      }
    }
  }
}