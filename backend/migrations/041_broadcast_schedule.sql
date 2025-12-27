-- Ventanas horarias para campañas de broadcast (inicio/fin).
ALTER TABLE broadcast_campaigns
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stop_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_start_stop ON broadcast_campaigns(start_at, stop_at);
