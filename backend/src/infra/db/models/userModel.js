import bcrypt from 'bcrypt';
import pool from '../postgres.js';
import { UserEntity, USER_ROLES, USER_STATUS } from '../../../domain/user/user.entity.js';

const SALT_ROUNDS = 10;

export const hashPassword = async (plain) => bcrypt.hash(plain, SALT_ROUNDS);

export const mapRowToUserEntity = (row) =>
  new UserEntity({
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  });

const normalizeRole = (role) => {
  if (!role) return USER_ROLES.AGENTE;
  const upper = role.toUpperCase();
  if (upper === 'AGENT') return USER_ROLES.AGENTE;
  return upper;
};

export const insertUser = async ({ name, email, username, passwordPlain, role = USER_ROLES.AGENTE, status = USER_STATUS.ACTIVE, tenantId = null }) => {
  const passwordHash = await hashPassword(passwordPlain);
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = (username || normalizedEmail).toLowerCase();
  const normalizedRole = normalizeRole(role);

  // Resolve tenant: use provided or fallback to default
  let resolvedTenant = tenantId;
  if (!resolvedTenant) {
    const res = await pool.query("SELECT id FROM tenants WHERE name = 'default' LIMIT 1");
    resolvedTenant = res.rows[0]?.id;
  }

  const { rows } = await pool.query(
    `INSERT INTO users (name, full_name, email, username, password_hash, role_id, tenant_id, status)
     VALUES ($1, $1, $2, $3, $4, (SELECT id FROM roles WHERE name = $5 LIMIT 1), $6, $7)
     RETURNING id, name, email, username, status, created_at, updated_at,
       (SELECT name FROM roles WHERE id = (SELECT id FROM roles WHERE name = $5 LIMIT 1)) AS role`,
    [name, normalizedEmail, normalizedUsername, passwordHash, normalizedRole, resolvedTenant, status]
  );
  return mapRowToUserEntity(rows[0]);
};

export const findUserByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.username, u.status, u.created_at, u.updated_at, u.deleted_at, r.name as role
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE LOWER(u.email) = LOWER($1) AND u.deleted_at IS NULL
     LIMIT 1`,
    [email]
  );
  if (!rows[0]) return null;
  return mapRowToUserEntity(rows[0]);
};

export const findUserByUsername = async (username) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.username, u.status, u.created_at, u.updated_at, u.deleted_at, r.name as role
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE LOWER(u.username) = LOWER($1) AND u.deleted_at IS NULL
     LIMIT 1`,
    [username]
  );
  if (!rows[0]) return null;
  return mapRowToUserEntity(rows[0]);
};

export const findUserById = async (id) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.username, u.status, u.created_at, u.updated_at, u.deleted_at, r.name as role
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1 AND u.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  return mapRowToUserEntity(rows[0]);
};

// Note: do not expose password_hash; retrieval for auth should be handled in dedicated auth repository.

export const updateUser = async (id, { name, email, username, role, status, deletedAt }) => {
  const normalizedRole = role ? normalizeRole(role) : null;
  const normalizedEmail = email ? email.toLowerCase() : null;
  const normalizedUsername = username ? username.toLowerCase() : null;

  const fields = [];
  const values = [];
  let idx = 1;

  if (name) {
    fields.push(`name = $${idx}, full_name = $${idx}`);
    values.push(name);
    idx += 1;
  }
  if (normalizedEmail) {
    fields.push(`email = $${idx}`);
    values.push(normalizedEmail);
    idx += 1;
  }
  if (normalizedUsername) {
    fields.push(`username = $${idx}`);
    values.push(normalizedUsername);
    idx += 1;
  }
  if (status) {
    fields.push(`status = $${idx}`);
    values.push(status);
    idx += 1;
  }
  if (normalizedRole) {
    fields.push(`role_id = (SELECT id FROM roles WHERE name = $${idx} LIMIT 1)`);
    values.push(normalizedRole);
    idx += 1;
  }
  if (deletedAt) {
    fields.push(`deleted_at = $${idx}`);
    values.push(deletedAt);
    idx += 1;
  }

  if (!fields.length) return findUserById(id);

  values.push(id);
  const sql = `
    UPDATE users
    SET ${fields.join(', ')},
        updated_at = NOW()
    WHERE id = $${values.length}
    RETURNING id, name, email, username, status, created_at, updated_at,
      (SELECT name FROM roles WHERE id = role_id) AS role
  `;

  const { rows } = await pool.query(sql, values);
  if (!rows[0]) return null;
  return mapRowToUserEntity(rows[0]);
};

export const listUsers = async () => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.username, u.status, u.created_at, u.updated_at, u.deleted_at, r.name as role
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.deleted_at IS NULL
     ORDER BY u.created_at DESC`
  );
  return rows.map(mapRowToUserEntity);
};
