import redisClient, { ensureRedisConnection } from './redisClient.js';
import env from '../../config/env.js';

const ttlChat = env.cache.chatTtlSeconds;
const ttlMessages = env.cache.messagesTtlSeconds;
const ttlAssignment = env.cache.assignmentTtlSeconds;

const keyChat = (chatId) => `cache:chat:${chatId}`;
const keyMessages = (chatId) => `cache:chat:${chatId}:messages`;
const keyAssignment = (chatId) => `cache:chat:${chatId}:assignment`;

const safeJson = {
  parse: (value) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },
  stringify: (value) => JSON.stringify(value)
};

export const cacheChat = async (chat) => {
  if (!chat?.id) return;
  await ensureRedisConnection();
  await redisClient.set(keyChat(chat.id), safeJson.stringify(chat), { EX: ttlChat });
};

export const getCachedChat = async (chatId) => {
  await ensureRedisConnection();
  const raw = await redisClient.get(keyChat(chatId));
  return safeJson.parse(raw);
};

export const invalidateChat = async (chatId) => {
  await ensureRedisConnection();
  await redisClient.del(keyChat(chatId), keyMessages(chatId), keyAssignment(chatId));
};

export const cacheMessages = async (chatId, messages) => {
  if (!chatId) return;
  await ensureRedisConnection();
  // Mensajes ya no se cachean para evitar retrasos en estados; esta función queda no-op deliberadamente.
};

export const getCachedMessages = async (chatId) => {
  await ensureRedisConnection();
  // Se deshabilita cache de mensajes para reflejar estados en tiempo real.
  return null;
};

export const cacheAssignment = async (chatId, assignment) => {
  if (!chatId) return;
  await ensureRedisConnection();
  await redisClient.set(keyAssignment(chatId), safeJson.stringify(assignment), { EX: ttlAssignment });
};

export const getCachedAssignment = async (chatId) => {
  await ensureRedisConnection();
  const raw = await redisClient.get(keyAssignment(chatId));
  return safeJson.parse(raw);
};

export const invalidateAssignment = async (chatId) => {
  await ensureRedisConnection();
  await redisClient.del(keyAssignment(chatId));
};
