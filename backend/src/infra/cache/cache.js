import redisClient, { ensureRedisConnection } from './redisClient.js';

export const cacheGet = async (key) => {
  await ensureRedisConnection();
  const value = await redisClient.get(key);
  return value ? JSON.parse(value) : null;
};

export const cacheSet = async (key, value, ttlSeconds = 60) => {
  await ensureRedisConnection();
  await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
};

export const cacheDel = async (key) => {
  await ensureRedisConnection();
  await redisClient.del(key);
};
