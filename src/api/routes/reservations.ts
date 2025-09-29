import { Router, Request, Response } from 'express';
import { BusinessOperationsService } from '../../servers/business-operations/business-service';
import { requireRole } from '../middleware/auth';
import logger from '../../shared/utils/logger';
import Joi from 'joi';

interface AuthenticatedRequest extends Request {
  user?: any;
}

const router = Router();
const businessService = new BusinessOperationsService();

// Validation schemas
const createBookingSchema = Joi.object({
  customerId: Joi.string().required(),
  customerName: Joi.string().required(),
  customerPhone: Joi.string().required(),
  customerEmail: Joi.string().email().required(),
  serviceType: Joi.string().valid('accommodation', 'transfer', 'activity', 'miscellaneous').required(),
  serviceDetails: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    duration: Joi.string(),
    location: Joi.string()
  }).required(),
  checkIn: Joi.date(),
  checkOut: Joi.date(),
  guests: Joi.number().min(1).required(),
  totalAmount: Joi.number().min(0).required()
});

const updateBookingSchema = Joi.object({
  customerName: Joi.string(),
  customerPhone: Joi.string(),
  customerEmail: Joi.string().email(),
  serviceDetails: Joi.object({
    name: Joi.string(),
    description: Joi.string(),
    duration: Joi.string(),
    location: Joi.string()
  }),
  checkIn: Joi.date(),
  checkOut: Joi.date(),
  guests: Joi.number().min(1),
  totalAmount: Joi.number().min(0),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed')
});

const processPaymentSchema = Joi.object({
  bookingId: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  paymentMethod: Joi.string().valid('card', 'cash', 'bank_transfer', 'mobile_money').required(),
  reference: Joi.string(),
  description: Joi.string()
});

// Create booking
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error, value } = createBookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details
      });
    }

    const booking = await businessService.createBooking(value);
    
    logger.info(`Booking created: ${booking.id}`, { userId: req.user?.id });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    logger.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create booking'
    });
  }
});

// Get all bookings (with pagination and filtering)
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const serviceType = req.query.serviceType as string;
    const customerId = req.query.customerId as string;

    const bookings = await businessService.getBookings({
      page,
      limit,
      status,
      serviceType,
      customerId
    });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    logger.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    });
  }
});

// Get booking by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const booking = await businessService.getBooking(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    logger.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking'
    });
  }
});

// Update booking
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error, value } = updateBookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details
      });
    }

    const booking = await businessService.updateBooking(req.params.id, value);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    logger.info(`Booking updated: ${booking.id}`, { userId: req.user?.id });

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });
  } catch (error) {
    logger.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update booking'
    });
  }
});

// Cancel booking
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await businessService.cancelBooking(req.params.id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    logger.info(`Booking cancelled: ${req.params.id}`, { userId: req.user?.id });

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel booking'
    });
  }
});

// Check availability
router.post('/check-availability', async (req: Request, res: Response) => {
  try {
    const { checkIn, checkOut, serviceType, guests } = req.body;

    if (!checkIn || !checkOut || !serviceType) {
      return res.status(400).json({
        success: false,
        error: 'checkIn, checkOut, and serviceType are required'
      });
    }

    const availability = await businessService.checkAvailability({
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      serviceType,
      guests
    });

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    logger.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability'
    });
  }
});

// Process payment
router.post('/:id/payment', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error, value } = processPaymentSchema.validate({
      ...req.body,
      bookingId: req.params.id
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details
      });
    }

    const payment = await businessService.processPayment(value);

    logger.info(`Payment processed: ${payment.id}`, { 
      bookingId: req.params.id,
      userId: req.user?.id 
    });

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: payment
    });
  } catch (error) {
    logger.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payment'
    });
  }
});

// Get booking payments
router.get('/:id/payments', async (req: Request, res: Response) => {
  try {
    const payments = await businessService.getBookingPayments(req.params.id);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    logger.error('Get booking payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking payments'
    });
  }
});

// Refund payment
router.post('/payments/:paymentId/refund', requireRole(['admin', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const result = await businessService.refundPayment(req.params.paymentId, amount);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found or refund failed'
      });
    }

    logger.info(`Payment refunded: ${req.params.paymentId}`, { 
      amount,
      userId: req.user?.id 
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully'
    });
  } catch (error) {
    logger.error('Refund payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund'
    });
  }
});

export { router as reservationRoutes };