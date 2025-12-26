import pool from './postgres.js';

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'auth', 'cookie', 'set-cookie', 'session', 'key'];

const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return {};
  const walk = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(walk);
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      const lower = k.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lower.includes(s))) continue;
      clean[k] = walk(v);
    }
    return clean;
  };
  // Hard cap size to avoid large payloads
  const cleaned = walk(metadata);
  const raw = JSON.stringify(cleaned);
  if (raw.length > 4000) {
    return { truncated: true };
  }
  return cleaned;
};

const resolveTenantId = async (userId) => {
  // If user known, pick its tenant; else fallback to default tenant
  if (userId) {
    const res = await pool.query('SELECT tenant_id FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (res.rows[0]?.tenant_id) return res.rows[0].tenant_id;
  }
  const def = await pool.query("SELECT id FROM tenants WHERE name = 'default' LIMIT 1");
  return def.rows[0]?.id || null;
};

export const recordAuditLog = async ({ userId, action, resource, resourceId, ip, userAgent, metadata, tenantId = null }) => {
  const safeMeta = sanitizeMetadata(metadata);
  const resolvedTenant = tenantId || (await resolveTenantId(userId));
  await pool.query(
    `INSERT INTO audit_logs (user_id, tenant_id, action, resource, resource_id, ip, user_agent, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [userId || null, resolvedTenant, action, resource || null, resourceId || null, ip || null, userAgent || null, safeMeta]
  );
};

export const listAuditLogs = async ({ limit = 200, action, userId }) => {
  const params = [];
  let query = 'SELECT * FROM audit_logs';
  const clauses = [];
  if (action) {
    params.push(action);
    clauses.push(`action = $${params.length}`);
  }
  if (userId) {
    params.push(userId);
    clauses.push(`user_id = $${params.length}`);
  }
  if (clauses.length) {
    query += ' WHERE ' + clauses.join(' AND ');
  }
  params.push(Math.min(limit, 1000));
  query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
  const { rows } = await pool.query(query, params);
  return rows;
};
