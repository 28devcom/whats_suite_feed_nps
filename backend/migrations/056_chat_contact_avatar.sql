-- Añade avatar/foto de perfil del contacto de WhatsApp a los chats.
ALTER TABLE IF EXISTS chats
  ADD COLUMN IF NOT EXISTS remote_avatar_url TEXT;
