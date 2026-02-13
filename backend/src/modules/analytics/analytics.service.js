import pool from '../../infra/db/postgres.js';

export const getPostSalesKpis = async (tenantId, startDate, endDate) => {
    // Basic stats from feedback responses
    const feedbackQuery = `
        SELECT 
            COUNT(*) as total_responses,
            AVG(score) as avg_score,
            COUNT(CASE WHEN score >= 9 THEN 1 END) as promoters,
            COUNT(CASE WHEN score <= 6 THEN 1 END) as detractors
        FROM feedback_responses
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
    `;
    const feedbackRes = await pool.query(feedbackQuery, [tenantId, startDate || '1970-01-01', endDate || '9999-12-31']);
    const feedbackStats = feedbackRes.rows[0];
    
    // NPS Calculation
    const total = parseInt(feedbackStats.total_responses);
    let nps = 0;
    if (total > 0) {
        nps = Math.round(((parseInt(feedbackStats.promoters) - parseInt(feedbackStats.detractors)) / total) * 100);
    }

    // Retention Metrics (Simulated based on active chats vs returning customers)
    const retentionQuery = `
        SELECT 
            COUNT(DISTINCT customer_phone) as total_customers,
            COUNT(DISTINCT CASE WHEN conversation_count > 1 THEN customer_phone END) as returning_customers
        FROM (
            SELECT customer_phone, COUNT(*) as conversation_count
            FROM feedback_responses
            WHERE tenant_id = $1
            GROUP BY customer_phone
        ) as sub
    `;
    const retentionRes = await pool.query(retentionQuery, [tenantId]);
    const retentionStats = retentionRes.rows[0];
    
    const retentionRate = retentionStats.total_customers > 0 
        ? Math.round((retentionStats.returning_customers / retentionStats.total_customers) * 100)
        : 0;

    return {
        nps,
        total_responses: total,
        avg_score: parseFloat(feedbackStats.avg_score || 0).toFixed(1),
        retention_rate: retentionRate,
        promoters: parseInt(feedbackStats.promoters),
        detractors: parseInt(feedbackStats.detractors),
        passives: total - parseInt(feedbackStats.promoters) - parseInt(feedbackStats.detractors)
    };
};

export const getEvolutionData = async (tenantId, months = 6) => {
    const query = `
        SELECT 
            TO_CHAR(created_at, 'YYYY-MM') as month,
            AVG(score) as avg_score,
            COUNT(*) as total
        FROM feedback_responses
        WHERE tenant_id = $1 AND created_at > CURRENT_DATE - INTERVAL '$2 months'
        GROUP BY month
        ORDER BY month ASC
    `;
    const result = await pool.query(query, [tenantId, months]);
    return result.rows;
};
