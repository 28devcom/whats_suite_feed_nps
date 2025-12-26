import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import env from '../config/env.js';
import logger from '../infra/logging/logger.js';
import redisClient, { ensureRedisConnection } from '../infra/cache/redisClient.js';
import { findByEmail, findByEmailOrUsername, findById, updateLastLogin } from '../infra/db/userRepository.js';
import { recordAuthEvent } from '../infra/db/authEventRepository.js';
import { toSeconds } from '../shared/time.js';
import { AppError } from '../shared/errors.js';
import { ROLES } from '../domain/user/user.js';

const sessionKey = (userId) => `${env.redis.sessionPrefix}:${userId}`;

const signJwt = ({ user, jti }) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti
    },
    env.auth.jwtSecret,
    {
      expiresIn: env.auth.jwtExpiresIn,
      issuer: env.auth.jwtIssuer,
      audience: env.auth.jwtAudience
    }
  );
};

const validateCredentials = async (identifier, password, reqMeta) => {
  const user = await findByEmailOrUsername(identifier);
  if (!user) {
    await recordAuthEvent({ userId: null, eventType: 'login', success: false, ip: reqMeta.ip, userAgent: reqMeta.userAgent });
    throw new AppError('Credenciales inválidas', 401);
  }
  if (user.status && user.status !== 'ACTIVE') {
    await recordAuthEvent({ userId: user.id, eventType: 'login', success: false, ip: reqMeta.ip, userAgent: reqMeta.userAgent });
    throw new AppError('Usuario inactivo', 403);
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    await recordAuthEvent({ userId: user.id, eventType: 'login', success: false, ip: reqMeta.ip, userAgent: reqMeta.userAgent });
    throw new AppError('Credenciales inválidas', 401);
  }
  return user;
};

export const login = async ({ email, password, ip, userAgent }) => {
  await ensureRedisConnection();
  const user = await validateCredentials(email, password, { ip, userAgent });

  const jti = randomUUID();
  const token = signJwt({ user, jti });
  const ttlSeconds = toSeconds(env.auth.jwtExpiresIn);
  await redisClient.set(sessionKey(user.id), jti, { EX: ttlSeconds });
  await updateLastLogin(user.id);
  await recordAuthEvent({ userId: user.id, eventType: 'login', success: true, ip, userAgent });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId || null
    }
  };
};

export const logout = async ({ userId, jti, ip, userAgent }) => {
  await ensureRedisConnection();
  const key = sessionKey(userId);
  const currentJti = await redisClient.get(key);
  if (currentJti && currentJti === jti) {
    await redisClient.del(key);
  }
  await recordAuthEvent({ userId, eventType: 'logout', success: true, ip, userAgent });
};

export const forceLogout = async ({ targetUserId, performedBy, ip, userAgent }) => {
  await ensureRedisConnection();
  await redisClient.del(sessionKey(targetUserId));
  await recordAuthEvent({ userId: targetUserId, eventType: 'force_logout', success: true, ip, userAgent });
  logger.warn({ targetUserId, performedBy }, 'Session revoked remotely');
};

export const verifyAndGetUser = async (token) => {
  try {
    const payload = jwt.verify(token, env.auth.jwtSecret, {
      issuer: env.auth.jwtIssuer,
      audience: env.auth.jwtAudience
    });
    await ensureRedisConnection();
    const storedJti = await redisClient.get(sessionKey(payload.sub));
    if (!storedJti || storedJti !== payload.jti) {
      throw new AppError('Sesión inválida o expirada', 401);
    }
    const user = await findById(payload.sub);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }
    if (user.status && user.status !== 'ACTIVE') {
      throw new AppError('Usuario inactivo', 403);
    }
    return { user, payload };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.warn({ err }, 'Token verification failed');
    throw new AppError('No autorizado', 401);
  }
};

export const hashPassword = async (plain) => {
  const saltRounds = env.auth.bcryptRounds;
  return bcrypt.hash(plain, saltRounds);
};

export const isAdmin = (role) => role === ROLES.ADMIN;
