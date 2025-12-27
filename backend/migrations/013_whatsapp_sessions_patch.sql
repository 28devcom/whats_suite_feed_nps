-- Migra estructura de whatsapp_sessions sin dropear la tabla existente.
-- Añade columnas requeridas por el nuevo store basado en jsonb y flags de validez.

ALTER TABLE whatsapp_sessions
  ADD COLUMN IF NOT EXISTS creds JSONB,
  ADD COLUMN IF NOT EXISTS is_valid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Garantizar FK y UNIQUE sobre connection_id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'whatsapp_sessions_connection_id_fkey'
      AND table_name = 'whatsapp_sessions'
  ) THEN
    ALTER TABLE whatsapp_sessions
      ADD CONSTRAINT whatsapp_sessions_connection_id_fkey
      FOREIGN KEY (connection_id) REFERENCES whatsapp_connections(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'whatsapp_sessions_connection_id_key'
      AND table_name = 'whatsapp_sessions'
  ) THEN
    ALTER TABLE whatsapp_sessions
      ADD CONSTRAINT whatsapp_sessions_connection_id_key UNIQUE (connection_id);
  END IF;
END $$;

-- Índices solicitados.
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_is_valid ON whatsapp_sessions (is_valid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_last_connected ON whatsapp_sessions (last_connected_at DESC);

-- Normaliza datos existentes: si ya había creds previas (columna antigua), márcalas válidas.
UPDATE whatsapp_sessions
SET is_valid = TRUE,
    updated_at = NOW()
WHERE creds IS NOT NULL;

COMMENT ON COLUMN whatsapp_sessions.creds IS 'Credenciales completas de Baileys (jsonb cifrado a nivel aplicación).';
COMMENT ON COLUMN whatsapp_sessions.is_valid IS 'Bandera rápida para saber si la sesión sigue utilizable sin leer todo el payload.';
COMMENT ON COLUMN whatsapp_sessions.last_connected_at IS 'Última vez que la sesión estuvo abierta.';
