import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import QRCode from 'qrcode-terminal';
import logger from '../../shared/utils/logger';
import { WhatsAppMessage, WhatsAppSession } from '../../shared/types';
import { WhatsAppMessageModel, WhatsAppSessionModel } from '../../shared/database/models';
import { generateId } from '../../shared/utils/helpers';
import { ClaudeService } from './claude-service';

export class WhatsAppService {
  private client: Client;
  private claudeService: ClaudeService;
  private isReady: boolean = false;

  constructor(sessionPath: string, claudeService: ClaudeService) {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: sessionPath
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.claudeService = claudeService;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('qr', (qr) => {
      logger.info('WhatsApp QR Code received');
      QRCode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      logger.info('WhatsApp client is ready');
      this.isReady = true;
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp client authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      logger.error('WhatsApp authentication failed:', msg);
    });

    this.client.on('disconnected', (reason) => {
      logger.warn('WhatsApp client disconnected:', reason);
      this.isReady = false;
    });

    this.client.on('message', async (message) => {
      await this.handleIncomingMessage(message);
    });
  }

  public async initialize(): Promise<void> {
    try {
      await this.client.initialize();
      logger.info('WhatsApp service initialized');
    } catch (error) {
      logger.error('Failed to initialize WhatsApp service:', error);
      throw error;
    }
  }

  public async sendMessage(to: string, message: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const chatId = to.includes('@') ? to : `${to}@c.us`;
      await this.client.sendMessage(chatId, message);

      // Save message to database
      const whatsappMessage: WhatsAppMessage = {
        id: generateId(),
        from: 'business',
        to: to,
        message: message,
        messageType: 'text',
        timestamp: new Date(),
        status: 'sent'
      };

      await new WhatsAppMessageModel(whatsappMessage).save();
      logger.info(`Message sent to ${to}`);
    } catch (error) {
      logger.error('Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  private async handleIncomingMessage(message: Message): Promise<void> {
    try {
      if (message.fromMe || message.type !== 'chat') {
        return; // Ignore own messages and non-text messages
      }

      const contact = await message.getContact();
      const phoneNumber = contact.number;
      const messageText = message.body;

      logger.info(`Received message from ${phoneNumber}: ${messageText}`);

      // Save incoming message
      const whatsappMessage: WhatsAppMessage = {
        id: generateId(),
        from: phoneNumber,
        to: 'business',
        message: messageText,
        messageType: 'text',
        timestamp: new Date(),
        status: 'delivered'
      };

      await new WhatsAppMessageModel(whatsappMessage).save();

      // Get or create session
      let session = await WhatsAppSessionModel.findOne({ 
        phoneNumber: phoneNumber,
        isActive: true 
      });

      if (!session) {
        session = new WhatsAppSessionModel({
          id: generateId(),
          phoneNumber: phoneNumber,
          context: 'general',
          lastActivity: new Date(),
          isActive: true
        });
        await session.save();
      } else {
        session.lastActivity = new Date();
        await session.save();
      }

      // Process message with Claude
      const intent = await this.claudeService.analyzeCustomerIntent(messageText);
      logger.info(`Detected intent: ${intent.intent} (confidence: ${intent.confidence})`);

      // Generate response based on intent
      const response = await this.generateResponse(messageText, intent, session);

      // Send response
      await this.sendMessage(phoneNumber, response);

    } catch (error) {
      logger.error('Error handling incoming WhatsApp message:', error);
    }
  }

  private async generateResponse(
    message: string, 
    intent: any, 
    session: any
  ): Promise<string> {
    try {
      const context = {
        sessionContext: session.context,
        customerPhone: session.phoneNumber,
        detectedIntent: intent
      };

      const response = await this.claudeService.processBusinessQuery(message, context);
      
      // Add business-specific context
      const businessResponse = `${response}\n\n` +
        `For immediate assistance, you can also:\n` +
        `📞 Call us: +1-234-567-8900\n` +
        `📧 Email: info@yourbusiness.com\n` +
        `🌐 Visit: www.yourbusiness.com`;

      return businessResponse;
    } catch (error) {
      logger.error('Error generating response:', error);
      return "I apologize, but I'm having trouble processing your request right now. " +
             "Please try again in a moment or contact our support team directly.";
    }
  }

  public async broadcastMessage(phoneNumbers: string[], message: string): Promise<void> {
    const results = await Promise.allSettled(
      phoneNumbers.map(number => this.sendMessage(number, message))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Broadcast completed: ${successful} successful, ${failed} failed`);
  }

  public async getSessionHistory(phoneNumber: string, limit: number = 50): Promise<WhatsAppMessage[]> {
    try {
      const messages = await WhatsAppMessageModel
        .find({
          $or: [
            { from: phoneNumber },
            { to: phoneNumber }
          ]
        })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return messages;
    } catch (error) {
      logger.error('Error fetching session history:', error);
      return [];
    }
  }

  public isClientReady(): boolean {
    return this.isReady;
  }

  public async destroy(): Promise<void> {
    try {
      await this.client.destroy();
      this.isReady = false;
      logger.info('WhatsApp client destroyed');
    } catch (error) {
      logger.error('Error destroying WhatsApp client:', error);
    }
  }
}