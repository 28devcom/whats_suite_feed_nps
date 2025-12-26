import pool from './postgres.js';

const mapMessage = (row) => ({
  id: row.id,
  conversationId: row.conversation_id,
  externalId: row.external_id,
  direction: row.direction,
  sender: row.sender,
  recipient: row.recipient,
  messageType: row.message_type,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  payload: row.payload ? row.payload : undefined,
  attachments: row.attachments ? row.attachments : undefined
});

export const createMessageWithPayload = async ({
  conversationId,
  externalId,
  direction,
  sender,
  recipient,
  messageType,
  status = 'received',
  payload,
  payloadType,
  storageUrl,
  checksum,
  sizeBytes,
  attachments = []
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO messages (conversation_id, external_id, direction, sender, recipient, message_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [conversationId, externalId, direction, sender, recipient, messageType, status]
    );
    const message = rows[0];

    await client.query(
      `INSERT INTO message_payloads (message_id, payload_type, content, storage_url, checksum, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [message.id, payloadType, payload ? payload : null, storageUrl || null, checksum || null, sizeBytes || null]
    );

    for (const attachment of attachments) {
      await client.query(
        `INSERT INTO message_attachments (id, message_id, file_name, mime_type, size_bytes, storage_url, checksum)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
        [message.id, attachment.fileName, attachment.mimeType, attachment.sizeBytes, attachment.storageUrl, attachment.checksum || null]
      );
    }

    await client.query(
      `INSERT INTO message_events (message_id, event_type, details)
       VALUES ($1, 'received', $2)`,
      [message.id, { direction, source: 'api' }]
    );

    await client.query('COMMIT');
    return mapMessage(message);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const appendEvent = async (messageId, eventType, details = {}) => {
  await pool.query(
    `INSERT INTO message_events (message_id, event_type, details)
     VALUES ($1, $2, $3)` ,
    [messageId, eventType, details]
  );
};

export const updateStatus = async (messageId, status) => {
  await pool.query('UPDATE messages SET status=$1, updated_at=NOW() WHERE id=$2', [status, messageId]);
};

export const listMessages = async ({ conversationId, limit = 50, cursor }) => {
  const realLimit = Math.min(limit, 200);
  let query = `SELECT m.*, mp.content as payload, mp.storage_url, mp.payload_type, mp.size_bytes,
      COALESCE(json_agg(ma.*) FILTER (WHERE ma.id IS NOT NULL), '[]') AS attachments
      FROM messages m
      JOIN message_payloads mp ON mp.message_id = m.id
      LEFT JOIN message_attachments ma ON ma.message_id = m.id
      WHERE m.conversation_id = $1`;
  const params = [conversationId];
  if (cursor) {
    params.push(cursor);
    query += ` AND m.created_at < $${params.length}`;
  }
  query += ' GROUP BY m.id, mp.content, mp.storage_url, mp.payload_type, mp.size_bytes';
  query += ' ORDER BY m.created_at DESC LIMIT ' + realLimit;
  const { rows } = await pool.query(query, params);
  return rows.map(mapMessage);
};

export const getMessageById = async (id) => {
  const { rows } = await pool.query(
    `SELECT m.*, mp.content as payload, mp.storage_url, mp.payload_type, mp.size_bytes,
            COALESCE(json_agg(ma.*) FILTER (WHERE ma.id IS NOT NULL), '[]') AS attachments
     FROM messages m
     JOIN message_payloads mp ON mp.message_id = m.id
     LEFT JOIN message_attachments ma ON ma.message_id = m.id
     WHERE m.id = $1
     GROUP BY m.id, mp.content, mp.storage_url, mp.payload_type, mp.size_bytes
     LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  return mapMessage(rows[0]);
};
