import dotenv from 'dotenv';
import APIServer from './api/server';
import logger from './shared/utils/logger';

// Load environment variables
dotenv.config();

async function startServer() {
  try {
    const apiServer = new APIServer();
    const port = parseInt(process.env.PORT || '3000');
    
    await apiServer.start(port);
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { APIServer };