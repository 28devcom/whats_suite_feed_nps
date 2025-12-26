import pool from './postgres.js';

export const createTemplate = async ({ name, body, variables, createdBy }) => {
  const { rows } = await pool.query(
    `INSERT INTO message_templates (name, body, variables, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, body, variables || [], createdBy || null]
  );
  return rows[0];
};

export const listTemplates = async () => {
  const { rows } = await pool.query('SELECT * FROM message_templates ORDER BY created_at DESC');
  return rows;
};

export const createCampaign = async ({ name, templateId, whatsappSessionId, scheduledAt, createdBy }) => {
  const { rows } = await pool.query(
    `INSERT INTO campaigns (name, template_id, whatsapp_session_id, status, scheduled_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, templateId, whatsappSessionId || null, scheduledAt ? 'scheduled' : 'draft', scheduledAt || null, createdBy || null]
  );
  return rows[0];
};

export const addTargets = async (campaignId, targets) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of targets) {
      await client.query(
        `INSERT INTO campaign_targets (campaign_id, contact, variables)
         VALUES ($1, $2, $3)
         ON CONFLICT (campaign_id, contact) DO NOTHING`,
        [campaignId, t.contact, t.variables || {}]
      );
    }
    await client.query('UPDATE campaigns SET total_targets = (SELECT COUNT(1) FROM campaign_targets WHERE campaign_id=$1) WHERE id=$1', [campaignId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const listCampaigns = async () => {
  const { rows } = await pool.query('SELECT * FROM campaigns ORDER BY created_at DESC');
  return rows;
};

export const getCampaign = async (id) => {
  const { rows } = await pool.query('SELECT * FROM campaigns WHERE id=$1 LIMIT 1', [id]);
  return rows[0] || null;
};

export const updateCampaignStatus = async (id, status) => {
  await pool.query('UPDATE campaigns SET status=$1, updated_at=NOW() WHERE id=$2', [status, id]);
};

export const listTargets = async (campaignId, status) => {
  const params = [campaignId];
  let query = 'SELECT * FROM campaign_targets WHERE campaign_id=$1';
  if (status) {
    params.push(status);
    query += ` AND status=$${params.length}`;
  }
  query += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(query, params);
  return rows;
};

export const updateTargetStatus = async (targetId, status, error) => {
  await pool.query('UPDATE campaign_targets SET status=$1, last_error=$2, updated_at=NOW() WHERE id=$3', [status, error || null, targetId]);
};

export const recordCampaignEvent = async ({ campaignId, targetId, eventType, details }) => {
  await pool.query(
    `INSERT INTO campaign_events (campaign_id, target_id, event_type, details)
     VALUES ($1, $2, $3, $4)`,
    [campaignId, targetId || null, eventType, details || {}]
  );
};

export const listCampaignEvents = async (campaignId) => {
  const { rows } = await pool.query(
    'SELECT * FROM campaign_events WHERE campaign_id=$1 ORDER BY created_at DESC LIMIT 500',
    [campaignId]
  );
  return rows;
};
