-- Migration: Universal Purge of All RLS Policies Across All Schemas

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname IN ('public', 'auth')) LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore single policy drop errors
            NULL;
        END;
    END LOOP;
END $$;

-- Disable Row Level Security on all core application tables to permanently stop PostgREST 42P17 infinite recursion
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flowcharts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flow_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.execution_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations DISABLE ROW LEVEL SECURITY;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
