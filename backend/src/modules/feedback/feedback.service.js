import pool from '../../infra/db/postgres.js';
import { AppError } from '../../shared/errors.js';
import logger from '../../infra/logging/logger.js';
import { sendWhatsAppMessage } from '../../services/whatsappService.js';

// Template Management
export const createTemplate = async (tenantId, data) => {
    const { name, type, message_text, options } = data;
    const result = await pool.query(
        'INSERT INTO feedback_templates (tenant_id, name, type, message_text, options) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [tenantId, name, type || 'NPS', message_text, options ? JSON.stringify(options) : null]
    );
    return result.rows[0];
};

export const listTemplates = async (tenantId) => {
    const result = await pool.query(
        'SELECT * FROM feedback_templates WHERE tenant_id = $1 AND active = true ORDER BY created_at DESC',
        [tenantId]
    );
    return result.rows;
};

export const deleteTemplate = async (tenantId, id) => {
    const result = await pool.query(
        'UPDATE feedback_templates SET active = false WHERE id = $1 AND tenant_id = $2 RETURNING *',
        [id, tenantId]
    );
    if (result.rowCount === 0) throw new AppError('Template not found', 404);
    return result.rows[0];
};

// Settings Management
export const getSettings = async (tenantId) => {
    const result = await pool.query('SELECT * FROM feedback_settings WHERE tenant_id = $1', [tenantId]);
    if (result.rowCount === 0) {
        // Create default settings if not exists
        const insert = await pool.query(
            'INSERT INTO feedback_settings (tenant_id) VALUES ($1) RETURNING *',
            [tenantId]
        );
        return insert.rows[0];
    }
    return result.rows[0];
};

export const updateSettings = async (tenantId, data) => {
    const { enabled, wait_time_hours, trigger_event, template_id } = data;
    const result = await pool.query(
        `UPDATE feedback_settings 
         SET enabled = $1, wait_time_hours = $2, trigger_event = $3, template_id = $4, updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $5 RETURNING *`,
        [enabled, wait_time_hours, trigger_event, template_id, tenantId]
    );
    return result.rows[0];
};

// Feedback Processing
export const registerResponse = async (tenantId, data) => {
    const { customer_phone, conversation_id, template_id, score, comment, metadata } = data;
    const result = await pool.query(
        `INSERT INTO feedback_responses (tenant_id, customer_phone, conversation_id, template_id, score, comment, metadata, responded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *`,
        [tenantId, customer_phone, conversation_id, template_id, score, comment, metadata ? JSON.stringify(metadata) : null]
    );
    return result.rows[0];
};

export const getStats = async (tenantId, startDate, endDate) => {
    const query = `
        SELECT 
            COUNT(*) as total_responses,
            AVG(score) as avg_score,
            COUNT(CASE WHEN score >= 9 THEN 1 END) as promoters,
            COUNT(CASE WHEN score <= 6 THEN 1 END) as detractors,
            COUNT(CASE WHEN score BETWEEN 7 AND 8 THEN 1 END) as passives
        FROM feedback_responses
        WHERE tenant_id = $1 
        AND created_at BETWEEN $2 AND $3
    `;
    const result = await pool.query(query, [tenantId, startDate || '1970-01-01', endDate || '9999-12-31']);
    const stats = result.rows[0];
    
    // Calculate NPS
    const total = parseInt(stats.total_responses);
    if (total > 0) {
        const promoterPct = (parseInt(stats.promoters) / total) * 100;
        const detractorPct = (parseInt(stats.detractors) / total) * 100;
        stats.nps_score = Math.round(promoterPct - detractorPct);
    } else {
        stats.nps_score = 0;
    }
    
    return stats;
};

export const listResponses = async (tenantId, filters = {}) => {
    let query = 'SELECT r.*, t.name as template_name FROM feedback_responses r JOIN feedback_templates t ON r.template_id = t.id WHERE r.tenant_id = $1';
    const params = [tenantId];
    
    if (filters.template_id) {
        params.push(filters.template_id);
        query += ` AND r.template_id = $${params.length}`;
    }
    
    query += ' ORDER BY r.created_at DESC LIMIT 100';
    const result = await pool.query(query, params);
    return result.rows;
};

// Automation Trigger (called when a chat is closed)
export const triggerFeedbackRequest = async (tenantId, customerPhone, conversationId) => {
    const settings = await getSettings(tenantId);
    if (!settings.enabled || !settings.template_id) return;

    const templateResult = await pool.query('SELECT * FROM feedback_templates WHERE id = $1', [settings.template_id]);
    const template = templateResult.rows[0];
    if (!template) return;

    // In a real scenario, this would be scheduled via a worker (like Bull/Redis)
    // For this implementation, we'll log it and assume the worker picks it up
    logger.info({ tenantId, customerPhone, waitHours: settings.wait_time_hours }, 'Feedback request scheduled');
    
    // Create a pending response record
    await pool.query(
        'INSERT INTO feedback_responses (tenant_id, customer_phone, conversation_id, template_id, sent_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
        [tenantId, customerPhone, conversationId, template.id]
    );
    
    // TODO: Integrate with a scheduler to send the message after wait_time_hours
};
