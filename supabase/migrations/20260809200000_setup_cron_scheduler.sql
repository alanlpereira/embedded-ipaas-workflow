-- Supabase Cloud Migration: Setup Continuous 24/7 Workflow Scheduler Cron Ticker
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover agendamento anterior se existir para evitar duplicidade
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('workflow-scheduler-ticker') FROM cron.job WHERE jobname = 'workflow-scheduler-ticker';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Agendar chamada a cada 1 minuto na infraestrutura Supabase Cloud (Servidor 24/7)
SELECT cron.schedule(
  'workflow-scheduler-ticker',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wurfruxigmajgnqsyleq.supabase.co/functions/v1/workflow-scheduler',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
