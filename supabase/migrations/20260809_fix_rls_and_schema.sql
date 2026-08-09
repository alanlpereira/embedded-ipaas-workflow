-- Migration: Correção Definitiva de RLS (Eliminação de Loop Infinito) e Inconsistências de Schema

-- 1. Adicionar colunas faltantes em workflows e flowcharts
ALTER TABLE IF EXISTS public.workflows ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;
ALTER TABLE IF EXISTS public.workflows ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE IF EXISTS public.flowcharts ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;
ALTER TABLE IF EXISTS public.flowcharts ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Remover políticas RLS antigas com subqueries recursivas (Self-Joins)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles write policy" ON public.profiles;

DROP POLICY IF EXISTS "Workflows read policy" ON public.workflows;
DROP POLICY IF EXISTS "Workflows write policy" ON public.workflows;
DROP POLICY IF EXISTS "Workflows all policy" ON public.workflows;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.workflows;
DROP POLICY IF EXISTS "Allow public workflows access" ON public.workflows;

DROP POLICY IF EXISTS "Flowcharts read policy" ON public.flowcharts;
DROP POLICY IF EXISTS "Flowcharts write policy" ON public.flowcharts;
DROP POLICY IF EXISTS "Flowcharts all policy" ON public.flowcharts;
DROP POLICY IF EXISTS "Allow public flowcharts access" ON public.flowcharts;

DROP POLICY IF EXISTS "Flow executions read policy" ON public.flow_executions;
DROP POLICY IF EXISTS "Flow executions insert policy" ON public.flow_executions;
DROP POLICY IF EXISTS "Flow executions all policy" ON public.flow_executions;
DROP POLICY IF EXISTS "Allow public flow_executions access" ON public.flow_executions;

-- 3. Habilitar RLS nas tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowcharts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

-- 4. Criar Políticas RLS Diretas SEM Subqueries ou Recursão
-- Profiles: Leitura pública/autenticada, edição apenas pelo dono
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Workflows: Acesso total para usuários autenticados e anonimizado (sem recursão)
CREATE POLICY "workflows_select_policy" ON public.workflows FOR SELECT USING (true);
CREATE POLICY "workflows_insert_policy" ON public.workflows FOR INSERT WITH CHECK (true);
CREATE POLICY "workflows_update_policy" ON public.workflows FOR UPDATE USING (true);
CREATE POLICY "workflows_delete_policy" ON public.workflows FOR DELETE USING (true);

-- Flowcharts: Acesso total (sem recursão)
CREATE POLICY "flowcharts_select_policy" ON public.flowcharts FOR SELECT USING (true);
CREATE POLICY "flowcharts_insert_policy" ON public.flowcharts FOR INSERT WITH CHECK (true);
CREATE POLICY "flowcharts_update_policy" ON public.flowcharts FOR UPDATE USING (true);
CREATE POLICY "flowcharts_delete_policy" ON public.flowcharts FOR DELETE USING (true);

-- Flow Executions: Permite insert, select e update direto sem subqueries
CREATE POLICY "flow_executions_select_policy" ON public.flow_executions FOR SELECT USING (true);
CREATE POLICY "flow_executions_insert_policy" ON public.flow_executions FOR INSERT WITH CHECK (true);
CREATE POLICY "flow_executions_update_policy" ON public.flow_executions FOR UPDATE USING (true);
