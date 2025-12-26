import { AppError } from '../shared/errors.js';
import { recordAuditLog } from '../infra/db/auditRepository.js';
import { listQueueUsers, addQueueUser, removeQueueUser } from '../infra/db/queueUserRepository.js';
import { listQueueConnections, addQueueConnection, removeQueueConnection } from '../infra/db/queueConnectionRepository.js';
import { getQueueById } from '../infra/db/queueRepository.js';
import { findById as findUserById, listAgentsByTenant } from '../infra/db/userRepository.js';
import { setQueueForSessionMissingQueue } from '../infra/db/chatRepository.js';

const mapUserRoleToQueueRole = (role) => {
  if (!role) return null;
  const normalized = role.toString().toUpperCase();
  if (normalized === 'AGENTE' || normalized === 'AGENT') return 'agent';
  if (normalized === 'SUPERVISOR') return 'supervisor';
  // ADMIN actúa como supervisor dentro de la cola
  if (normalized === 'ADMIN') return 'supervisor';
  // Permitir que ya venga en minúsculas desde el cliente
  if (role === 'agent' || role === 'supervisor') return role;
  return null;
};

const audit = async ({ userId, action, resourceId, ip, metadata }) =>
  recordAuditLog({
    userId: userId || null,
    action,
    resource: 'queue',
    resourceId,
    ip: ip || null,
    userAgent: null,
    metadata: metadata || {}
  });

export const getQueueUsers = async (queueId) => {
  const queue = await getQueueById(queueId);
  if (!queue) throw new AppError('Cola no encontrada', 404);
  const users = await listQueueUsers(queueId, queue.tenantId || null);
  return users || [];
};

export const addUserToQueue = async (queueId, { userId, role }, actor) => {
  const queue = await getQueueById(queueId);
  if (!queue) throw new AppError('Cola no encontrada', 404);
  if (!userId) throw new AppError('userId requerido', 400);
  let resolvedRole = role;
  if (!resolvedRole) {
    const user = await findUserById(userId);
    resolvedRole = user?.role || null;
  }
  const queueRole = mapUserRoleToQueueRole(resolvedRole);
  if (!queueRole) throw new AppError('Rol inválido para la cola (use agent o supervisor)', 400);
  await addQueueUser(queueId, userId, queueRole);
  await audit({
    userId: actor?.id,
    action: 'queue_user_added',
    resourceId: queueId,
    ip: actor?.ip,
    metadata: { userId, role: queueRole }
  });
  return { added: true };
};

export const removeUserFromQueue = async (queueId, userId, actor) => {
  const queue = await getQueueById(queueId);
  if (!queue) throw new AppError('Cola no encontrada', 404);
  await removeQueueUser(queueId, userId);
  await audit({
    userId: actor?.id,
    action: 'queue_user_removed',
    resourceId: queueId,
    ip: actor?.ip,
    metadata: { userId }
  });
  return { deleted: true };
};

export const getQueueConnectionsService = async (queueId) => {
  const queue = await getQueueById(queueId);
  if (!queue) throw new AppError('Cola no encontrada', 404);
  return listQueueConnections(queueId);
};

export const addConnectionToQueue = async (queueId, sessionName, actor) => {
  const queue = await getQueueById(queueId);
  if (!queue) throw new AppError('Cola no encontrada', 404);
  if (!sessionName) throw new AppError('sessionName requerido', 400);
  await addQueueConnection(queueId, sessionName);
  // Migrar chats huérfanos de esta sesión a la cola recién configurada
  await setQueueForSessionMissingQueue(sessionName, queueId).catch(() => {});
  await audit({
    userId: actor?.id,
    action: 'queue_connection_added',
    resourceId: queueId,
    ip: actor?.ip,
    metadata: { sessionName }
  });
  return { added: true };
};

export const removeConnectionFromQueue = async (queueId, sessionName, actor) => {
  const queue = await getQueueById(queueId);
  if (!queue) throw new AppError('Cola no encontrada', 404);
  await removeQueueConnection(queueId, sessionName);
  await audit({
    userId: actor?.id,
    action: 'queue_connection_removed',
    resourceId: queueId,
    ip: actor?.ip,
    metadata: { sessionName }
  });
  return { deleted: true };
};
