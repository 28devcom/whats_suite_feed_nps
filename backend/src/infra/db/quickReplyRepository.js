import pool from './postgres.js';
import { AppError } from '../../shared/errors.js';

let cachedDefaultTenant = null;

const defaultTenant = async () => {
  if (cachedDefaultTenant) return cachedDefaultTenant;
  const { rows } = await pool.query("SELECT id FROM tenants WHERE name = 'default' LIMIT 1");
  cachedDefaultTenant = rows[0]?.id || null;
  return cachedDefaultTenant;
};

export const resolveTenantId = async (userId = null) => {
  if (userId) {
    const res = await pool.query('SELECT tenant_id FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (res.rows[0]?.tenant_id) return res.rows[0].tenant_id;
  }
  return defaultTenant();
};

const mapQuickReply = (row) => ({
  id: row.id,
  tenantId: row.tenant_id,
  titulo: row.titulo,
  textoBase: row.texto_base,
  variables: Array.isArray(row.variables) ? row.variables : [],
  activo: row.activo,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
  updatedBy: row.updated_by
});

const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    if (!parsed?.t || !parsed?.id) return null;
    const ts = new Date(parsed.t);
    if (Number.isNaN(ts.getTime())) return null;
    return { ts, id: parsed.id };
  } catch {
    return null;
  }
};

const encodeCursor = (row) => {
  const ts = row?.updated_at || row?.updatedAt || row?.created_at || new Date();
  const payload = { t: new Date(ts).toISOString(), id: row.id };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

const toJsonbParam = (value) => {
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return value;
};

export const createQuickReply = async ({ titulo, textoBase, variables = [], activo = true, createdBy }) => {
  const tenantId = await resolveTenantId(createdBy);
  const { rows } = await pool.query(
    `INSERT INTO quick_replies (titulo, texto_base, variables, activo, tenant_id, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$6)
     RETURNING *`,
    [titulo, textoBase, toJsonbParam(variables || []), activo, tenantId, createdBy || null]
  );
  return mapQuickReply(rows[0]);
};

export const updateQuickReply = async ({ id, tenantId, titulo, textoBase, variables, activo, updatedBy }) => {
  const sets = [];
  const params = [];

  if (titulo !== undefined) {
    params.push(titulo);
    sets.push(`titulo = $${params.length}`);
  }
  if (textoBase !== undefined) {
    params.push(textoBase);
    sets.push(`texto_base = $${params.length}`);
  }
  if (variables !== undefined) {
    params.push(toJsonbParam(variables));
    sets.push(`variables = $${params.length}`);
  }
  if (activo !== undefined) {
    params.push(activo);
    sets.push(`activo = $${params.length}`);
  }

  params.push(updatedBy || null);
  sets.push(`updated_by = $${params.length}`);
  sets.push('updated_at = NOW()');

  params.push(id);
  const idIdx = params.length;
  if (!tenantId) throw new AppError('Tenant requerido para actualizar respuesta rápida', 400);
  params.push(tenantId);
  const tenantIdx = params.length;

  const sql = `UPDATE quick_replies
     SET ${sets.join(', ')}
   WHERE id = $${idIdx}
     AND tenant_id = $${tenantIdx}
   RETURNING *`;

  const { rows } = await pool.query(sql, params);
  if (!rows[0]) {
    throw new AppError('Respuesta rápida no encontrada', 404);
  }
  return mapQuickReply(rows[0]);
};

export const getQuickReplyById = async (id, tenantId = null) => {
  const params = [id];
  let where = 'WHERE id = $1';
  if (tenantId) {
    params.push(tenantId);
    where += ` AND tenant_id = $${params.length}`;
  }
  const { rows } = await pool.query(`SELECT * FROM quick_replies ${where} LIMIT 1`, params);
  return rows[0] ? mapQuickReply(rows[0]) : null;
};

export const listQuickReplies = async ({ tenantId, search = '', cursor = null, limit = 25, activeOnly = false }) => {
  if (!tenantId) throw new AppError('Tenant requerido', 400);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 25, 100));
  const params = [tenantId];
  let where = 'WHERE tenant_id = $1';

  if (activeOnly) {
    params.push(true);
    where += ` AND activo = $${params.length}`;
  }
  if (search) {
    params.push(`${search}%`);
    where += ` AND LOWER(titulo) LIKE LOWER($${params.length})`;
  }

  const cursorData = decodeCursor(cursor);
  if (cursorData) {
    params.push(cursorData.ts);
    params.push(cursorData.id);
    const tsIdx = params.length - 1;
    const idIdx = params.length;
    where += ` AND (updated_at, id) < ($${tsIdx}, $${idIdx})`;
  }

  params.push(safeLimit);
  const { rows } = await pool.query(
    `SELECT * FROM quick_replies
     ${where}
     ORDER BY updated_at DESC, id DESC
     LIMIT $${params.length}`,
    params
  );

  const items = rows.map(mapQuickReply);
  const nextCursor = rows.length === safeLimit ? encodeCursor(rows[rows.length - 1]) : null;
  return { items, nextCursor };
};

export const setQuickReplyActive = async ({ id, tenantId, active, userId }) =>
  updateQuickReply({ id, tenantId, activo: active, updatedBy: userId });
