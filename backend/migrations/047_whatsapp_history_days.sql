-- WhatsApp history window configurable via system settings.

ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS whatsapp_history_days INTEGER NOT NULL DEFAULT 30;

UPDATE system_settings
SET whatsapp_history_days = COALESCE(whatsapp_history_days, 30)
WHERE id = 1;
