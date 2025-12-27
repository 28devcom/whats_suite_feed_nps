-- Session anchor storing encrypted creds per WhatsApp connection (no filesystem).
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID,
    encrypted_creds TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure required columns and constraints exist even if the table was created previously.
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS connection_id UUID;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS encrypted_creds TEXT;
-- Ensure FK/unique constraints (Postgres no IF NOT EXISTS for constraints)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'whatsapp_sessions_connection_id_fkey'
  ) THEN
    ALTER TABLE whatsapp_sessions DROP CONSTRAINT whatsapp_sessions_connection_id_fkey;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'whatsapp_sessions_connection_id_key'
  ) THEN
    ALTER TABLE whatsapp_sessions DROP CONSTRAINT whatsapp_sessions_connection_id_key;
  END IF;
END $$;

ALTER TABLE whatsapp_sessions ADD CONSTRAINT whatsapp_sessions_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES whatsapp_connections(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_sessions ADD CONSTRAINT whatsapp_sessions_connection_id_key UNIQUE (connection_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_connection ON whatsapp_sessions(connection_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_updated_at ON whatsapp_sessions(updated_at DESC);

COMMENT ON TABLE whatsapp_sessions IS 'Credenciales cifradas de Baileys asociadas a cada conexión de WhatsApp.';
