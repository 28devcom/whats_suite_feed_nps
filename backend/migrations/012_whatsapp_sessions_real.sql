-- Rebuild WhatsApp session storage for Baileys 7.0.0-rc.9 (safe version).
-- Nota: Se evita DROP por dependencias existentes; usar migración 013 para añadir columnas si faltan.
-- Si la tabla no existe, se crea. Si existe, no se toca (se espera 013 para normalizar).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'whatsapp_sessions'
  ) THEN
    CREATE TABLE whatsapp_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        connection_id UUID NOT NULL,
        creds JSONB NOT NULL,
        is_valid BOOLEAN NOT NULL DEFAULT FALSE,
        last_connected_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT whatsapp_sessions_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
        CONSTRAINT whatsapp_sessions_connection_id_key UNIQUE (connection_id)
    );
    CREATE INDEX idx_whatsapp_sessions_is_valid ON whatsapp_sessions (is_valid);
    CREATE INDEX idx_whatsapp_sessions_last_connected ON whatsapp_sessions (last_connected_at DESC);
    COMMENT ON TABLE whatsapp_sessions IS 'Sesiones completas de Baileys (creds JSONB) asociadas 1:1 a whatsapp_connections. Listas para cifrado a nivel aplicación.';
    COMMENT ON COLUMN whatsapp_sessions.creds IS 'Credenciales completas de Baileys 7.x (se deben cifrar a nivel aplicación antes de persistir si aplica).';
    COMMENT ON COLUMN whatsapp_sessions.is_valid IS 'Bandera rápida para saber si la sesión sigue siendo utilizable sin leer todo el payload.';
  END IF;
END $$;
