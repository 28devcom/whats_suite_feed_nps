-- Flags para habilitar/disablear avisos y autocierre por inactividad
ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS inactivity_warning_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS inactivity_autoclose_enabled BOOLEAN NOT NULL DEFAULT FALSE;
