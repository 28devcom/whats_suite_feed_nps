-- Hardening de chat_messages para WhatsApp: claves únicas, estado y soft delete
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS whatsapp_session_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS remote_number VARCHAR(32),
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Completar datos faltantes desde chats
UPDATE chat_messages cm
SET whatsapp_session_name = c.whatsapp_session_name,
    remote_number = c.remote_number
FROM chats c
WHERE cm.chat_id = c.id
  AND (cm.whatsapp_session_name IS NULL OR cm.remote_number IS NULL);

UPDATE chat_messages
SET updated_at = NOW()
WHERE updated_at IS NULL;

ALTER TABLE chat_messages
  ALTER COLUMN whatsapp_session_name SET NOT NULL,
  ALTER COLUMN remote_number SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Eliminar duplicados antes de aplicar índice único
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY whatsapp_session_name, remote_number, whatsapp_message_id ORDER BY created_at) AS rn
  FROM chat_messages
  WHERE whatsapp_message_id IS NOT NULL
)
DELETE FROM chat_messages cm
USING duplicates d
WHERE cm.id = d.id
  AND d.rn > 1;

-- Índices para deduplicación y consultas por sesión/remoto
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_remote ON chat_messages(whatsapp_session_name, remote_number);
CREATE UNIQUE INDEX IF NOT EXISTS ux_chat_messages_whatsapp_unique
  ON chat_messages(whatsapp_session_name, remote_number, whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;
