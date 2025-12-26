import bcrypt from 'bcrypt';
import pool from '../infra/db/postgres.js';
import logger from '../infra/logging/logger.js';

const requireEnv = (key, fallback = null) => {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`Missing env ${key} for bootstrap`);
  }
  return value;
};

const ensureAdminSeed = async () => {
  const adminEmail = requireEnv('ADMIN_EMAIL', 'admin@whatssuite.local').toLowerCase();
  const adminPassword = requireEnv('ADMIN_PASSWORD', 'ChangeMe123!');
  const adminFullName = requireEnv('ADMIN_FULL_NAME', 'Default Admin');
  const adminUsername = (process.env.ADMIN_USERNAME || adminEmail.split('@')[0] || 'admin').toLowerCase();
  const bcryptRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Ensure default tenant exists
    await client.query("INSERT INTO tenants (name) VALUES ('default') ON CONFLICT (name) DO NOTHING");
    const tenantRes = await client.query("SELECT id FROM tenants WHERE name = 'default' LIMIT 1");
    const tenantId = tenantRes.rows[0]?.id;
    if (!tenantId) throw new Error('No se pudo resolver tenant default');

    const roleRes = await client.query("SELECT id FROM roles WHERE name='ADMIN' LIMIT 1");
    if (!roleRes.rows[0]) {
      throw new Error('Role ADMIN not found; migrations may be missing');
    }
    const roleId = roleRes.rows[0].id;
    const adminCountRes = await client.query('SELECT COUNT(1) AS total FROM users WHERE role_id = $1', [roleId]);
    const existingAdmins = Number(adminCountRes.rows[0].total || 0);
    if (existingAdmins > 0) {
      await client.query('ROLLBACK');
      logger.info({ existingAdmins }, 'Admin already present, skipping seed');
      return;
    }
    const passwordHash = await bcrypt.hash(adminPassword, bcryptRounds);
    const insertRes = await client.query(
      `INSERT INTO users (email, username, name, full_name, password_hash, role_id, tenant_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
       RETURNING id, email, username, name, full_name`,
      [adminEmail, adminUsername, adminFullName, adminFullName, passwordHash, roleId, tenantId]
    );
    await client.query('COMMIT');
    logger.info({ admin: insertRes.rows[0] }, 'Admin user seeded automatically');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // ignore rollback errors
    }
    logger.error({ err }, 'Failed to seed admin user');
    throw err;
  } finally {
    client.release();
  }
};

export default ensureAdminSeed;
