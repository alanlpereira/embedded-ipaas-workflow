-- RPC para inspecionar respostas do pg_net
CREATE OR REPLACE FUNCTION public.get_pg_net_status()
RETURNS TABLE (
  id bigint,
  status_code integer,
  error_msg text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, status_code, error_msg
  FROM net._http_response
  ORDER BY id DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.get_pg_net_status() TO anon, authenticated, service_role;
