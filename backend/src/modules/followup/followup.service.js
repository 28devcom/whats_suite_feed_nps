import pool from '../../infra/db/postgres.js';
import { AppError } from '../../shared/errors.js';

export const createRule = async (tenantId, data) => {
    const { name, days_inactive, message_template } = data;
    const result = await pool.query(
        'INSERT INTO followup_rules (tenant_id, name, days_inactive, message_template) VALUES ($1, $2, $3, $4) RETURNING *',
        [tenantId, name, days_inactive, message_template]
    );
    return result.rows[0];
};

export const listRules = async (tenantId) => {
    const result = await pool.query('SELECT * FROM followup_rules WHERE tenant_id = $1 AND active = true', [tenantId]);
    return result.rows;
};

export const deleteRule = async (tenantId, id) => {
    const result = await pool.query('UPDATE followup_rules SET active = false WHERE id = $1 AND tenant_id = $2 RETURNING *', [id, tenantId]);
    if (result.rowCount === 0) throw new AppError('Rule not found', 404);
    return result.rows[0];
};

export const getFollowupLogs = async (tenantId) => {
    const result = await pool.query(
        'SELECT l.*, r.name as rule_name FROM followup_logs l JOIN followup_rules r ON l.rule_id = r.id WHERE l.tenant_id = $1 ORDER BY l.sent_at DESC LIMIT 100',
        [tenantId]
    );
    return result.rows;
};

// Logic to identify pending follow-ups (simplified)
export const getPendingFollowups = async (tenantId) => {
    // In a real scenario, this would join with conversations/messages to find inactive customers
    // For now, we'll return a sample or empty list
    return [];
};
