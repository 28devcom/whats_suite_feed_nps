import pg from 'pg';
import env from '../../config/env.js';
import logger from '../logging/logger.js';

const { Pool } = pg;

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  ssl: env.db.ssl,
  min: env.db.pool.min,
  max: env.db.pool.max,
  idleTimeoutMillis: env.db.pool.idle,
  maxUses: env.db.pool.maxUses || undefined,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PostgreSQL client error');
});

export const healthCheck = async () => {
  const start = Date.now();
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return { healthy: true, latencyMs: Date.now() - start };
  } finally {
    client.release();
  }
};

export default pool;
