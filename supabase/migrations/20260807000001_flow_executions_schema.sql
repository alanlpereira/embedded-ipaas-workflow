-- Migration: Tabela de Execuções e Logs do Motor de Execução (Runner)

-- 1. Criar Tabela flow_executions
CREATE TABLE IF NOT EXISTS public.flow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT REFERENCES public.flowcharts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'waiting_approval', 'completed', 'failed')),
    current_node_id TEXT,
    context_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

-- Index para buscas rápidas por workflow_id e status
CREATE INDEX IF NOT EXISTS idx_flow_executions_workflow_id ON public.flow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_status ON public.flow_executions(status);

-- 2. Criar Tabela execution_logs
CREATE TABLE IF NOT EXISTS public.execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES public.flow_executions(id) ON DELETE CASCADE,
    node_id TEXT,
    status TEXT NOT NULL DEFAULT 'info' CHECK (status IN ('info', 'success', 'warning', 'error')),
    log_message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.execution_logs ADD COLUMN IF NOT EXISTS execution_id UUID REFERENCES public.flow_executions(id) ON DELETE CASCADE;

-- Index para buscas rápidas de logs por execution_id
CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_id ON public.execution_logs(execution_id);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de execuções para usuários autenticados" ON public.flow_executions;
DROP POLICY IF EXISTS "Permitir inserção e atualização de execuções" ON public.flow_executions;
DROP POLICY IF EXISTS "Permitir leitura de logs de execução" ON public.execution_logs;
DROP POLICY IF EXISTS "Permitir inserção de logs de execução" ON public.execution_logs;

CREATE POLICY "Permitir leitura de execuções para usuários autenticados"
    ON public.flow_executions FOR SELECT
    USING (true);

CREATE POLICY "Permitir inserção e atualização de execuções"
    ON public.flow_executions FOR ALL
    USING (true);

CREATE POLICY "Permitir leitura de logs de execução"
    ON public.execution_logs FOR SELECT
    USING (true);

CREATE POLICY "Permitir inserção de logs de execução"
    ON public.execution_logs FOR ALL
    USING (true);
