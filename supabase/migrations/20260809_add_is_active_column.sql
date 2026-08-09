-- Migration: Adicionar coluna is_active nas tabelas workflows e flowcharts
ALTER TABLE IF EXISTS public.workflows ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE IF EXISTS public.flowcharts ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
