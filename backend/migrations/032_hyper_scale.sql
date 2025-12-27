-- Hyper-scale redesign for messages, audit logs, media files and chat assignment reporting.
-- Focus: partitioning by time, composite indexes for hot paths, and JSONB GIN indexes.

-- 1) Prepare message child tables for composite FK against partitioned messages (add message_created_at)
ALTER TABLE message_payloads ADD COLUMN IF NOT EXISTS message_created_at TIMESTAMPTZ;
ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS message_created_at TIMESTAMPTZ;
ALTER TABLE message_events ADD COLUMN IF NOT EXISTS message_created_at TIMESTAMPTZ;

UPDATE message_payloads mp
SET message_created_at = m.created_at
FROM messages m
WHERE mp.message_id = m.id
  AND mp.message_created_at IS NULL;

UPDATE message_attachments ma
SET message_created_at = m.created_at
FROM messages m
WHERE ma.message_id = m.id
  AND ma.message_created_at IS NULL;

UPDATE message_events me
SET message_created_at = m.created_at
FROM messages m
WHERE me.message_id = m.id
  AND me.message_created_at IS NULL;

-- Drop legacy FKs (will be recreated against partitioned messages)
ALTER TABLE message_payloads DROP CONSTRAINT IF EXISTS message_payloads_message_id_fkey;
ALTER TABLE message_attachments DROP CONSTRAINT IF EXISTS message_attachments_message_id_fkey;
ALTER TABLE message_events DROP CONSTRAINT IF EXISTS message_events_message_id_fkey;

-- 2) Transition messages table to composite PK (id, created_at) ahead of partitioning
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE messages ADD CONSTRAINT messages_default_pk PRIMARY KEY (id, created_at);
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_external_id_key;
ALTER TABLE messages ADD CONSTRAINT messages_default_external_unique UNIQUE (conversation_id, external_id, created_at);

-- 3) Partitioned messages table (monthly)
ALTER TABLE messages RENAME TO messages_default;

-- remove non-partitioned indexes to avoid name clashes
DROP INDEX IF EXISTS idx_messages_conv_created;
DROP INDEX IF EXISTS idx_messages_status;

-- Align constraint names on default partition to match partitioned parent (compatible with init scripts)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_direction_check') THEN
    EXECUTE 'ALTER TABLE messages_default RENAME CONSTRAINT messages_direction_check TO messages_direction_chk';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_type_check') THEN
    EXECUTE 'ALTER TABLE messages_default RENAME CONSTRAINT messages_type_check TO messages_type_chk';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_status_check') THEN
    EXECUTE 'ALTER TABLE messages_default RENAME CONSTRAINT messages_status_check TO messages_status_chk';
  END IF;
END $$;

-- Ensure child has the same check constraints as parent (needed before ATTACH)
DO $$
BEGIN
  BEGIN
    ALTER TABLE messages_default ADD CONSTRAINT messages_direction_chk CHECK (direction IN ('inbound','outbound'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TABLE messages_default ADD CONSTRAINT messages_type_chk CHECK (message_type IN ('text','media','location','contact','system'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TABLE messages_default ADD CONSTRAINT messages_status_chk CHECK (status IN ('received','processed','delivered','failed'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE TABLE messages (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    external_id VARCHAR(255),
    direction VARCHAR(16) NOT NULL,
    sender VARCHAR(255),
    recipient VARCHAR(255),
    message_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'received',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT messages_pk PRIMARY KEY (id, created_at),
    CONSTRAINT messages_direction_chk CHECK (direction IN ('inbound','outbound')),
    CONSTRAINT messages_type_chk CHECK (message_type IN ('text','media','location','contact','system')),
    CONSTRAINT messages_status_chk CHECK (status IN ('received','processed','delivered','failed')),
    CONSTRAINT messages_external_unique UNIQUE (conversation_id, external_id, created_at)
) PARTITION BY RANGE (created_at);

-- Attach existing data as default partition
ALTER TABLE messages ATTACH PARTITION messages_default DEFAULT;

-- Partitioned indexes for hot paths
CREATE INDEX IF NOT EXISTS idx_messages_id ON messages(id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status_created ON messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_direction_created ON messages(direction, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_external_created ON messages(external_id, created_at DESC);

-- Create monthly partitions (current data window + 3 months forward)
DO $$
DECLARE
    start_month DATE;
    end_month DATE;
    part_start DATE;
    part_end DATE;
    part_name TEXT;
BEGIN
    SELECT date_trunc('month', COALESCE(MIN(created_at), NOW()))::date INTO start_month FROM messages_default;
    end_month := date_trunc('month', NOW() + INTERVAL '3 months')::date;
    part_start := start_month;

    WHILE part_start <= end_month LOOP
        part_end := (part_start + INTERVAL '1 month')::date;
        part_name := format('messages_%s', to_char(part_start, 'YYYY_MM'));
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF messages FOR VALUES FROM (%L) TO (%L);',
            part_name, part_start, part_end
        );
        part_start := part_end;
    END LOOP;
END $$;

-- Move existing rows from default into month partitions to enable pruning
DO $$
DECLARE
    move_start DATE;
    move_end DATE;
BEGIN
    SELECT date_trunc('month', MIN(created_at))::date INTO move_start FROM messages_default;
    IF move_start IS NULL THEN
        RETURN;
    END IF;
    move_end := date_trunc('month', NOW() + INTERVAL '1 month')::date;

    WHILE move_start < move_end LOOP
        EXECUTE format(
            'WITH moved AS (DELETE FROM messages_default WHERE created_at >= %L AND created_at < %L RETURNING *) INSERT INTO messages SELECT * FROM moved;',
            move_start, move_start + INTERVAL '1 month'
        );
        move_start := move_start + INTERVAL '1 month';
    END LOOP;
END $$;

-- 4) Reinstate constraints and triggers for child tables against partitioned messages
CREATE OR REPLACE FUNCTION set_message_created_at() RETURNS TRIGGER AS $$
DECLARE
    v_created_at TIMESTAMPTZ;
BEGIN
    IF NEW.message_id IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT created_at INTO v_created_at FROM messages WHERE id = NEW.message_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'message % not found when setting message_created_at', NEW.message_id;
    END IF;
    NEW.message_created_at := v_created_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

ALTER TABLE message_payloads ALTER COLUMN message_created_at SET NOT NULL;
ALTER TABLE message_attachments ALTER COLUMN message_created_at SET NOT NULL;
ALTER TABLE message_events ALTER COLUMN message_created_at SET NOT NULL;

ALTER TABLE message_payloads
    ADD CONSTRAINT message_payloads_message_fk
        FOREIGN KEY (message_id, message_created_at) REFERENCES messages(id, created_at) ON DELETE CASCADE;
ALTER TABLE message_attachments
    ADD CONSTRAINT message_attachments_message_fk
        FOREIGN KEY (message_id, message_created_at) REFERENCES messages(id, created_at) ON DELETE CASCADE;
ALTER TABLE message_events
    ADD CONSTRAINT message_events_message_fk
        FOREIGN KEY (message_id, message_created_at) REFERENCES messages(id, created_at) ON DELETE CASCADE;

-- Rebuild supporting indexes with the new composite FK shape
DROP INDEX IF EXISTS idx_message_attachments_msg;
CREATE INDEX IF NOT EXISTS idx_message_attachments_msg ON message_attachments(message_id, message_created_at);

DROP INDEX IF EXISTS idx_message_events_msg_created;
CREATE INDEX IF NOT EXISTS idx_message_events_msg_created ON message_events(message_id, message_created_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_payloads_msg ON message_payloads(message_id, message_created_at);
CREATE INDEX IF NOT EXISTS idx_message_payloads_content_gin ON message_payloads USING GIN (content jsonb_path_ops);

-- 5) Audit logs partitioned monthly
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_default_pk PRIMARY KEY (id, created_at);

ALTER TABLE audit_logs RENAME TO audit_logs_default;

DROP INDEX IF EXISTS idx_audit_logs_user;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_resource;

CREATE TABLE audit_logs (
    id BIGINT NOT NULL DEFAULT nextval('audit_logs_id_seq'),
    user_id UUID REFERENCES users(id),
    action VARCHAR(128) NOT NULL,
    resource VARCHAR(128),
    resource_id VARCHAR(128),
    ip INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT audit_logs_pk PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

ALTER SEQUENCE IF EXISTS audit_logs_id_seq OWNED BY audit_logs.id;

-- Align constraints on default partition with parent (keep distinct index names to avoid conflicts)
DO $$
BEGIN
  NULL;
END $$;

ALTER TABLE audit_logs ATTACH PARTITION audit_logs_default DEFAULT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_created ON audit_logs(resource, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata jsonb_path_ops);

DO $$
DECLARE
    start_month DATE;
    end_month DATE;
    part_start DATE;
    part_end DATE;
    part_name TEXT;
BEGIN
    SELECT date_trunc('month', COALESCE(MIN(created_at), NOW()))::date INTO start_month FROM audit_logs_default;
    end_month := date_trunc('month', NOW() + INTERVAL '3 months')::date;
    part_start := start_month;

    WHILE part_start <= end_month LOOP
        part_end := (part_start + INTERVAL '1 month')::date;
        part_name := format('audit_logs_%s', to_char(part_start, 'YYYY_MM'));
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L);',
            part_name, part_start, part_end
        );
        part_start := part_end;
    END LOOP;
END $$;

DO $$
DECLARE
    move_start DATE;
    move_end DATE;
BEGIN
    SELECT date_trunc('month', MIN(created_at))::date INTO move_start FROM audit_logs_default;
    IF move_start IS NULL THEN
        RETURN;
    END IF;
    move_end := date_trunc('month', NOW() + INTERVAL '1 month')::date;

    WHILE move_start < move_end LOOP
        EXECUTE format(
            'WITH moved AS (DELETE FROM audit_logs_default WHERE created_at >= %L AND created_at < %L RETURNING *) INSERT INTO audit_logs SELECT * FROM moved;',
            move_start, move_start + INTERVAL '1 month'
        );
        move_start := move_start + INTERVAL '1 month';
    END LOOP;
END $$;

-- 6) Media files partitioned yearly, synced from message_attachments
CREATE TABLE IF NOT EXISTS media_files (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    message_created_at TIMESTAMPTZ NOT NULL,
    chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
    whatsapp_session_name VARCHAR(255),
    remote_number VARCHAR(32),
    file_name TEXT NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_url TEXT NOT NULL,
    checksum VARCHAR(128),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT media_files_pk PRIMARY KEY (id, created_at),
    CONSTRAINT media_files_message_fk FOREIGN KEY (message_id, message_created_at) REFERENCES messages(id, created_at) ON DELETE CASCADE
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_media_files_message ON media_files(message_id, message_created_at);
CREATE INDEX IF NOT EXISTS idx_media_files_chat_created ON media_files(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_files_session_created ON media_files(whatsapp_session_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_files_checksum ON media_files(checksum);
CREATE INDEX IF NOT EXISTS idx_media_files_metadata_gin ON media_files USING GIN (metadata jsonb_path_ops);

DO $$
DECLARE
    start_year DATE;
    end_year DATE := date_trunc('year', NOW() + INTERVAL '2 years')::date;
    part_start DATE;
    part_end DATE;
    part_name TEXT;
BEGIN
    SELECT date_trunc('year', COALESCE((SELECT MIN(created_at) FROM message_attachments), NOW()))::date INTO start_year;
    part_start := start_year;

    WHILE part_start <= end_year LOOP
        part_end := (part_start + INTERVAL '1 year')::date;
        part_name := format('media_files_%s', to_char(part_start, 'YYYY'));
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF media_files FOR VALUES FROM (%L) TO (%L);',
            part_name, part_start, part_end
        );
        part_start := part_end;
    END LOOP;
END $$;

-- Backfill existing attachments into media_files
INSERT INTO media_files (id, message_id, message_created_at, file_name, mime_type, size_bytes, storage_url, checksum, created_at, updated_at)
SELECT ma.id, ma.message_id, ma.message_created_at, ma.file_name, ma.mime_type, ma.size_bytes, ma.storage_url, ma.checksum, ma.created_at, ma.created_at
FROM message_attachments ma
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION sync_media_files_from_attachments() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM media_files WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    IF NEW.message_created_at IS NULL THEN
        SELECT created_at INTO NEW.message_created_at FROM messages WHERE id = NEW.message_id;
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

DROP TRIGGER IF EXISTS trg_message_attachments_sync_media_files ON message_attachments;
CREATE TRIGGER trg_message_attachments_sync_media_files
AFTER INSERT OR UPDATE OR DELETE ON message_attachments
FOR EACH ROW EXECUTE FUNCTION sync_media_files_from_attachments();

-- 7) Additional indexes for chat-level scalability
CREATE INDEX IF NOT EXISTS idx_chats_status_queue_last ON chats(status, queue_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_session_remote_last ON chats(whatsapp_session_name, remote_jid, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_assignment_chat_created ON chat_assignment_audit(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_assignment_created_by ON chat_assignment_audit(executed_by_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created ON chat_messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_gin ON chat_messages USING GIN (content jsonb_path_ops);
