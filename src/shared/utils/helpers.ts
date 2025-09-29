import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

export const generateId = (): string => {
  return uuidv4();
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
  return moment(date).format(format);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>\"'&]/g, '');
};

export const generateBookingReference = (): string => {
  const prefix = 'BK';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export const calculateTax = (amount: number, taxRate: number = 0.1): number => {
  return Math.round(amount * taxRate * 100) / 100;
};

export const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }
  
  return result;
};

export const isDateInRange = (date: Date, startDate: Date, endDate: Date): boolean => {
  return date >= startDate && date <= endDate;
};

export const getDaysBetween = (startDate: Date, endDate: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  return Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / oneDay));
};

export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (data.length <= visibleChars) return data;
  const visible = data.slice(-visibleChars);
  const masked = '*'.repeat(data.length - visibleChars);
  return masked + visible;
};

export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retryAsync = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await delay(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
};