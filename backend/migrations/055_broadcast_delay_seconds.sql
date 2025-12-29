-- Normaliza los campos de delay a segundos (antes milisegundos) de forma idempotente.
DO $$
BEGIN
  -- Renombrar columnas si aún existen con sufijo _ms
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'broadcast_campaigns' AND column_name = 'delay_min_ms'
  ) THEN
    ALTER TABLE broadcast_campaigns RENAME COLUMN delay_min_ms TO delay_min_seconds;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'broadcast_campaigns' AND column_name = 'delay_max_ms'
  ) THEN
    ALTER TABLE broadcast_campaigns RENAME COLUMN delay_max_ms TO delay_max_seconds;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'broadcast_campaigns' AND column_name = 'last_delay_ms'
  ) THEN
    ALTER TABLE broadcast_campaigns RENAME COLUMN last_delay_ms TO last_delay_seconds;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'broadcast_messages' AND column_name = 'delay_ms'
  ) THEN
    ALTER TABLE broadcast_messages RENAME COLUMN delay_ms TO delay_seconds;
  END IF;

  -- Ajustar valores: si siguen en ms, convertir; si ya están en segundos, deja como está.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'broadcast_campaigns' AND column_name = 'delay_min_seconds'
  ) THEN
    UPDATE broadcast_campaigns
    SET delay_min_seconds = CASE WHEN delay_min_seconds > 300000 THEN ROUND(delay_min_seconds::numeric / 1000) ELSE delay_min_seconds END,
        delay_max_seconds = CASE WHEN delay_max_seconds > 300000 THEN ROUND(delay_max_seconds::numeric / 1000) ELSE delay_max_seconds END,
        last_delay_seconds = CASE
          WHEN last_delay_seconds IS NULL THEN NULL
          WHEN last_delay_seconds > 300000 THEN ROUND(last_delay_seconds::numeric / 1000)
          ELSE last_delay_seconds
        END;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'broadcast_messages' AND column_name = 'delay_seconds'
  ) THEN
    UPDATE broadcast_messages
    SET delay_seconds = CASE
      WHEN delay_seconds IS NULL THEN NULL
      WHEN delay_seconds > 300000 THEN ROUND(delay_seconds::numeric / 1000)
      ELSE delay_seconds
    END;
  END IF;
END $$;

COMMENT ON COLUMN broadcast_campaigns.delay_min_seconds IS 'Intervalo mínimo entre mensajes (segundos)';
COMMENT ON COLUMN broadcast_campaigns.delay_max_seconds IS 'Intervalo máximo entre mensajes (segundos)';
COMMENT ON COLUMN broadcast_campaigns.last_delay_seconds IS 'Último delay usado (segundos)';
COMMENT ON COLUMN broadcast_messages.delay_seconds IS 'Delay usado para este envío (segundos)';
