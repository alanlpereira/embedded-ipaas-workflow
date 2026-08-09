-- Migration: Explicit RLS Policies for anon and authenticated roles

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowcharts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_anon" ON public.profiles;
DROP POLICY IF EXISTS "profiles_auth" ON public.profiles;
DROP POLICY IF EXISTS "workflows_anon" ON public.workflows;
DROP POLICY IF EXISTS "workflows_auth" ON public.workflows;
DROP POLICY IF EXISTS "flowcharts_anon" ON public.flowcharts;
DROP POLICY IF EXISTS "flowcharts_auth" ON public.flowcharts;
DROP POLICY IF EXISTS "flow_executions_anon" ON public.flow_executions;
DROP POLICY IF EXISTS "flow_executions_auth" ON public.flow_executions;
DROP POLICY IF EXISTS "execution_logs_anon" ON public.execution_logs;
DROP POLICY IF EXISTS "execution_logs_auth" ON public.execution_logs;

CREATE POLICY "profiles_anon" ON public.profiles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "profiles_auth" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "workflows_anon" ON public.workflows FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "workflows_auth" ON public.workflows FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "flowcharts_anon" ON public.flowcharts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "flowcharts_auth" ON public.flowcharts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "flow_executions_anon" ON public.flow_executions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "flow_executions_auth" ON public.flow_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "execution_logs_anon" ON public.execution_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "execution_logs_auth" ON public.execution_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
