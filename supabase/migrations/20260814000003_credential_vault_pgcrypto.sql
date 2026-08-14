-- Migration: Criar Tabela 'credential_vault' com Criptografia de Coluna via pgcrypto (pgp_sym_encrypt)
-- Timestamp: 20260814000003_credential_vault_pgcrypto.sql

-- 1. Assegurar extensão pgcrypto ativa
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Criar a tabela 'credential_vault' para armazenamento seguro de chaves de API e tokens de sistemas externos
CREATE TABLE IF NOT EXISTS public.credential_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    service_type TEXT NOT NULL CHECK (service_type IN ('whatsapp', 'sendgrid', 'slack', 'custom_bearer', 'api_key', 'pje_credentials')),
    masked_value TEXT NOT NULL,
    secret_value_encrypted BYTEA, -- Coluna binária criptografada via pgcrypto (pgp_sym_encrypt)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar índices de performance
CREATE INDEX IF NOT EXISTS idx_credential_vault_org ON public.credential_vault (organization_id);
CREATE INDEX IF NOT EXISTS idx_credential_vault_service ON public.credential_vault (service_type);

-- 3. Habilitar RLS (Row Level Security) na tabela 'credential_vault'
ALTER TABLE public.credential_vault ENABLE ROW LEVEL SECURITY;

-- Política de RLS: Apenas membros autenticados da própria organização ou a service_role podem acessar
DROP POLICY IF EXISTS "Tenant Isolation para Credenciais" ON public.credential_vault;
CREATE POLICY "Tenant Isolation para Credenciais" ON public.credential_vault
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role possui acesso total ao vault" ON public.credential_vault;
CREATE POLICY "Service role possui acesso total ao vault" ON public.credential_vault
  FOR ALL TO service_role
  USING (true);

-- 4. Funções auxiliares PL/pgSQL para criptografia e descriptografia de credenciais (pgp_sym_encrypt / pgp_sym_decrypt)

-- Função para criptografar segredo antes de salvar no banco
CREATE OR REPLACE FUNCTION public.encrypt_vault_secret(p_plain_secret TEXT, p_master_key TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_plain_secret IS NULL OR p_plain_secret = '' THEN
        RETURN NULL;
    END IF;
    RETURN pgp_sym_encrypt(p_plain_secret, p_master_key);
END;
$$;

-- Função para descriptografar segredo no momento do SELECT pelo backend autorizado
CREATE OR REPLACE FUNCTION public.decrypt_vault_secret(p_encrypted_secret BYTEA, p_master_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_encrypted_secret IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN pgp_sym_decrypt(p_encrypted_secret, p_master_key);
EXCEPTION WHEN OTHERS THEN
    RETURN '[ERRO DE DESCRIPTOGRAFIA: Chave Mestra Inválida]';
END;
$$;
