-- RPC para inspecionar agendamentos ativos no pg_cron
CREATE OR REPLACE FUNCTION public.get_cron_status()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean,
  jobname text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jobid, schedule, command, nodename, nodeport, database, username, active, jobname
  FROM cron.job;
$$;

GRANT EXECUTE ON FUNCTION public.get_cron_status() TO anon, authenticated, service_role;
