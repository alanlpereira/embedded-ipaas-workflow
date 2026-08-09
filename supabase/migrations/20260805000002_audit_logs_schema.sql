-- Migration: Criar tabela de Logs de Auditoria de Execução (execution_logs)
CREATE TABLE IF NOT EXISTS public.execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flowchart_id UUID NOT NULL REFERENCES public.flowcharts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'WAITING_APPROVAL')),
    failed_node_id TEXT,
    error_message TEXT,
    execution_trace JSONB NOT NULL DEFAULT '[]'::jsonb,
    trigger_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

-- Criar Índices para pesquisas rápidas
CREATE INDEX IF NOT EXISTS idx_execution_logs_flowchart ON public.execution_logs(flowchart_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON public.execution_logs(status);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar logs da sua organização" ON public.execution_logs;

CREATE POLICY "Usuários podem visualizar logs da sua organização"
    ON public.execution_logs FOR SELECT
    USING (true);
