import pool from './postgres.js';

let cachedDefaultTenant = null;

const defaultTenant = async () => {
  if (cachedDefaultTenant) return cachedDefaultTenant;
  const { rows } = await pool.query("SELECT id FROM tenants WHERE name = 'default' LIMIT 1");
  cachedDefaultTenant = rows[0]?.id || null;
  return cachedDefaultTenant;
};

const resolveTenantId = async ({ quickReplyId = null, userId = null, chatId = null }) => {
  if (quickReplyId) {
    const res = await pool.query('SELECT tenant_id FROM quick_replies WHERE id = $1 LIMIT 1', [quickReplyId]);
    if (res.rows[0]?.tenant_id) return res.rows[0].tenant_id;
  }
  if (chatId) {
    const res = await pool.query('SELECT tenant_id FROM chats WHERE id = $1 LIMIT 1', [chatId]);
    if (res.rows[0]?.tenant_id) return res.rows[0].tenant_id;
  }
  if (userId) {
    const res = await pool.query('SELECT tenant_id FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (res.rows[0]?.tenant_id) return res.rows[0].tenant_id;
  }
  return defaultTenant();
};

export const recordQuickReplyAudit = async ({
  tenantId = null,
  quickReplyId = null,
  userId = null,
  action,
  variablesUsadas = {},
  chatId = null,
  ip = null,
  userAgent = null
}) => {
  const resolvedTenant = tenantId || (await resolveTenantId({ quickReplyId, userId, chatId }));
  await pool.query(
    `INSERT INTO quick_reply_audit (tenant_id, quick_reply_id, user_id, accion, variables_usadas, chat_id, ip, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [resolvedTenant, quickReplyId || null, userId || null, action, variablesUsadas || {}, chatId || null, ip || null, userAgent || null]
  );
};
