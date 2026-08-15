-- ==============================================================================
-- Migration: 20260815000009_fix_workflows_org_id_type.sql
-- Description: Alterar coluna organization_id na tabela workflows para TEXT
-- ==============================================================================

ALTER TABLE public.workflows ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.workflows ALTER COLUMN organization_id TYPE TEXT USING organization_id::text;
