// Core MCP Types
export interface MCPRequest {
  id: string;
  method: string;
  params?: any;
}

export interface MCPResponse {
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Business Domain Types
export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceType: 'accommodation' | 'transfer' | 'activity' | 'miscellaneous';
  serviceDetails: {
    name: string;
    description: string;
    duration?: string;
    location?: string;
  };
  checkIn?: Date;
  checkOut?: Date;
  guests: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  name: string;
  type: 'single' | 'double' | 'suite' | 'family';
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  available: boolean;
  maintenanceSchedule?: Date[];
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: 'card' | 'bank_transfer' | 'cash' | 'mobile_money';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  gatewayResponse?: any;
  createdAt: Date;
  processedAt?: Date;
}

export interface Sale {
  id: string;
  bookingId: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  discounts?: Discount[];
  createdAt: Date;
}

export interface SaleItem {
  serviceType: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Discount {
  type: 'percentage' | 'fixed';
  value: number;
  reason: string;
}

// Account Management Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  role: 'admin' | 'manager' | 'staff' | 'customer';
  status: 'active' | 'inactive' | 'suspended';
  preferences: UserPreferences;
  createdAt: Date;
  lastLogin?: Date;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    whatsapp: boolean;
    push: boolean;
  };
}

// Email Types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  category: 'booking' | 'payment' | 'marketing' | 'notification';
}

export interface EmailJob {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  content: string;
  templateId?: string;
  variables?: Record<string, any>;
  status: 'queued' | 'sending' | 'sent' | 'failed';
  scheduledAt?: Date;
  sentAt?: Date;
  error?: string;
}

// WhatsApp Types
export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  messageType: 'text' | 'image' | 'document' | 'audio';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  context?: string; // For conversation context
}

export interface WhatsAppSession {
  id: string;
  phoneNumber: string;
  customerId?: string;
  context: string;
  lastActivity: Date;
  isActive: boolean;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Configuration Types
export interface ServerConfig {
  port: number;
  environment: 'development' | 'production' | 'test';
  database: {
    uri: string;
    options?: any;
  };
  claude: {
    apiKey: string;
    model: string;
  };
  whatsapp: {
    sessionPath: string;
  };
  email: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  payment: {
    stripe: {
      secretKey: string;
      webhookSecret: string;
    };
  };
}