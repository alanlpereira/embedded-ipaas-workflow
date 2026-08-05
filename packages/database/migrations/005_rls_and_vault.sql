-- ============================================================================
-- Migration 005: Multi-Tenant Row Level Security (RLS) & Supabase Vault Setup
-- Description: Enables strict RLS on all database tables and creates policies
-- ============================================================================

-- 1. Habilitar a extensão pgsodium e Supabase Vault se não estiverem ativas
CREATE EXTENSION IF NOT EXISTS "pgsodium";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- 2. Habilitar RLS em todas as tabelas do sistema
ALTER TABLE IF EXISTS public.flowcharts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.approval_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.media_callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_activities ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- POLÍTICAS ESTRIITAS DE ROW LEVEL SECURITY (RLS) POR ORGANIZATION_ID
-- ----------------------------------------------------------------------------

-- Limpar políticas legadas se existirem
DROP POLICY IF EXISTS "Tenant Isolation for Flowcharts" ON public.flowcharts;
DROP POLICY IF EXISTS "Tenant Isolation for Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Tenant Isolation for Activity Logs" ON public.organization_activities;

-- Política RLS para Flowcharts (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Tenant Isolation for Flowcharts"
ON public.flowcharts
FOR ALL
USING (
  organization_id = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Master'
);

-- Política RLS para Perfis de Usuários
CREATE POLICY "Tenant Isolation for Profiles"
ON public.profiles
FOR ALL
USING (
  organization_id = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Master'
);

-- Política RLS para Logs de Atividades e Auditoria
CREATE POLICY "Tenant Isolation for Activity Logs"
ON public.organization_activities
FOR ALL
USING (
  organization_id = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Master'
);
