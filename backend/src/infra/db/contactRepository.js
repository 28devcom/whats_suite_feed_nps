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

const mapContact = (row) => ({
  id: row.id,
  tenantId: row.tenant_id,
  phoneNormalized: row.phone_normalized,
  displayName: row.display_name,
  avatarRef: row.avatar_ref,
  metadata: row.metadata || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const getContactByPhone = async ({ phoneNormalized, tenantId }) => {
  if (!tenantId) throw new AppError('Tenant requerido', 400);
  if (!phoneNormalized) return null;
  const { rows } = await pool.query(
    `SELECT * FROM contacts WHERE tenant_id = $1 AND phone_normalized = $2 LIMIT 1`,
    [tenantId, phoneNormalized]
  );
  return rows[0] ? mapContact(rows[0]) : null;
};

export const findContactsByPhones = async ({ phoneNumbers = [], tenantId }) => {
  if (!tenantId) throw new AppError('Tenant requerido', 400);
  const unique = Array.from(new Set((phoneNumbers || []).filter(Boolean)));
  if (!unique.length) return [];
  const { rows } = await pool.query(
    `SELECT * FROM contacts WHERE tenant_id = $1 AND phone_normalized = ANY($2)`,
    [tenantId, unique]
  );
  return rows.map(mapContact);
};

export const upsertContact = async ({ phoneNormalized, displayName = null, avatarRef = null, metadata = null, tenantId }) => {
  if (!tenantId) throw new AppError('Tenant requerido', 400);
  if (!phoneNormalized) throw new AppError('Teléfono requerido', 400);
  const { rows } = await pool.query(
    `INSERT INTO contacts (tenant_id, phone_normalized, display_name, avatar_ref, metadata)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (tenant_id, phone_normalized) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           avatar_ref = COALESCE(EXCLUDED.avatar_ref, contacts.avatar_ref),
           metadata = COALESCE(EXCLUDED.metadata, contacts.metadata),
           updated_at = NOW()
     RETURNING *`,
    [tenantId, phoneNormalized, displayName, avatarRef, metadata]
  );
  return rows[0] ? mapContact(rows[0]) : null;
};
