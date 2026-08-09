-- Migration: Criar tabela de Tokens de Aprovação (HITL - Human-In-The-Loop)
CREATE TABLE IF NOT EXISTS public.approval_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    flowchart_id UUID NOT NULL REFERENCES public.flowcharts(id) ON DELETE CASCADE,
    approval_node_id TEXT NOT NULL,
    assignee_email TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    responded_at TIMESTAMPTZ
);

-- Ativar RLS e permitir leitura pública para tokens válidos
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tokens de aprovação são acessíveis publicamente via token" ON public.approval_tokens;
DROP POLICY IF EXISTS "Tokens de aprovação podem ser atualizados publicamente via token" ON public.approval_tokens;

CREATE POLICY "Tokens de aprovação são acessíveis publicamente via token"
    ON public.approval_tokens FOR SELECT
    USING (true);

CREATE POLICY "Tokens de aprovação podem ser atualizados publicamente via token"
    ON public.approval_tokens FOR UPDATE
    USING (true);
