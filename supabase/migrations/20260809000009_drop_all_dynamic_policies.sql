-- Migration: Drop all dynamic RLS policies on profiles, workflows, flowcharts, and flow_executions

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all policies on profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles;', r.policyname);
    END LOOP;
    
    -- Drop all policies on workflows
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workflows' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.workflows;', r.policyname);
    END LOOP;
    
    -- Drop all policies on flowcharts
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'flowcharts' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.flowcharts;', r.policyname);
    END LOOP;
    
    -- Drop all policies on flow_executions
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'flow_executions' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.flow_executions;', r.policyname);
    END LOOP;
END $$;

-- Disable RLS on profiles to completely stop 42P17 recursion
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Create ultra-simple non-recursive policies for workflows, flowcharts and flow_executions
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowcharts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflows_global_access" ON public.workflows FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "flowcharts_global_access" ON public.flowcharts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "flow_executions_global_access" ON public.flow_executions FOR ALL TO public USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
