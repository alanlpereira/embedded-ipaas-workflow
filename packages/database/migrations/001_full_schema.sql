-- ============================================================================
-- SYNAPSE EMBEDDED iPAAS - COMPLETE DATABASE SCHEMA & MIGRATIONS
-- Execute este script no SQL Editor do Supabase Cloud (https://supabase.com)
-- ============================================================================

-- 1. EXTENSÕES DO POSTGRES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgsodium";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- 2. ENUM DE NÍVEIS DE ACESSO (USER ROLES)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Master', 'Admin', 'Member', 'Viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABELA DE ORGANIZAÇÕES (MULTI-TENANT & EDIÇÕES)
CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT,
    plan_tier TEXT DEFAULT 'Synapse' CHECK (plan_tier IN ('Forge', 'Kinex', 'Axiom', 'Synapse')),
    ai_tokens_limit INT DEFAULT 1000000,
    custom_token_override INT DEFAULT 0,
    ai_tokens_used INT DEFAULT 142000,
    active_status BOOLEAN DEFAULT true,
    primary_color TEXT DEFAULT '#00f2fe',
    logo_url TEXT,
    custom_domain TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'Viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABELA DE FLUXOGRAMAS (React Flow Graph Nodes & Edges)
CREATE TABLE IF NOT EXISTS public.flowcharts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABELA DE LOGS DE AUDITORIA & ERROS DE EXECUÇÃO
CREATE TABLE IF NOT EXISTS public.execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flowchart_id TEXT NOT NULL REFERENCES public.flowcharts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'WAITING_APPROVAL')),
    failed_node_id TEXT,
    error_message TEXT,
    execution_trace JSONB NOT NULL DEFAULT '[]'::jsonb,
    trigger_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

-- 7. TABELA DE TOKENS DE APROVAÇÃO (HITL - Human-in-the-Loop)
CREATE TABLE IF NOT EXISTS public.approval_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    flowchart_id TEXT NOT NULL REFERENCES public.flowcharts(id) ON DELETE CASCADE,
    approval_node_id TEXT NOT NULL,
    assignee_email TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    responded_at TIMESTAMPTZ
);

-- 8. TABELA DE TOKENS DE DEMO MÁGICA (7 DIAS)
CREATE TABLE IF NOT EXISTS public.demo_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    admin_id TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. TABELA DE ATIVIDADES E AUDITORIA DA ORGANIZAÇÃO
CREATE TABLE IF NOT EXISTS public.organization_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. ÍNDICES DE DESEMPENHO
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_flowcharts_organization_id ON public.flowcharts(organization_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_flowchart ON public.execution_logs(flowchart_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_token ON public.approval_tokens(token);
CREATE INDEX IF NOT EXISTS idx_demo_tokens_token ON public.demo_tokens(token);

-- 11. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowcharts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_activities ENABLE ROW LEVEL SECURITY;

-- 12. POLÍTICAS RLS DE ISOLAMENTO POR TENANT (ORGANIZATION_ID)
DROP POLICY IF EXISTS "Tenant Isolation for Flowcharts" ON public.flowcharts;
CREATE POLICY "Tenant Isolation for Flowcharts" ON public.flowcharts FOR ALL
USING (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Master'
);

DROP POLICY IF EXISTS "Tenant Isolation for Profiles" ON public.profiles;
CREATE POLICY "Tenant Isolation for Profiles" ON public.profiles FOR ALL
USING (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Master'
);

DROP POLICY IF EXISTS "Tokens de aprovação públicos" ON public.approval_tokens;
CREATE POLICY "Tokens de aprovação públicos" ON public.approval_tokens FOR ALL USING (true);

DROP POLICY IF EXISTS "Demo tokens públicos" ON public.demo_tokens;
CREATE POLICY "Demo tokens públicos" ON public.demo_tokens FOR ALL USING (true);

-- 13. DADOS INICIAIS DA ORGANIZAÇÃO MASTER
INSERT INTO public.organizations (id, name, slug, plan_tier, ai_tokens_limit, primary_color, custom_domain)
VALUES (
    'org-alp-nexus',
    'ALP Nexus Enterprise (Matriz)',
    'alp-nexus',
    'Synapse',
    1000000,
    '#00f2fe',
    'synapse.alp-nexus.com'
) ON CONFLICT (id) DO UPDATE SET plan_tier = 'Synapse', primary_color = '#00f2fe';
