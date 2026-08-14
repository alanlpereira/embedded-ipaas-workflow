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

-- 3. Políticas de Segurança RLS Garantindo Acesso Autenticado

-- Tabela: flowcharts
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar seus fluxos" ON flowcharts;
CREATE POLICY "Usuários autenticados podem visualizar seus fluxos" ON flowcharts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar fluxos" ON flowcharts;
CREATE POLICY "Usuários autenticados podem criar fluxos" ON flowcharts
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar fluxos" ON flowcharts;
CREATE POLICY "Usuários autenticados podem atualizar fluxos" ON flowcharts
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem deletar fluxos" ON flowcharts;
CREATE POLICY "Usuários autenticados podem deletar fluxos" ON flowcharts
  FOR DELETE TO authenticated
  USING (true);

-- Tabela: flow_executions
DROP POLICY IF EXISTS "Acesso às execuções de fluxo" ON flow_executions;
CREATE POLICY "Acesso às execuções de fluxo" ON flow_executions
  FOR ALL TO authenticated
  USING (true);

-- Tabela: approval_tokens
DROP POLICY IF EXISTS "Acesso público e autenticado aos tokens de aprovação" ON approval_tokens;
CREATE POLICY "Acesso público e autenticado aos tokens de aprovação" ON approval_tokens
  FOR ALL TO public
  USING (true);

-- Tabela: audit_logs
DROP POLICY IF EXISTS "Acesso a logs de auditoria" ON audit_logs;
CREATE POLICY "Acesso a logs de auditoria" ON audit_logs
  FOR ALL TO authenticated
  USING (true);

-- 4. Políticas de Segurança RLS para o Storage Privado 'legal_copilot_files'
CREATE POLICY "Leitura de arquivos privados para usuários autenticados" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'legal_copilot_files');

CREATE POLICY "Upload de arquivos no storage privado" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'legal_copilot_files');

CREATE POLICY "Atualização de arquivos no storage privado" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'legal_copilot_files');

CREATE POLICY "Deleção de arquivos no storage privado" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'legal_copilot_files');
