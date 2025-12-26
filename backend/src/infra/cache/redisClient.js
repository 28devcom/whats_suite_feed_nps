import { createClient } from 'redis';
import env from '../../config/env.js';
import logger from '../logging/logger.js';

// Single shared Redis client to keep connection count predictable across instances.
const redisClient = createClient({
  url: env.redis.url,
  socket: {
    tls: env.redis.tls,
    keepAlive: 5000
  }
});

redisClient.on('error', (err) => logger.error({ err }, 'Redis client error'));
redisClient.on('ready', () => logger.info('Redis client ready'));

export const ensureRedisConnection = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export const redisHealthCheck = async () => {
  const start = Date.now();
  await ensureRedisConnection();
  await redisClient.ping();
  return { healthy: true, latencyMs: Date.now() - start };
};

export const closeRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
};

export default redisClient;
