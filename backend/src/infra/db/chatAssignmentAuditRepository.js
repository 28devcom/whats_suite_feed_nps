import pool from './postgres.js';

let auditSchemaEnsured = false;
const ensureAuditSchema = async () => {
  if (auditSchemaEnsured) return;
  await pool.query(`
    ALTER TABLE IF EXISTS chat_assignment_audit
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS from_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS to_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS from_connection_id VARCHAR(128),
      ADD COLUMN IF NOT EXISTS to_connection_id VARCHAR(128),
      ADD COLUMN IF NOT EXISTS validated_queue BOOLEAN DEFAULT NULL;
  `);
  await pool.query(`ALTER TABLE chat_assignment_audit DROP CONSTRAINT IF EXISTS chat_assignment_audit_action_check;`);
  await pool.query(
    `ALTER TABLE chat_assignment_audit
       ADD CONSTRAINT chat_assignment_audit_action_check CHECK (action IN ('AUTO_ASSIGN','MANUAL_ASSIGN','UNASSIGN','CLOSE','REASSIGN'))`
  );
  auditSchemaEnsured = true;
};

const resolveTenantId = async ({ chatId, userId }) => {
  if (chatId) {
    const res = await pool.query('SELECT tenant_id FROM chats WHERE id = $1 LIMIT 1', [chatId]);
    if (res.rows[0]?.tenant_id) return res.rows[0].tenant_id;
  }
  if (userId) {
    const res = await pool.query('SELECT tenant_id FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (res.rows[0]?.tenant_id) return res.rows[0].tenant_id;
  }
  const def = await pool.query("SELECT id FROM tenants WHERE name = 'default' LIMIT 1");
  return def.rows[0]?.id || null;
};

export const recordChatAssignmentAudit = async ({
  chatId,
  previousAgentId = null,
  newAgentId = null,
  action,
  executedByUserId = null,
  reason = null,
  fromConnectionId = null,
  toConnectionId = null,
  validatedQueue = null,
  tenantId = null
}) => {
  await ensureAuditSchema();
  const resolvedTenant = tenantId || (await resolveTenantId({ chatId, userId: executedByUserId }));
  await pool.query(
    `INSERT INTO chat_assignment_audit
      (chat_id, tenant_id, previous_agent_id, new_agent_id, action, executed_by_user_id, reason, from_agent_id, to_agent_id, from_connection_id, to_connection_id, validated_queue, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $3, $4, $8, $9, $10, NOW())`,
    [
      chatId,
      resolvedTenant,
      previousAgentId,
      newAgentId,
      action,
      executedByUserId,
      reason,
      fromConnectionId,
      toConnectionId,
      validatedQueue
    ]
  );
};

export const getLatestChatAssignmentAudit = async (chatId) => {
  if (!chatId) return null;
  await ensureAuditSchema();
  const { rows } = await pool.query(
    `SELECT action, reason, executed_by_user_id, previous_agent_id, new_agent_id,
            from_connection_id, to_connection_id, validated_queue, created_at
     FROM chat_assignment_audit
     WHERE chat_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [chatId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    action: row.action,
    reason: row.reason,
    executedByUserId: row.executed_by_user_id,
    previousAgentId: row.previous_agent_id,
    newAgentId: row.new_agent_id,
    fromConnectionId: row.from_connection_id,
    toConnectionId: row.to_connection_id,
    validatedQueue: row.validated_queue,
    createdAt: row.created_at
  };
};
