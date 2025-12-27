-- Decouple message model for massive writes and fast reads.
-- Splits into messages_core (IDs/fechas/chat), messages_content (texto/payload/metadata) and messages_status (estado).

-- 1) Renombrar tabla particionada principal a messages_core y extender con chat_id
ALTER TABLE messages RENAME TO messages_core;
ALTER TABLE messages_core ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES chats(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_core_chat_created ON messages_core(chat_id, created_at DESC);

-- 2) Tabla de estado desacoplada (evita writes en core)
CREATE TABLE IF NOT EXISTS messages_status (
    id BIGSERIAL PRIMARY KEY,
    message_id UUID NOT NULL,
    message_created_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL,
    status_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_current BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT messages_status_chk CHECK (status IN ('received','sent','delivered','read','failed','error')),
    CONSTRAINT messages_status_message_fk FOREIGN KEY (message_id, message_created_at) REFERENCES messages_core(id, created_at) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_messages_status_current ON messages_status(message_id) WHERE is_current;
CREATE INDEX IF NOT EXISTS idx_messages_status_status_at ON messages_status(status, status_at DESC) WHERE is_current;
CREATE INDEX IF NOT EXISTS idx_messages_status_message ON messages_status(message_id, status_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status_metadata_gin ON messages_status USING GIN (metadata jsonb_path_ops);

INSERT INTO messages_status (message_id, message_created_at, status, status_at, is_current, metadata)
SELECT mc.id, mc.created_at, COALESCE(mc.status, 'received'), mc.updated_at, true, '{}'::jsonb
FROM messages_core mc
ON CONFLICT DO NOTHING;

ALTER TABLE messages_core DROP CONSTRAINT IF EXISTS messages_status_chk;
ALTER TABLE messages_core DROP COLUMN IF EXISTS status;
DROP INDEX IF EXISTS idx_messages_status_created;
DROP INDEX IF EXISTS idx_messages_status;

-- 3) Tabla de contenido (payload pesado fuera de lecturas frecuentes)
CREATE TABLE IF NOT EXISTS messages_content (
    message_id UUID NOT NULL,
    message_created_at TIMESTAMPTZ NOT NULL,
    content_type VARCHAR(32),
    sender VARCHAR(255),
    recipient VARCHAR(255),
    text_body TEXT,
    payload JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    storage_url TEXT,
    checksum VARCHAR(128),
    size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT messages_content_pk PRIMARY KEY (message_id, message_created_at),
    CONSTRAINT messages_content_message_fk FOREIGN KEY (message_id, message_created_at) REFERENCES messages_core(id, created_at) ON DELETE CASCADE
) PARTITION BY RANGE (message_created_at);

CREATE TABLE IF NOT EXISTS messages_content_default PARTITION OF messages_content DEFAULT;

CREATE INDEX IF NOT EXISTS idx_messages_content_message ON messages_content(message_id, message_created_at);
CREATE INDEX IF NOT EXISTS idx_messages_content_payload_gin ON messages_content USING GIN (payload jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_messages_content_metadata_gin ON messages_content USING GIN (metadata jsonb_path_ops);

DO $$
DECLARE
    start_month DATE;
    end_month DATE;
    part_start DATE;
    part_end DATE;
    part_name TEXT;
BEGIN
    SELECT date_trunc('month', COALESCE((SELECT MIN(created_at) FROM messages_core), NOW()))::date INTO start_month;
    end_month := date_trunc('month', NOW() + INTERVAL '3 months')::date;
    part_start := start_month;

    WHILE part_start <= end_month LOOP
        part_end := (part_start + INTERVAL '1 month')::date;
        part_name := format('messages_content_%s', to_char(part_start, 'YYYY_MM'));
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF messages_content FOR VALUES FROM (%L) TO (%L);',
            part_name, part_start, part_end
        );
        part_start := part_end;
    END LOOP;
END $$;

INSERT INTO messages_content (message_id, message_created_at, content_type, sender, recipient, text_body, payload, metadata, storage_url, checksum, size_bytes, created_at, updated_at)
SELECT mc.id,
       mc.created_at,
       mp.payload_type,
       mc.sender,
       mc.recipient,
       CASE WHEN mc.message_type = 'text' THEN COALESCE(mp.content->>'text', mp.content->>'body') END,
       mp.content,
       jsonb_strip_nulls(jsonb_build_object(
           'payload_type', mp.payload_type,
           'storage_url', mp.storage_url,
           'checksum', mp.checksum,
           'size_bytes', mp.size_bytes
       )),
       mp.storage_url,
       mp.checksum,
       mp.size_bytes,
       mc.created_at,
       mc.updated_at
FROM messages_core mc
LEFT JOIN message_payloads mp ON mp.message_id = mc.id
ON CONFLICT DO NOTHING;

ALTER TABLE messages_core DROP COLUMN IF EXISTS sender;
ALTER TABLE messages_core DROP COLUMN IF EXISTS recipient;

-- 4) Vistas para lecturas rápidas (sin payload) y lecturas completas
CREATE OR REPLACE VIEW messages_compact AS
SELECT mc.id,
       mc.conversation_id,
       mc.chat_id,
       mc.external_id,
       mc.direction,
       mc.message_type,
       mc.created_at,
       mc.updated_at,
       ms.status,
       ms.status_at
FROM messages_core mc
LEFT JOIN LATERAL (
    SELECT status, status_at
    FROM messages_status ms
    WHERE ms.message_id = mc.id AND ms.is_current
    ORDER BY ms.status_at DESC
    LIMIT 1
) ms ON TRUE;

CREATE OR REPLACE VIEW messages_full AS
SELECT mc.id,
       mc.conversation_id,
       mc.chat_id,
       mc.external_id,
       mc.direction,
       mc.message_type,
       mc.created_at,
       mc.updated_at,
       ms.status,
       ms.status_at,
       co.content_type,
       co.sender,
       co.recipient,
       co.text_body,
       co.payload,
       co.metadata AS content_metadata,
       co.storage_url,
       co.checksum,
       co.size_bytes
FROM messages_core mc
LEFT JOIN LATERAL (
    SELECT status, status_at
    FROM messages_status ms
    WHERE ms.message_id = mc.id AND ms.is_current
    ORDER BY ms.status_at DESC
    LIMIT 1
) ms ON TRUE
LEFT JOIN messages_content co ON co.message_id = mc.id AND co.message_created_at = mc.created_at;

-- 5) Ajustar funciones utilitarias para el nuevo nombre de tabla
CREATE OR REPLACE FUNCTION set_message_created_at() RETURNS TRIGGER AS $$
DECLARE
    v_created_at TIMESTAMPTZ;
BEGIN
    IF NEW.message_id IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT created_at INTO v_created_at FROM messages_core WHERE id = NEW.message_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'message % not found when setting message_created_at', NEW.message_id;
    END IF;
    NEW.message_created_at := v_created_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_media_files_from_attachments() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM media_files WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    IF NEW.message_created_at IS NULL THEN
        SELECT created_at INTO NEW.message_created_at FROM messages_core WHERE id = NEW.message_id;
        IF NEW.message_created_at IS NULL THEN
            RAISE EXCEPTION 'message % not found when syncing media_files', NEW.message_id;
        END IF;
    END IF;

    INSERT INTO media_files (id, message_id, message_created_at, chat_id, whatsapp_session_name, remote_number, file_name, mime_type, size_bytes, storage_url, checksum, metadata, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.message_id,
        NEW.message_created_at,
        NULL,
        NULL,
        NULL,
        NEW.file_name,
        NEW.mime_type,
        NEW.size_bytes,
        NEW.storage_url,
        NEW.checksum,
        '{}'::jsonb,
        COALESCE(NEW.created_at, NOW()),
        NOW()
    )
    ON CONFLICT (id, created_at) DO UPDATE
    SET mime_type = EXCLUDED.mime_type,
        size_bytes = EXCLUDED.size_bytes,
        storage_url = EXCLUDED.storage_url,
        checksum = EXCLUDED.checksum,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6) Triggers re-apuntados
DROP TRIGGER IF EXISTS trg_message_payloads_set_created_at ON message_payloads;
CREATE TRIGGER trg_message_payloads_set_created_at
BEFORE INSERT OR UPDATE ON message_payloads
FOR EACH ROW EXECUTE FUNCTION set_message_created_at();

DROP TRIGGER IF EXISTS trg_message_attachments_set_created_at ON message_attachments;
CREATE TRIGGER trg_message_attachments_set_created_at
BEFORE INSERT OR UPDATE ON message_attachments
FOR EACH ROW EXECUTE FUNCTION set_message_created_at();

DROP TRIGGER IF EXISTS trg_message_events_set_created_at ON message_events;
CREATE TRIGGER trg_message_events_set_created_at
BEFORE INSERT OR UPDATE ON message_events
FOR EACH ROW EXECUTE FUNCTION set_message_created_at();

DROP TRIGGER IF EXISTS trg_message_attachments_sync_media_files ON message_attachments;
CREATE TRIGGER trg_message_attachments_sync_media_files
AFTER INSERT OR UPDATE OR DELETE ON message_attachments
FOR EACH ROW EXECUTE FUNCTION sync_media_files_from_attachments();
