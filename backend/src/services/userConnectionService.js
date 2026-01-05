import { verifyAndGetUser } from './authService.js';
import {
  upsertUserConnection,
  markDisconnectedBySocket,
  listConnectedAgents as listConnectedAgentsDb,
  markDisconnectedByUserIds
} from '../infra/db/userConnectionRepository.js';
import { ROLES } from '../domain/user/user.js';
import logger from '../infra/logging/logger.js';
import { recordAuditLog } from '../infra/db/auditRepository.js';
import { runAutoAssignmentLocked } from './chatAutoAssignmentService.js';
import redisClient, { ensureRedisConnection } from '../infra/cache/redisClient.js';
import env from '../config/env.js';

const logConnectionAudit = async ({ userId, action, socketId }) => {
  await recordAuditLog({
    userId: userId || null,
    action,
    resource: 'user_connection',
    resourceId: socketId,
    ip: null,
    userAgent: null,
    metadata: { socketId }
  });
};

export const registerConnection = async ({ token, socketId }) => {
  const { user } = await verifyAndGetUser(token);
  const role = user.role;
  await upsertUserConnection({ userId: user.id, role, socketId, connected: true });
  await logConnectionAudit({ userId: user.id, action: 'user_connected', socketId });
  logger.info({ socketId, userId: user.id, role, tag: 'WA_CONN' }, 'User connection registered');
  const eligible = role === ROLES.AGENTE;
  if (eligible) {
    // ISO 27001: ejecución bajo lock para evitar carreras; al conectar un agente se dispara asignación progresiva.
    runAutoAssignmentLocked().catch((err) =>
      logger.error({ err, userId: user.id, tag: 'AUTO_ASSIGN' }, 'Auto-assign on agent connect failed')
    );
  }
  return { userId: user.id, role, eligible };
};

export const registerDisconnect = async ({ socketId }) => {
  const updated = await markDisconnectedBySocket(socketId);
  if (updated?.userId) {
    await logConnectionAudit({ userId: updated.userId, action: 'user_disconnected', socketId });
  logger.info({ socketId, userId: updated.userId, role: updated.role, tag: 'WA_CONN' }, 'User disconnected');
  }
  return updated;
};

const sessionKey = (userId) => `${env.redis.sessionPrefix}:${userId}`;

export const listConnectedAgents = async () => {
  const connections = await listConnectedAgentsDb();
  if (!connections.length) return [];
  try {
    await ensureRedisConnection();
    const uniqueUserIds = Array.from(new Set(connections.map((c) => c.userId).filter(Boolean)));
    if (!uniqueUserIds.length) return [];
    const keys = uniqueUserIds.map(sessionKey);
    const sessionJtis = await redisClient.mGet(keys);
    const activeUserIds = new Set();
    sessionJtis.forEach((val, idx) => {
      if (val) activeUserIds.add(uniqueUserIds[idx]);
    });
    const stale = uniqueUserIds.filter((id) => !activeUserIds.has(id));
    if (stale.length) {
      await markDisconnectedByUserIds(stale).catch(() => {});
    }
    return connections.filter((c) => activeUserIds.has(c.userId));
  } catch (err) {
    logger.warn({ err, tag: 'WA_CONN' }, 'Falling back to raw connected agents');
    return connections;
  }
};
