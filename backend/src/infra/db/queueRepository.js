import pool from './postgres.js';

const mapQueue = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  active: row.active,
  tenantId: row.tenant_id,
  createdAt: row.created_at,
  deletedAt: row.deleted_at
});

export const listQueues = async (tenantId = null) => {
  const params = [];
  let sql = 'SELECT * FROM queues WHERE deleted_at IS NULL';
  if (tenantId) {
    params.push(tenantId);
    sql += ` AND tenant_id = $${params.length}`;
  }
  sql += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(sql, params);
  return rows.map(mapQueue);
};

const resolveTenant = async (tenantId) => {
  if (tenantId) return tenantId;
  const res = await pool.query("SELECT id FROM tenants WHERE name = 'default' LIMIT 1");
  return res.rows[0]?.id || null;
};

export const createQueue = async ({ name, description, tenantId = null }) => {
  const resolvedTenant = await resolveTenant(tenantId);
  const { rows } = await pool.query(
    `INSERT INTO queues (name, description, active, tenant_id)
     VALUES ($1, $2, true, $3)
     RETURNING *`,
    [name, description || null, resolvedTenant]
  );
  return mapQueue(rows[0]);
};

export const updateQueue = async (id, { name, description, active }) => {
  const fields = [];
  const values = [];
  let idx = 1;
  if (name !== undefined) {
    fields.push(`name = $${idx}`);
    values.push(name);
    idx += 1;
  }
  if (description !== undefined) {
    fields.push(`description = $${idx}`);
    values.push(description);
    idx += 1;
  }
  if (active !== undefined) {
    fields.push(`active = $${idx}`);
    values.push(active);
    idx += 1;
  }
  if (!fields.length) return getQueueById(id);
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE queues SET ${fields.join(', ')}
     WHERE id = $${values.length} AND deleted_at IS NULL
     RETURNING *`,
    values
  );
  return rows[0] ? mapQueue(rows[0]) : null;
};

export const softDeleteQueue = async (id) => {
  const { rows } = await pool.query(
    `UPDATE queues SET active = false, deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id]
  );
  return rows[0] ? mapQueue(rows[0]) : null;
};

export const getQueueById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM queues WHERE id = $1 AND deleted_at IS NULL LIMIT 1', [id]);
  return rows[0] ? mapQueue(rows[0]) : null;
};
