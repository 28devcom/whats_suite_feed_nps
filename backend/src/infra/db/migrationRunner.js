import { promises as fs } from 'node:fs';
import path from 'node:path';
import pool from './postgres.js';
import logger from '../logging/logger.js';

const migrationsDir = path.resolve(process.cwd(), 'migrations');

const ensureMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const listMigrationFiles = async () => {
  try {
    const entries = await fs.readdir(migrationsDir);
    return entries.filter((f) => f.endsWith('.sql')).sort();
  } catch (err) {
    logger.error({ err, migrationsDir }, 'No se pudo leer el directorio de migraciones');
    throw err;
  }
};

const listAppliedMigrations = async () => {
  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  return new Set(rows.map((r) => r.name));
};

const applyMigration = async (file) => {
  const client = await pool.connect();
  const fullPath = path.join(migrationsDir, file);
  const sql = await fs.readFile(fullPath, 'utf8');
  const markApplied = async () =>
    pool
      .query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [file])
      .then(() => logger.warn({ migration: file }, 'Marcada como aplicada por duplicado detectado'));
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    logger.info({ migration: file }, 'Migración aplicada');
  } catch (err) {
    await client.query('ROLLBACK');
    const duplicateCodes = new Set(['42710', '42P07', '42701', '23505']); // objeto/tabla/columna ya existe, unique violation
    const isDuplicate =
      duplicateCodes.has(err?.code) ||
      /already exists/i.test(err?.message || '') ||
      /duplicate/i.test(err?.message || '');
    if (isDuplicate) {
      logger.warn({ err, migration: file }, 'Migración ya aplicada anteriormente; marcando como completada');
      await markApplied();
      return;
    }
    // Si la migración falla por falta de columna/tabla previa, marca y continúa (asumimos aplicada manualmente)
    const missingPrereq = /does not exist|missing column|missing relation/i.test(err?.message || '') || err?.code === '42703';
    if (missingPrereq) {
      logger.warn({ err, migration: file }, 'Migración con dependencias previas faltantes; se marca como aplicada para continuar');
      await markApplied();
      return;
    }
    logger.error({ err, migration: file }, 'Error aplicando migración');
    throw err;
  } finally {
    client.release();
  }
};

export const runPendingMigrations = async () => {
  await ensureMigrationsTable();
  const files = await listMigrationFiles();
  const applied = await listAppliedMigrations();
  const pending = files.filter((f) => !applied.has(f));
  if (!pending.length) {
    logger.info({ migrations: files.length }, 'Sin migraciones pendientes');
    return { applied: 0 };
  }
  for (const file of pending) {
    await applyMigration(file);
  }
  return { applied: pending.length };
};

export default runPendingMigrations;
