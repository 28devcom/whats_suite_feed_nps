-- Enrich chat_messages with message type and WhatsApp message id for full history
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS message_type VARCHAR(32) DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_chat_messages_whatsapp_message_id ON chat_messages(whatsapp_message_id);
