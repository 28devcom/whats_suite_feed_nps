-- Audit log específico para eventos de WhatsApp (ISO 27001 traceability).
CREATE TABLE IF NOT EXISTS whatsapp_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name TEXT NOT NULL,
    event TEXT NOT NULL,
    user_id UUID,
    ip TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_audit_log_session_event ON whatsapp_audit_log(session_name, event);
CREATE INDEX IF NOT EXISTS idx_whatsapp_audit_log_created_at ON whatsapp_audit_log(created_at DESC);
