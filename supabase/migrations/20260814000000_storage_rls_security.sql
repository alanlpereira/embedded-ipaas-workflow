-- Migration: Infraestrutura de Segurança do Storage Privado & RLS (Row Level Security)
-- Timestamp: 20260814000000_storage_rls_security.sql

-- 1. Criar bucket PRIVADO chamado 'legal_copilot_files' na tabela storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legal_copilot_files',
  'legal_copilot_files',
  false, -- Bucket PRIVADO
  52428800, -- Limite de 50MB por arquivo
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Habilitar RLS (Row Level Security) nas tabelas principais do projeto
ALTER TABLE IF EXISTS flowcharts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS flow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS approval_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credential_vault ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança RLS com cláusula auth.uid() = user_id

-- Tabela: profiles
DROP POLICY IF EXISTS "Usuários podem visualizar seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem visualizar seu próprio perfil" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Tabela: flowcharts
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar seus fluxos" ON flowcharts;
CREATE POLICY "Usuários autenticados podem visualizar seus fluxos" ON flowcharts
  FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuários autenticados podem criar fluxos" ON flowcharts;
CREATE POLICY "Usuários autenticados podem criar fluxos" ON flowcharts
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar fluxos" ON flowcharts;
CREATE POLICY "Usuários autenticados podem atualizar fluxos" ON flowcharts
  FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuários autenticados podem deletar fluxos" ON flowcharts;
CREATE POLICY "Usuários autenticados podem deletar fluxos" ON flowcharts
  FOR DELETE TO authenticated
  USING (auth.role() = 'authenticated');

-- Tabela: flow_executions
DROP POLICY IF EXISTS "Acesso às execuções de fluxo" ON flow_executions;
CREATE POLICY "Acesso às execuções de fluxo" ON flow_executions
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated');

-- Tabela: approval_tokens
DROP POLICY IF EXISTS "Acesso público e autenticado aos tokens de aprovação" ON approval_tokens;
CREATE POLICY "Acesso público e autenticado aos tokens de aprovação" ON approval_tokens
  FOR ALL TO public
  USING (true);

-- Tabela: audit_logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Acesso a logs de auditoria" ON audit_logs';
    EXECUTE 'CREATE POLICY "Acesso a logs de auditoria" ON audit_logs FOR ALL TO authenticated USING (auth.role() = ''authenticated'')';
  END IF;
END $$;

-- 4. Políticas de Segurança RLS para o Storage Privado 'legal_copilot_files'
DROP POLICY IF EXISTS "Leitura de arquivos privados para usuários autenticados" ON storage.objects;
CREATE POLICY "Leitura de arquivos privados para usuários autenticados" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'legal_copilot_files' AND (auth.uid() = owner OR auth.role() = 'authenticated'));

DROP POLICY IF EXISTS "Upload de arquivos no storage privado" ON storage.objects;
CREATE POLICY "Upload de arquivos no storage privado" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'legal_copilot_files' AND (auth.uid() = owner OR auth.role() = 'authenticated'));

DROP POLICY IF EXISTS "Atualização de arquivos no storage privado" ON storage.objects;
CREATE POLICY "Atualização de arquivos no storage privado" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'legal_copilot_files' AND (auth.uid() = owner OR auth.role() = 'authenticated'));

DROP POLICY IF EXISTS "Deleção de arquivos no storage privado" ON storage.objects;
CREATE POLICY "Deleção de arquivos no storage privado" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'legal_copilot_files' AND (auth.uid() = owner OR auth.role() = 'authenticated'));
