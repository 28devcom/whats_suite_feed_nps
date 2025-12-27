-- Aggregated tables for dashboard with yearly/monthly partitioning
-- Requires: Postgres 12+ partitioning

-- Drop if exists for idempotency in dev
DROP TABLE IF EXISTS dashboard_messages_daily CASCADE;
DROP TABLE IF EXISTS dashboard_chats_daily CASCADE;

-- Parent tables
CREATE TABLE dashboard_messages_daily (
  date_key      date        NOT NULL,
  queue_id      uuid        NOT NULL,
  agent_id      uuid        NULL,
  status        varchar(32) NULL,
  total_mensajes bigint     NOT NULL DEFAULT 0,
  mensajes_in    bigint     NOT NULL DEFAULT 0,
  mensajes_out   bigint     NOT NULL DEFAULT 0,
  archivos_out   bigint     NOT NULL DEFAULT 0,
  audios_out     bigint     NOT NULL DEFAULT 0,
  PRIMARY KEY (date_key, queue_id, agent_id)
) PARTITION BY RANGE (date_key);

CREATE TABLE dashboard_chats_daily (
  date_key      date        NOT NULL,
  queue_id      uuid        NOT NULL,
  agent_id      uuid        NULL,
  status        varchar(32) NULL,
  total_chats   bigint      NOT NULL DEFAULT 0,
  total_abiertos bigint     NOT NULL DEFAULT 0,
  total_cerrados bigint     NOT NULL DEFAULT 0,
  avg_tiempo_respuesta_secs numeric(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (date_key, queue_id, agent_id)
) PARTITION BY RANGE (date_key);

-- Example partitions (create per month as needed)
CREATE TABLE dashboard_messages_daily_y2025m01 PARTITION OF dashboard_messages_daily
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE dashboard_chats_daily_y2025m01 PARTITION OF dashboard_chats_daily
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Indexes for partition parents (applied to partitions)
CREATE INDEX idx_dashboard_messages_daily_date_queue_agent_status ON dashboard_messages_daily (date_key, queue_id, agent_id, status);
CREATE INDEX idx_dashboard_chats_daily_date_queue_agent_status ON dashboard_chats_daily (date_key, queue_id, agent_id, status);

-- Helper function to create partitions dynamically (optional)
CREATE OR REPLACE FUNCTION create_dashboard_partitions(p_year int, p_month int) RETURNS void AS $$
DECLARE
  next_month int := p_month + 1;
  next_year int := p_year;
  part_msgs text;
  part_chats text;
  start_date date := make_date(p_year, p_month, 1);
  end_date   date;
BEGIN
  IF next_month = 13 THEN
    next_month := 1;
    next_year := p_year + 1;
  END IF;
  end_date := make_date(next_year, next_month, 1);

  part_msgs := format('dashboard_messages_daily_y%sm%s', p_year, lpad(p_month::text, 2, '0'));
  part_chats := format('dashboard_chats_daily_y%sm%s', p_year, lpad(p_month::text, 2, '0'));

  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF dashboard_messages_daily FOR VALUES FROM (%L) TO (%L);',
    part_msgs, start_date, end_date);

  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF dashboard_chats_daily FOR VALUES FROM (%L) TO (%L);',
    part_chats, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Pre-create current month partition
SELECT create_dashboard_partitions(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int);
