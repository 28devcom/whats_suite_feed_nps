import pool from '../../infra/db/postgres.js';

export const getRetentionStats = async (tenantId) => {
    // Logic to calculate churn and customer segments
    // For this implementation, we'll provide aggregated data from feedback and conversations
    const query = `
        SELECT 
            COUNT(DISTINCT customer_phone) as total_customers,
            COUNT(DISTINCT CASE WHEN last_interaction > CURRENT_DATE - INTERVAL '30 days' THEN customer_phone END) as active_customers,
            COUNT(DISTINCT CASE WHEN last_interaction BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days' THEN customer_phone END) as at_risk_customers,
            COUNT(DISTINCT CASE WHEN last_interaction < CURRENT_DATE - INTERVAL '60 days' THEN customer_phone END) as inactive_customers
        FROM (
            SELECT customer_phone, MAX(created_at) as last_interaction
            FROM feedback_responses
            WHERE tenant_id = $1
            GROUP BY customer_phone
        ) as sub
    `;
    const result = await pool.query(query, [tenantId]);
    const stats = result.rows[0];
    
    return {
        segments: {
            active: parseInt(stats.active_customers || 0),
            at_risk: parseInt(stats.at_risk_customers || 0),
            inactive: parseInt(stats.inactive_customers || 0)
        },
        total: parseInt(stats.total_customers || 0)
    };
};

export const getAtRiskCustomers = async (tenantId) => {
    const query = `
        SELECT customer_phone, MAX(created_at) as last_interaction
        FROM feedback_responses
        WHERE tenant_id = $1
        GROUP BY customer_phone
        HAVING MAX(created_at) BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days'
        LIMIT 50
    `;
    const result = await pool.query(query, [tenantId]);
    return result.rows;
};
