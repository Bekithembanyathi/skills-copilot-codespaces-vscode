import mongoose, { Schema, Document } from 'mongoose';
import { Booking, Room, Payment, Sale, User, EmailTemplate, EmailJob, WhatsAppMessage, WhatsAppSession } from '../types';

// Booking Schema
const BookingSchema = new Schema<Booking & Document>({
  id: { type: String, required: true, unique: true },
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String, required: true },
  serviceType: { 
    type: String, 
    enum: ['accommodation', 'transfer', 'activity', 'miscellaneous'],
    required: true 
  },
  serviceDetails: {
    name: { type: String, required: true },
    description: { type: String, required: true },
    duration: String,
    location: String,
  },
  checkIn: Date,
  checkOut: Date,
  guests: { type: Number, required: true, min: 1 },
  totalAmount: { type: Number, required: true, min: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['unpaid', 'partial', 'paid', 'refunded'],
    default: 'unpaid' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Room Schema
const RoomSchema = new Schema<Room & Document>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['single', 'double', 'suite', 'family'],
    required: true 
  },
  capacity: { type: Number, required: true, min: 1 },
  pricePerNight: { type: Number, required: true, min: 0 },
  amenities: [String],
  available: { type: Boolean, default: true },
  maintenanceSchedule: [Date]
});

// Payment Schema
const PaymentSchema = new Schema<Payment & Document>({
  id: { type: String, required: true, unique: true },
  bookingId: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  method: { 
    type: String, 
    enum: ['card', 'bank_transfer', 'cash', 'mobile_money'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending' 
  },
  transactionId: String,
  gatewayResponse: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  processedAt: Date
});

// Sale Schema
const SaleSchema = new Schema<Sale & Document>({
  id: { type: String, required: true, unique: true },
  bookingId: { type: String, required: true },
  items: [{
    serviceType: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  }],
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  discounts: [{
    type: { type: String, enum: ['percentage', 'fixed'] },
    value: { type: Number, min: 0 },
    reason: String
  }],
  createdAt: { type: Date, default: Date.now }
});

// User Schema
const UserSchema = new Schema<User & Document>({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'staff', 'customer'],
    default: 'customer' 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended'],
    default: 'active' 
  },
  preferences: {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    notifications: {
      email: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

// Email Template Schema
const EmailTemplateSchema = new Schema<EmailTemplate & Document>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  htmlContent: { type: String, required: true },
  textContent: { type: String, required: true },
  variables: [String],
  category: { 
    type: String, 
    enum: ['booking', 'payment', 'marketing', 'notification'],
    required: true 
  }
});

// Email Job Schema
const EmailJobSchema = new Schema<EmailJob & Document>({
  id: { type: String, required: true, unique: true },
  to: [{ type: String, required: true }],
  cc: [String],
  bcc: [String],
  subject: { type: String, required: true },
  content: { type: String, required: true },
  templateId: String,
  variables: Schema.Types.Mixed,
  status: { 
    type: String, 
    enum: ['queued', 'sending', 'sent', 'failed'],
    default: 'queued' 
  },
  scheduledAt: Date,
  sentAt: Date,
  error: String
});

// WhatsApp Message Schema
const WhatsAppMessageSchema = new Schema<WhatsAppMessage & Document>({
  id: { type: String, required: true, unique: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  message: { type: String, required: true },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'document', 'audio'],
    default: 'text' 
  },
  timestamp: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent' 
  },
  context: String
});

// WhatsApp Session Schema
const WhatsAppSessionSchema = new Schema<WhatsAppSession & Document>({
  id: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  customerId: String,
  context: { type: String, required: true },
  lastActivity: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

// Create and export models
export const BookingModel = mongoose.model<Booking & Document>('Booking', BookingSchema);
export const RoomModel = mongoose.model<Room & Document>('Room', RoomSchema);
export const PaymentModel = mongoose.model<Payment & Document>('Payment', PaymentSchema);
export const SaleModel = mongoose.model<Sale & Document>('Sale', SaleSchema);
export const UserModel = mongoose.model<User & Document>('User', UserSchema);
export const EmailTemplateModel = mongoose.model<EmailTemplate & Document>('EmailTemplate', EmailTemplateSchema);
export const EmailJobModel = mongoose.model<EmailJob & Document>('EmailJob', EmailJobSchema);
export const WhatsAppMessageModel = mongoose.model<WhatsAppMessage & Document>('WhatsAppMessage', WhatsAppMessageSchema);
export const WhatsAppSessionModel = mongoose.model<WhatsAppSession & Document>('WhatsAppSession', WhatsAppSessionSchema);