import { recordAuditLog, listAuditLogs } from '../infra/db/auditRepository.js';

export const auditAction = async ({ userId, action, resource, resourceId, ip, userAgent, metadata }) => {
  await recordAuditLog({ userId, action, resource, resourceId, ip, userAgent, metadata });
};

export const getAuditLogs = async ({ limit, action, userId }) => listAuditLogs({ limit, action, userId });
