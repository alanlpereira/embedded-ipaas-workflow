-- Migration: Tabela de Atividades da Organização & Políticas de RLS Estritas
CREATE TABLE IF NOT EXISTS public.organization_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS na tabela organization_activities
ALTER TABLE public.organization_activities ENABLE ROW LEVEL SECURITY;

-- Política de Leitura Isolada por Tenant (organization_id)
DROP POLICY IF EXISTS "Usuários leem apenas atividades da própria organização" ON public.organization_activities;
CREATE POLICY "Usuários leem apenas atividades da própria organização"
ON public.organization_activities FOR SELECT
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Inserir dados de demonstração no feed de atividades
INSERT INTO public.organization_activities (organization_id, user_email, user_name, action, details, created_at)
VALUES
(
    'org-alp-nexus',
    'alan.pereira@alp-nexus.com',
    'Alan Pereira',
    'CREATED_FLOW',
    'Criou o fluxograma "Integração Webhook & CRM B2B"',
    NOW() - INTERVAL '2 hours'
),
(
    'org-alp-nexus',
    'alan.pereira@alp-nexus.com',
    'Alan Pereira',
    'EXECUTED_FLOW',
    'Executou o fluxo de Webhook com sucesso (Status: COMPLETED)',
    NOW() - INTERVAL '1 hour'
),
(
    'org-client-acme',
    'admin@acme.com',
    'Carlos Acme',
    'MEMBER_ADDED',
    'Convidou o usuário "viewer@acme.com" como Viewer',
    NOW() - INTERVAL '3 hours'
),
(
    'org-client-stark',
    'tony@stark.com',
    'Tony Stark',
    'UPDATED_FLOW',
    'Publicou a versão v3 do fluxo de Onboarding',
    NOW() - INTERVAL '30 minutes'
);
