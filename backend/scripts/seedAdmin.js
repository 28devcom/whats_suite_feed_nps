import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;

const requireEnv = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env ${key}`);
  return val;
};

const pool = new Pool({
  host: requireEnv('POSTGRES_HOST'),
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: requireEnv('POSTGRES_USER'),
  password: requireEnv('POSTGRES_PASSWORD'),
  database: requireEnv('POSTGRES_DB'),
  ssl: process.env.POSTGRES_SSL === 'true'
});

const adminEmail = process.env.ADMIN_EMAIL || 'admin@whatssuite.local';
const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const adminFullName = process.env.ADMIN_FULL_NAME || 'Default Admin';
const bcryptRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("INSERT INTO tenants (name) VALUES ('default') ON CONFLICT (name) DO NOTHING");
    const tenantRes = await client.query("SELECT id FROM tenants WHERE name = 'default' LIMIT 1");
    const tenantId = tenantRes.rows[0]?.id;
    if (!tenantId) throw new Error('Default tenant not found');

    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1");
    if (!roleRes.rows[0]) {
      throw new Error('Role ADMIN not found; run migrations first');
    }
    const roleId = roleRes.rows[0].id;

    const existsRes = await client.query('SELECT COUNT(1) AS count FROM users WHERE role_id = $1', [roleId]);
    const existingAdmins = Number(existsRes.rows[0].count || 0);
    if (existingAdmins > 0) {
      console.log(`Admin already exists (${existingAdmins}). No seed applied.`);
      await client.query('ROLLBACK');
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, bcryptRounds);
    const insertRes = await client.query(
      `INSERT INTO users (email, full_name, password_hash, role_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name`,
      [adminEmail.toLowerCase(), adminFullName, passwordHash, roleId, tenantId]
    );
    await client.query('COMMIT');
    console.log('Admin user created:', insertRes.rows[0]);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // ignore rollback errors
    }
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
