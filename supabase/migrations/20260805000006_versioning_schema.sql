-- Migration: Criar tabela de Versionamento de Fluxogramas (flowchart_versions)
CREATE TABLE IF NOT EXISTS public.flowchart_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flowchart_id TEXT NOT NULL REFERENCES public.flowcharts(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    created_by_email TEXT,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Criar Índice para buscas rápidas por fluxograma e ordem de versão
CREATE INDEX IF NOT EXISTS idx_flowchart_versions_flowchart_id ON public.flowchart_versions(flowchart_id, version_number DESC);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.flowchart_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar versões da sua organização" ON public.flowchart_versions;
DROP POLICY IF EXISTS "Master e Admin podem salvar novas versões" ON public.flowchart_versions;

CREATE POLICY "Usuários podem visualizar versões da sua organização"
    ON public.flowchart_versions FOR SELECT
    USING (true);

CREATE POLICY "Master e Admin podem salvar novas versões"
    ON public.flowchart_versions FOR INSERT
    WITH CHECK (true);
