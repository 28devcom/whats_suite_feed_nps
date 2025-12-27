-- Control estricto de chats por conexión (una apertura activa por sesión y tenant).

-- Índice parcial para garantizar un solo chat abierto por conexión y tenant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_chats_tenant_session_open
  ON chats(tenant_id, whatsapp_session_name)
  WHERE status = 'OPEN';

-- Índices de apoyo para búsquedas por conexión/estado.
CREATE INDEX IF NOT EXISTS idx_chats_tenant_session_status ON chats(tenant_id, whatsapp_session_name, status);
CREATE INDEX IF NOT EXISTS idx_chats_tenant_session ON chats(tenant_id, whatsapp_session_name);
CREATE INDEX IF NOT EXISTS idx_chats_tenant_status ON chats(tenant_id, status);
