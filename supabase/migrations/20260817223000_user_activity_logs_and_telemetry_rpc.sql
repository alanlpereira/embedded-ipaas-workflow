-- 1. Tabela user_activity_logs (Event Sourcing)
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text CHECK (event_type IN ('email_sent', 'whatsapp_summary', 'document_generated', 'ai_command', 'help_interaction')),
  token_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_date ON public.user_activity_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_event_type ON public.user_activity_logs(event_type);

-- 3. Row Level Security (RLS)
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master users can view all activity logs" ON public.user_activity_logs;
CREATE POLICY "Master users can view all activity logs"
  ON public.user_activity_logs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can insert activity logs" ON public.user_activity_logs;
CREATE POLICY "Service role can insert activity logs"
  ON public.user_activity_logs FOR INSERT
  WITH CHECK (true);

GRANT ALL ON public.user_activity_logs TO anon, authenticated, service_role;

-- 4. Função RPC get_user_telemetry
CREATE OR REPLACE FUNCTION public.get_user_telemetry(
  p_user_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email_sent_count bigint := 0;
  v_whatsapp_summary_count bigint := 0;
  v_document_generated_count bigint := 0;
  v_ai_command_count bigint := 0;
  v_help_interaction_count bigint := 0;
  v_total_tokens_used bigint := 0;
BEGIN
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'email_sent'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'whatsapp_summary'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'document_generated'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'ai_command'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'help_interaction'), 0),
    COALESCE(SUM(token_count), 0)
  INTO
    v_email_sent_count,
    v_whatsapp_summary_count,
    v_document_generated_count,
    v_ai_command_count,
    v_help_interaction_count,
    v_total_tokens_used
  FROM public.user_activity_logs
  WHERE user_id = p_user_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  RETURN json_build_object(
    'user_id', p_user_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'email_sent_count', v_email_sent_count,
    'whatsapp_summary_count', v_whatsapp_summary_count,
    'document_generated_count', v_document_generated_count,
    'ai_command_count', v_ai_command_count,
    'help_interaction_count', v_help_interaction_count,
    'total_tokens_used', v_total_tokens_used
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_telemetry(uuid, timestamptz, timestamptz) TO anon, authenticated, service_role;
