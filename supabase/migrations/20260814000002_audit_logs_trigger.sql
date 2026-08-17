-- Migration: Trilhas de Auditoria Automáticas (Audit Logs) via PL/pgSQL e pgcrypto
-- Timestamp: 20260814000002_audit_logs_trigger.sql

-- 1. Ativar a extensão pgcrypto no PostgreSQL (Para criptografia e UUIDs)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Criar a tabela 'audit_logs' com schema estruturado
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de alta performance para auditoria e investigações
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action ON public.audit_logs (table_name, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- 3. Habilitar RLS (Row Level Security) na tabela 'audit_logs'
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Remover políticas anteriores para garantir restrição estrita
DROP POLICY IF EXISTS "Acesso a logs de auditoria" ON public.audit_logs;
DROP POLICY IF EXISTS "Apenas a service_role gerencia audit_logs" ON public.audit_logs;

-- Política de RLS: NENHUM usuário comum pode visualizar ou alterar esses logs
-- Apenas a chave de sistema (service_role) e funções SECURITY DEFINER possuem acesso
CREATE POLICY "Apenas a service_role gerencia audit_logs" ON public.audit_logs
  FOR ALL TO service_role
  USING (true);

-- 4. Function genérica em PL/pgSQL para auditoria automática (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_record_id TEXT;
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
BEGIN
    -- Capturar ID do usuário autenticado no Supabase Auth (auth.uid())
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    -- Extrair ação e dados antigos/novos
    IF (TG_OP = 'DELETE') THEN
        v_old_data := to_jsonb(OLD);
        v_record_id := COALESCE(OLD.id::text, NULL);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        v_record_id := COALESCE(NEW.id::text, OLD.id::text, NULL);
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data := to_jsonb(NEW);
        v_record_id := COALESCE(NEW.id::text, NULL);
    END IF;

    -- Inserir o registro de auditoria na tabela audit_logs
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        user_id,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        v_old_data,
        v_new_data,
        v_user_id,
        now()
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 5. Configurar Triggers automáticos nas principais tabelas de operação do usuário

-- Trigger na tabela flowcharts (Fluxos)
DROP TRIGGER IF EXISTS audit_flowcharts_trigger ON public.flowcharts;
CREATE TRIGGER audit_flowcharts_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.flowcharts
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Trigger na tabela flow_executions (Execuções)
DROP TRIGGER IF EXISTS audit_flow_executions_trigger ON public.flow_executions;
CREATE TRIGGER audit_flow_executions_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.flow_executions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Trigger na tabela profiles (Perfis de Usuário)
DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Trigger na tabela organizations (Organizações/Tenants)
DROP TRIGGER IF EXISTS audit_organizations_trigger ON public.organizations;
CREATE TRIGGER audit_organizations_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Trigger na tabela folders (Pastas de Organização)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'folders') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS audit_folders_trigger ON public.folders';
    EXECUTE 'CREATE TRIGGER audit_folders_trigger AFTER INSERT OR UPDATE OR DELETE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.log_audit_event()';
  END IF;
END $$;
