-- Migration: RLS com escopo explícito TO public / anon / authenticated

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

DROP POLICY IF EXISTS "workflows_select_policy" ON public.workflows;
DROP POLICY IF EXISTS "workflows_insert_policy" ON public.workflows;
DROP POLICY IF EXISTS "workflows_update_policy" ON public.workflows;
DROP POLICY IF EXISTS "workflows_delete_policy" ON public.workflows;

DROP POLICY IF EXISTS "flowcharts_select_policy" ON public.flowcharts;
DROP POLICY IF EXISTS "flowcharts_insert_policy" ON public.flowcharts;
DROP POLICY IF EXISTS "flowcharts_update_policy" ON public.flowcharts;
DROP POLICY IF EXISTS "flowcharts_delete_policy" ON public.flowcharts;

DROP POLICY IF EXISTS "flow_executions_select_policy" ON public.flow_executions;
DROP POLICY IF EXISTS "flow_executions_insert_policy" ON public.flow_executions;
DROP POLICY IF EXISTS "flow_executions_update_policy" ON public.flow_executions;

-- Permissões globais para roles públicas
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO public USING (auth.uid() = id);
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT TO public WITH CHECK (auth.uid() = id);

CREATE POLICY "workflows_all_policy" ON public.workflows FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "flowcharts_all_policy" ON public.flowcharts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "flow_executions_all_policy" ON public.flow_executions FOR ALL TO public USING (true) WITH CHECK (true);
