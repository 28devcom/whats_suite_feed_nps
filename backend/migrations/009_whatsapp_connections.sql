-- WhatsApp connections model (PostgreSQL) optimized for high volume and auditability.
-- Separates connection metadata from auth payload (handled elsewhere) and enforces bounded status values.
CREATE TABLE IF NOT EXISTS whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('CONNECTED', 'DISCONNECTED', 'PENDING', 'ERROR')),
    qr TEXT, -- último QR emitido (puede ser base64); payload grande se rota desde backend
    last_error TEXT,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice compuesto para listados y filtros por estado/reciente.
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status_updated_at ON whatsapp_connections(status, updated_at DESC);
-- Índice temporal para dashboards de disponibilidad recientes.
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_last_seen ON whatsapp_connections(last_seen DESC);
-- Búsquedas por nombre case-insensitive sin full scan.
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_name_lower ON whatsapp_connections (LOWER(name));

COMMENT ON TABLE whatsapp_connections IS 'Conexiones de WhatsApp gestionadas por Baileys (metadata, no credenciales).';
COMMENT ON COLUMN whatsapp_connections.qr IS 'Último QR generado; rotado y purgable para evitar crecimiento excesivo.';
COMMENT ON COLUMN whatsapp_connections.last_error IS 'Último error conocido para auditoría y troubleshooting.';
