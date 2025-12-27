-- Registro de errores clasificados para ISO 9001 (operativo/seguridad/integración).
CREATE TABLE IF NOT EXISTS whatsapp_error_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('operational','security','integration')),
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_error_log_session ON whatsapp_error_log(session_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_error_log_created_at ON whatsapp_error_log(created_at DESC);
