-- Migration: Agendador Contínuo via pg_cron & pg_net para Edge Function workflow-scheduler
-- Execute este script no SQL Editor do Supabase Cloud (https://supabase.com)

-- 1. Habilitar as extensões de sistema necessárias no PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remover agendamento anterior se já existir (para evitar duplicatas)
SELECT cron.unschedule('workflow-ticker') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'workflow-ticker'
);

-- 3. Agendar o job 'workflow-ticker' para rodar a cada minuto ('* * * * *')
-- IMPORTANTE: Substitua os placeholders abaixo no seu projeto Supabase:
--   - [SEU_PROJETO]: O código do projeto Supabase (ex: xyzabc123)
--   - [CHAVE_ANON]: A chave de API pública (Anon Key) ou Service Role Key do projeto
SELECT cron.schedule(
    'workflow-ticker',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := 'https://[SEU_PROJETO].supabase.co/functions/v1/workflow-scheduler',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer [CHAVE_ANON]"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);
