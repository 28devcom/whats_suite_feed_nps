import pool from './postgres.js';

let ensured = false;
const ensureTable = async () => {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_connections (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(16) NOT NULL,
      socket_id VARCHAR(128) NOT NULL,
      connected BOOLEAN NOT NULL DEFAULT true,
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_user_connections_socket ON user_connections(socket_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_connections_user ON user_connections(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_connections_connected ON user_connections(connected);`);
  ensured = true;
};

const mapConnection = (row) => ({
  id: row.id,
  userId: row.user_id,
  role: row.role,
  socketId: row.socket_id,
  connected: row.connected,
  lastSeen: row.last_seen,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const upsertUserConnection = async ({ userId, role, socketId, connected }) => {
  await ensureTable();
  const { rows } = await pool.query(
    `INSERT INTO user_connections (user_id, role, socket_id, connected, last_seen, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (socket_id) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           role = EXCLUDED.role,
           connected = EXCLUDED.connected,
           last_seen = NOW(),
           updated_at = NOW()
     RETURNING *`,
    [userId, role, socketId, connected]
  );
  return rows[0] ? mapConnection(rows[0]) : null;
};

export const markDisconnectedBySocket = async (socketId) => {
  await ensureTable();
  const { rows } = await pool.query(
    `UPDATE user_connections
     SET connected = false,
         last_seen = NOW(),
         updated_at = NOW()
     WHERE socket_id = $1
     RETURNING *`,
    [socketId]
  );
  return rows[0] ? mapConnection(rows[0]) : null;
};

export const listConnectedAgents = async () => {
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT * FROM user_connections
     WHERE connected = true AND role = 'AGENTE'
     ORDER BY last_seen DESC`
  );
  return rows.map(mapConnection);
};

export const listConnectionsByUserIds = async (userIds = []) => {
  await ensureTable();
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT * FROM user_connections
     WHERE connected = true
       AND user_id = ANY($1)`,
    [userIds]
  );
  return rows.map(mapConnection);
};

export const listConnectionsByRoles = async (roles = []) => {
  await ensureTable();
  if (!Array.isArray(roles) || roles.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT * FROM user_connections
     WHERE connected = true
       AND role = ANY($1)`,
    [roles]
  );
  return rows.map(mapConnection);
};

export const markDisconnectedByUserIds = async (userIds = []) => {
  await ensureTable();
  if (!Array.isArray(userIds) || userIds.length === 0) return 0;
  const { rowCount } = await pool.query(
    `UPDATE user_connections
     SET connected = false,
         last_seen = NOW(),
         updated_at = NOW()
     WHERE user_id = ANY($1)`,
    [userIds]
  );
  return rowCount;
};
