import { Router, Request, Response } from 'express';
import { BusinessOperationsService } from '../../servers/business-operations/business-service';
import { requireRole } from '../middleware/auth';
import logger from '../../shared/utils/logger';

const router = Router();
const businessService = new BusinessOperationsService();

// Get sales report
router.get('/sales', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const salesReport = await businessService.getSalesReport(startDate, endDate);

    res.json({
      success: true,
      data: salesReport
    });
  } catch (error) {
    logger.error('Get sales report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate sales report'
    });
  }
});

// Get booking analytics
router.get('/bookings', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || 'month';
    const analytics = await businessService.getBookingAnalytics(period);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get booking analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate booking analytics'
    });
  }
});

// Get revenue analytics
router.get('/revenue', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || 'month';
    const revenue = await businessService.getRevenueAnalytics(period);

    res.json({
      success: true,
      data: revenue
    });
  } catch (error) {
    logger.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate revenue analytics'
    });
  }
});

// Get customer analytics
router.get('/customers', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const analytics = await businessService.getCustomerAnalytics();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get customer analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate customer analytics'
    });
  }
});

// Get dashboard summary
router.get('/dashboard', requireRole(['admin', 'manager', 'staff']), async (req: Request, res: Response) => {
  try {
    const summary = await businessService.getDashboardSummary();

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Get dashboard summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate dashboard summary'
    });
  }
});

export { router as analyticsRoutes };