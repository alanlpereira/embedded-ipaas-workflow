-- Migration: Tabela de Gestão de Clientes (clients) e Isolamento por RLS
-- Timestamp: 20260814000004_clients_table.sql

-- 1. Criar a tabela 'clients' no schema public
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    document TEXT, -- CPF / CNPJ do cliente
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar índices para pesquisas rápidas
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients (user_id);
CREATE INDEX IF NOT EXISTS idx_clients_org_id ON public.clients (organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients (created_at DESC);

-- 2. Habilitar Row Level Security (RLS) na tabela 'clients'
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança RLS com Isolamento de Usuário e Organização

DROP POLICY IF EXISTS "Usuários gerenciam apenas seus próprios clientes" ON public.clients;
CREATE POLICY "Usuários gerenciam apenas seus próprios clientes" ON public.clients
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id 
    OR organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role possui acesso total aos clientes" ON public.clients;
CREATE POLICY "Service role possui acesso total aos clientes" ON public.clients
  FOR ALL TO service_role
  USING (true);
