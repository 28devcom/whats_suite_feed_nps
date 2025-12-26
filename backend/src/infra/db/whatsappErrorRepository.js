import pool from './postgres.js';
import { getTenantIdForSession } from './whatsappSessionRepository.js';

export const recordWhatsAppError = async ({ sessionName, category = 'operational', message, context = {}, tenantId = null }) => {
  const resolvedTenant = await getTenantIdForSession(sessionName, tenantId);
  await pool.query(
    `INSERT INTO whatsapp_error_log (session_name, category, message, context, tenant_id)
     VALUES ($1, $2, $3, $4::jsonb, $5)`,
    [sessionName, category, message, context, resolvedTenant]
  );
};
