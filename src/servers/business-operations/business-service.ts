import { BookingModel, RoomModel, PaymentModel, SaleModel } from '../../shared/database/models';
import { Booking, Room, Payment, Sale, SaleItem } from '../../shared/types';
import { generateId, generateBookingReference, calculateTax, isDateInRange } from '../../shared/utils/helpers';
import logger from '../../shared/utils/logger';

export class BusinessOperationsService {
  
  // Booking Management
  async createBooking(bookingData: Partial<Booking>): Promise<Booking> {
    try {
      const booking: Booking = {
        id: generateId(),
        customerId: bookingData.customerId!,
        customerName: bookingData.customerName!,
        customerPhone: bookingData.customerPhone!,
        customerEmail: bookingData.customerEmail!,
        serviceType: bookingData.serviceType!,
        serviceDetails: bookingData.serviceDetails!,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: bookingData.guests!,
        totalAmount: bookingData.totalAmount!,
        status: 'pending',
        paymentStatus: 'unpaid',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const savedBooking = await new BookingModel(booking).save();
      logger.info(`Booking created: ${booking.id}`);
      
      return savedBooking.toObject();
    } catch (error) {
      logger.error('Error creating booking:', error);
      throw new Error('Failed to create booking');
    }
  }

  async getBooking(bookingId: string): Promise<Booking | null> {
    try {
      const booking = await BookingModel.findOne({ id: bookingId }).lean();
      return booking;
    } catch (error) {
      logger.error('Error fetching booking:', error);
      throw new Error('Failed to fetch booking');
    }
  }

  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<Booking | null> {
    try {
      const updatedBooking = await BookingModel.findOneAndUpdate(
        { id: bookingId },
        { ...updates, updatedAt: new Date() },
        { new: true }
      ).lean();

      if (updatedBooking) {
        logger.info(`Booking updated: ${bookingId}`);
      }

      return updatedBooking;
    } catch (error) {
      logger.error('Error updating booking:', error);
      throw new Error('Failed to update booking');
    }
  }

  async cancelBooking(bookingId: string): Promise<boolean> {
    try {
      const result = await BookingModel.findOneAndUpdate(
        { id: bookingId },
        { status: 'cancelled', updatedAt: new Date() },
        { new: true }
      );

      if (result) {
        logger.info(`Booking cancelled: ${bookingId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      throw new Error('Failed to cancel booking');
    }
  }

  async getBookingsByCustomer(customerId: string): Promise<Booking[]> {
    try {
      const bookings = await BookingModel.find({ customerId }).lean();
      return bookings;
    } catch (error) {
      logger.error('Error fetching customer bookings:', error);
      throw new Error('Failed to fetch customer bookings');
    }
  }

  // Room Management
  async checkRoomAvailability(
    checkIn: Date,
    checkOut: Date,
    roomType?: string,
    guests?: number
  ): Promise<Room[]> {
    try {
      const query: any = { available: true };
      
      if (roomType) {
        query.type = roomType;
      }
      
      if (guests) {
        query.capacity = { $gte: guests };
      }

      const rooms = await RoomModel.find(query).lean();
      
      // Filter out rooms with maintenance or bookings in the date range
      const availableRooms = rooms.filter(room => {
        if (room.maintenanceSchedule) {
          const hasMaintenanceConflict = room.maintenanceSchedule.some(date =>
            isDateInRange(date, checkIn, checkOut)
          );
          if (hasMaintenanceConflict) return false;
        }
        return true;
      });

      // Check for existing bookings (simplified - would need more complex logic in real app)
      const availableRoomIds = [];
      for (const room of availableRooms) {
        const conflictingBookings = await BookingModel.find({
          serviceType: 'accommodation',
          status: { $in: ['confirmed', 'pending'] },
          'serviceDetails.roomId': room.id,
          $or: [
            { checkIn: { $lte: checkOut }, checkOut: { $gte: checkIn } }
          ]
        });

        if (conflictingBookings.length === 0) {
          availableRoomIds.push(room);
        }
      }

      return availableRoomIds;
    } catch (error) {
      logger.error('Error checking room availability:', error);
      throw new Error('Failed to check room availability');
    }
  }

  async createRoom(roomData: Omit<Room, 'id'>): Promise<Room> {
    try {
      const room: Room = {
        id: generateId(),
        ...roomData
      };

      const savedRoom = await new RoomModel(room).save();
      logger.info(`Room created: ${room.id}`);
      
      return savedRoom.toObject();
    } catch (error) {
      logger.error('Error creating room:', error);
      throw new Error('Failed to create room');
    }
  }

  async updateRoomAvailability(roomId: string, available: boolean): Promise<boolean> {
    try {
      const result = await RoomModel.findOneAndUpdate(
        { id: roomId },
        { available },
        { new: true }
      );

      if (result) {
        logger.info(`Room availability updated: ${roomId} -> ${available}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating room availability:', error);
      throw new Error('Failed to update room availability');
    }
  }

  // Payment Management
  async processPayment(paymentData: Omit<Payment, 'id' | 'createdAt' | 'processedAt'>): Promise<Payment> {
    try {
      const payment: Payment = {
        id: generateId(),
        ...paymentData,
        createdAt: new Date()
      };

      // Simulate payment processing (integrate with real payment gateway)
      if (paymentData.method === 'card' && Math.random() > 0.1) { // 90% success rate
        payment.status = 'completed';
        payment.processedAt = new Date();
        payment.transactionId = `txn_${generateId().substring(0, 8)}`;
      } else {
        payment.status = 'failed';
        payment.gatewayResponse = { error: 'Payment processing failed' };
      }

      const savedPayment = await new PaymentModel(payment).save();

      // Update booking payment status
      if (payment.status === 'completed') {
        await this.updateBookingPaymentStatus(payment.bookingId);
      }

      logger.info(`Payment processed: ${payment.id} - ${payment.status}`);
      return savedPayment.toObject();
    } catch (error) {
      logger.error('Error processing payment:', error);
      throw new Error('Failed to process payment');
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<boolean> {
    try {
      const payment = await PaymentModel.findOne({ id: paymentId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Cannot refund non-completed payment');
      }

      const refundAmount = amount || payment.amount;
      
      // Create refund record
      const refund: Payment = {
        id: generateId(),
        bookingId: payment.bookingId,
        amount: -refundAmount,
        currency: payment.currency,
        method: payment.method,
        status: 'completed',
        transactionId: `refund_${generateId().substring(0, 8)}`,
        createdAt: new Date(),
        processedAt: new Date()
      };

      await new PaymentModel(refund).save();

      // Update original payment status
      await PaymentModel.findOneAndUpdate(
        { id: paymentId },
        { status: 'refunded' }
      );

      logger.info(`Payment refunded: ${paymentId} - Amount: ${refundAmount}`);
      return true;
    } catch (error) {
      logger.error('Error refunding payment:', error);
      throw new Error('Failed to refund payment');
    }
  }

  private async updateBookingPaymentStatus(bookingId: string): Promise<void> {
    try {
      const payments = await PaymentModel.find({ 
        bookingId,
        amount: { $gt: 0 } // Exclude refunds
      }).lean();

      const booking = await BookingModel.findOne({ id: bookingId });
      if (!booking) return;

      const totalPaid = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      let paymentStatus: string;
      if (totalPaid === 0) {
        paymentStatus = 'unpaid';
      } else if (totalPaid >= booking.totalAmount) {
        paymentStatus = 'paid';
      } else {
        paymentStatus = 'partial';
      }

      await BookingModel.findOneAndUpdate(
        { id: bookingId },
        { paymentStatus, updatedAt: new Date() }
      );
    } catch (error) {
      logger.error('Error updating booking payment status:', error);
    }
  }

  // Sales Management
  async createSale(saleData: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
    try {
      const sale: Sale = {
        id: generateId(),
        ...saleData,
        createdAt: new Date()
      };

      const savedSale = await new SaleModel(sale).save();
      logger.info(`Sale created: ${sale.id}`);
      
      return savedSale.toObject();
    } catch (error) {
      logger.error('Error creating sale:', error);
      throw new Error('Failed to create sale');
    }
  }

  async getSalesReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      const sales = await SaleModel.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean();

      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      const totalSales = sales.length;
      
      const serviceTypes = sales.reduce((acc: any, sale) => {
        sale.items.forEach(item => {
          if (!acc[item.serviceType]) {
            acc[item.serviceType] = { count: 0, revenue: 0 };
          }
          acc[item.serviceType].count += item.quantity;
          acc[item.serviceType].revenue += item.total;
        });
        return acc;
      }, {});

      return {
        period: { startDate, endDate },
        summary: {
          totalRevenue,
          totalSales,
          averageSaleValue: totalSales > 0 ? totalRevenue / totalSales : 0
        },
        serviceTypes,
        sales
      };
    } catch (error) {
      logger.error('Error generating sales report:', error);
      throw new Error('Failed to generate sales report');
    }
  }

  // Service Management
  async getAvailableServices(): Promise<any[]> {
    return [
      {
        type: 'accommodation',
        name: 'Hotel Rooms',
        description: 'Comfortable accommodations with various room types',
        basePrice: 100
      },
      {
        type: 'transfer',
        name: 'Airport Transfer',
        description: 'Comfortable transportation to and from the airport',
        basePrice: 50
      },
      {
        type: 'activity',
        name: 'Tours & Activities',
        description: 'Exciting tours and activities to explore the area',
        basePrice: 75
      },
      {
        type: 'miscellaneous',
        name: 'Additional Services',
        description: 'Various additional services and amenities',
        basePrice: 25
      }
    ];
  }

  async calculateBookingTotal(items: SaleItem[], discounts?: any[]): Promise<{
    subtotal: number;
    tax: number;
    discountAmount: number;
    total: number;
  }> {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    
    let discountAmount = 0;
    if (discounts) {
      discountAmount = discounts.reduce((sum, discount) => {
        if (discount.type === 'percentage') {
          return sum + (subtotal * discount.value / 100);
        } else {
          return sum + discount.value;
        }
      }, 0);
    }

    const discountedSubtotal = subtotal - discountAmount;
    const tax = calculateTax(discountedSubtotal);
    const total = discountedSubtotal + tax;

    return {
      subtotal,
      tax,
      discountAmount,
      total
    };
  }
}