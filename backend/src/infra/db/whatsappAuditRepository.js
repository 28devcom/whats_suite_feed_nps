import pool from './postgres.js';
import { getTenantIdForSession } from './whatsappSessionRepository.js';

export const recordWhatsAppAudit = async ({
  sessionName,
  connectionId = null,
  event,
  userId = null,
  ip = null,
  userAgent = null,
  tenantId = null,
  metadata = {}
}) => {
  const resolvedTenant = await getTenantIdForSession(sessionName, tenantId);
  const connId = connectionId || sessionName;
  await pool.query(
    `INSERT INTO whatsapp_audit_log (session_name, connection_id, event, user_id, ip, user_agent, tenant_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [sessionName, connId, event, userId, ip, userAgent, resolvedTenant, metadata]
  );
};
