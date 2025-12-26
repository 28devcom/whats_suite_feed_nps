import pool from './postgres.js';
import User, { ROLES } from '../../domain/user/user.js';

const mapRowToUser = (row) =>
  new User({
    id: row.id,
    email: row.email,
    username: row.username,
    fullName: row.full_name,
    passwordHash: row.password_hash,
    role: row.role_name,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tenantId: row.tenant_id
  });

export const findByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.username, u.password_hash, u.full_name, u.status, u.role_id, u.last_login_at, u.created_at, u.updated_at, u.tenant_id, r.name as role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE LOWER(u.email) = LOWER($1) AND u.deleted_at IS NULL
     LIMIT 1`,
    [email]
  );
  if (!rows[0]) return null;
  return mapRowToUser(rows[0]);
};

export const findByEmailOrUsername = async (identifier) => {
  const value = identifier?.toLowerCase();
  if (!value) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.username, u.password_hash, u.full_name, u.status, u.role_id, u.last_login_at, u.created_at, u.updated_at, u.tenant_id, r.name as role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.deleted_at IS NULL AND (LOWER(u.email) = $1 OR LOWER(u.username) = $1)
     LIMIT 1`,
    [value]
  );
  if (!rows[0]) return null;
  return mapRowToUser(rows[0]);
};

export const findById = async (id) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.username, u.password_hash, u.full_name, u.status, u.role_id, u.last_login_at, u.created_at, u.updated_at, u.tenant_id, r.name as role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1 AND u.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  return mapRowToUser(rows[0]);
};

export const updateLastLogin = async (id) => {
  await pool.query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [id]);
};

export const createUser = async ({ email, fullName, passwordHash, role = ROLES.AGENTE }) => {
  const normalizedEmail = email.toLowerCase();
  const roleRow = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
  if (!roleRow.rows[0]) {
    throw new Error(`Role ${role} not found`);
  }
  const roleId = roleRow.rows[0].id;
  const { rows } = await pool.query(
    `INSERT INTO users (email, full_name, password_hash, role_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, password_hash, role_id, last_login_at, created_at, updated_at, tenant_id`,
    [normalizedEmail, fullName, passwordHash, roleId]
  );
  return mapRowToUser({ ...rows[0], role_name: role });
};

export const listAgentsByTenant = async (tenantId = null) => {
  const params = [];
  let tenantClause = '';
  if (tenantId) {
    params.push(tenantId);
    tenantClause = `AND u.tenant_id = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role_id, r.name as role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.deleted_at IS NULL
       AND r.name IN ('AGENTE','SUPERVISOR','ADMIN')
       ${tenantClause}
     ORDER BY u.full_name NULLS LAST, u.email ASC`,
    params
  );
  return rows.map((row) =>
    mapRowToUser({
      ...row,
      full_name: row.full_name,
      role_name: row.role_name
    })
  );
};
