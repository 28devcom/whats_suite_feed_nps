CREATE TABLE IF NOT EXISTS dashboard_audit_logs (
  id            bigserial PRIMARY KEY,
  user_id       uuid        NOT NULL,
  endpoint      text        NOT NULL,
  fecha_inicio  date        NOT NULL,
  fecha_fin     date        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_audit_logs_user_date ON dashboard_audit_logs (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_audit_logs_endpoint ON dashboard_audit_logs (endpoint);
