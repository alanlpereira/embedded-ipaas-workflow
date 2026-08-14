-- Migration: Tabela de Rate Limiting e Proteção Contra Abusos Financeiros
-- Timestamp: 20260814000001_rate_limits_table.sql

-- 1. Criar tabela 'rate_limits' para contagem de requisições por janela temporal
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL DEFAULT 'legal-copilot',
    count INT NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Criar índice composto de alta performance para busca e agregação
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_window 
ON rate_limits (user_id, endpoint, window_start);

-- 3. Habilitar RLS (Row Level Security) na tabela rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- 4. Criar política RLS restrita exclusivamente à chave do sistema (service_role)
-- Impede que usuários comuns leiam ou alterem os contadores diretamente pelo frontend
DROP POLICY IF EXISTS "Apenas a service_role gerencia rate_limits" ON rate_limits;
CREATE POLICY "Apenas a service_role gerencia rate_limits" ON rate_limits
  FOR ALL TO service_role
  USING (true);
