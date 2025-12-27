-- Permitir múltiples chats por conexión con distintos números, garantizando unicidad por número.

-- Retira la unicidad por solo sesión abierta.
DROP INDEX IF EXISTS uq_chats_tenant_session_open;

-- Unicidad por tenant + sesión + número cuando está OPEN.
CREATE UNIQUE INDEX IF NOT EXISTS uq_chats_tenant_session_number_open
  ON chats(tenant_id, whatsapp_session_name, remote_number)
  WHERE status = 'OPEN';

-- Índices de apoyo para búsquedas por número.
CREATE INDEX IF NOT EXISTS idx_chats_tenant_session_number
  ON chats(tenant_id, whatsapp_session_name, remote_number);

CREATE INDEX IF NOT EXISTS idx_chats_tenant_number_status
  ON chats(tenant_id, remote_number, status);
