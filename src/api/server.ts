import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import Database from '../shared/database/connection';
import logger from '../shared/utils/logger';
import { reservationRoutes } from './routes/reservations';
import { authRoutes } from './routes/auth';
import { analyticsRoutes } from './routes/analytics';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

export class APIServer {
  private app: Express;
  private rateLimiter: RateLimiterMemory;

  constructor() {
    this.app = express();
    this.rateLimiter = new RateLimiterMemory({
      keyPrefix: 'middleware',
      points: 100, // Number of requests
      duration: 60, // Per 60 seconds
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Rate limiting
    this.app.use(async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.rateLimiter.consume(req.ip || 'unknown');
        next();
      } catch (rateLimiterRes: any) {
        res.status(429).json({
          success: false,
          error: 'Too many requests',
          retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000) || 1,
        });
      }
    });

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Serve static files
    this.app.use('/static', express.static(path.join(__dirname, '../web/static')));
    
    // Serve web interface
    this.app.get('/', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../web/public/index.html'));
    });

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'API Server is running',
        timestamp: new Date().toISOString(),
        database: Database.isConnectedToDatabase()
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/reservations', authMiddleware, reservationRoutes);
    this.app.use('/api/analytics', authMiddleware, analyticsRoutes);

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(port: number = 3000): Promise<void> {
    try {
      // Connect to database
      await Database.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mcp-business');
      
      // Start server
      this.app.listen(port, () => {
        logger.info(`API Server started on port ${port}`);
        logger.info(`Health check available at http://localhost:${port}/health`);
      });
    } catch (error) {
      logger.error('Failed to start API server:', error);
      throw error;
    }
  }

  public getApp(): Express {
    return this.app;
  }
}

export default APIServer;