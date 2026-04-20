import { config } from './config';
import app from './app';
import { logger } from './utils/logger';
import { redis } from './utils/redis';
import { startNotificationScheduler } from './services/notificationScheduler';

async function start() {
  await redis.connect();
  startNotificationScheduler();

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server started');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(async () => {
      await redis.quit();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
