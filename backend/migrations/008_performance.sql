-- BRIN indexes for time-series tables (millions of rows)
CREATE INDEX IF NOT EXISTS brin_messages_created_at ON messages USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS brin_message_events_created_at ON message_events USING BRIN (created_at);
CREATE INDEX IF NOT EXISTS brin_auth_events_created_at ON auth_events USING BRIN (created_at);

-- Partial indexes for common filters
CREATE INDEX IF NOT EXISTS idx_messages_status_received ON messages (conversation_id, created_at DESC) WHERE status = 'received';
CREATE INDEX IF NOT EXISTS idx_message_events_type ON message_events (event_type, created_at DESC);

-- Partitioning example for future rollovers (manual creation per month)
-- CREATE TABLE messages_y2025m01 PARTITION OF messages FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- CREATE TABLE message_events_y2025m01 PARTITION OF message_events FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
