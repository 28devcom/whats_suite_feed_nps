-- Chat inactivity controls: warning + autocierre
ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS inactivity_warning_minutes INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS inactivity_autoclose_minutes INTEGER NOT NULL DEFAULT 120;

ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS inactivity_warning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inactivity_warning_delivered_at TIMESTAMPTZ;
