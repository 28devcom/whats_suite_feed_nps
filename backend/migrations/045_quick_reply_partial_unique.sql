-- Ajuste de unicidad para permitir duplicar títulos cuando están inactivos (soft delete).

-- Elimina índice único previo.
DROP INDEX IF EXISTS uq_quick_replies_tenant_titulo;

-- Unicidad solo para respuestas activas (activo = true).
CREATE UNIQUE INDEX IF NOT EXISTS uq_quick_replies_tenant_titulo_active
  ON quick_replies(tenant_id, LOWER(titulo))
  WHERE activo = true;

-- Índice auxiliar para búsquedas mixtas por título sin condicionar activo.
CREATE INDEX IF NOT EXISTS idx_quick_replies_tenant_titulo_lower
  ON quick_replies(tenant_id, LOWER(titulo));
