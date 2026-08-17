-- ==============================================================================
-- Migration: 20260817000001_add_feature_flags_schema.sql
-- Description: Tabela de Configurações Globais (app_settings) e Feature Flags para verificação de e-mail e telefone
-- ==============================================================================

-- 1. Adicionar colunas de Feature Flags na tabela public.organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS require_email_verification BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS require_phone_verification BOOLEAN DEFAULT FALSE;

-- 2. Criar tabela public.app_settings para armazenar preferências globais da plataforma
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso RLS para app_settings (Permitir leitura pública/autenticada, escrita apenas para autenticados)
DROP POLICY IF EXISTS "Allow public read app_settings" ON public.app_settings;
CREATE POLICY "Allow public read app_settings"
  ON public.app_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow auth write app_settings" ON public.app_settings;
CREATE POLICY "Allow auth write app_settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Inserir configurações iniciais com Feature Flags DESATIVADAS por padrão (Premissa de Regressão Zero)
INSERT INTO public.app_settings (key, value, description)
VALUES 
(
  'feature_flags',
  '{"require_email_verification": false, "require_phone_verification": false}'::jsonb,
  'Configurações de obrigatoriedade de confirmação de e-mail e telefone'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();

-- Grant total de permissões para a API REST (anon e authenticated)
GRANT ALL ON TABLE public.app_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.organizations TO anon, authenticated, service_role;
