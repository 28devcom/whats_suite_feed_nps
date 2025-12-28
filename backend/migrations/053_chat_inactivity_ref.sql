-- Referencia del mensaje usado para aviso de inactividad
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS inactivity_warning_for_ts TIMESTAMPTZ;
