import { AppError } from '../shared/errors.js';
import { recordAuditLog } from '../infra/db/auditRepository.js';
import { listQueues, createQueue, updateQueue, softDeleteQueue, getQueueById } from '../infra/db/queueRepository.js';

const sanitize = (q) =>
  q && { id: q.id, name: q.name, description: q.description, active: q.active, tenantId: q.tenantId, createdAt: q.createdAt };

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

export const getQueues = async (tenantId = null) => {
  const rows = await listQueues(tenantId);
  return rows.map(sanitize);
};

export const createQueueService = async ({ name, description, tenantId = null }, actor) => {
  const exists = (await listQueues(tenantId)).find((q) => q.name.toLowerCase() === name.toLowerCase());
  if (exists) throw new AppError('Nombre de cola duplicado', 409);
  const q = await createQueue({ name, description, tenantId });
  await audit({
    userId: actor?.id,
    action: 'queue_created',
    resourceId: q.id,
    ip: actor?.ip,
    metadata: { name, tenantId: tenantId || 'default' }
  });
  return sanitize(q);
};

export const updateQueueService = async (id, { name, description, active }, actor) => {
  const q = await updateQueue(id, { name, description, active });
  if (!q) throw new AppError('Cola no encontrada', 404);
  await audit({ userId: actor?.id, action: 'queue_updated', resourceId: q.id, ip: actor?.ip, metadata: { name, active } });
  return sanitize(q);
};

export const deleteQueueService = async (id, actor) => {
  const q = await softDeleteQueue(id);
  if (!q) throw new AppError('Cola no encontrada', 404);
  await audit({ userId: actor?.id, action: 'queue_deleted', resourceId: q.id, ip: actor?.ip });
  return { deleted: true };
};

export const getQueueByIdService = async (id) => {
  const q = await getQueueById(id);
  if (!q) throw new AppError('Cola no encontrada', 404);
  return sanitize(q);
};
