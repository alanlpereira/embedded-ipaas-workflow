-- Migration: Expansão de Tabela 'organizations' para Gestão de Planos & Overrides de Tokens de IA
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'Business' CHECK (plan_tier IN ('Starter', 'Business', 'Agency', 'Enterprise')),
ADD COLUMN IF NOT EXISTS ai_tokens_limit INT DEFAULT 500000,
ADD COLUMN IF NOT EXISTS custom_token_override INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_tokens_used INT DEFAULT 125000,
ADD COLUMN IF NOT EXISTS active_status BOOLEAN DEFAULT true;

-- Atualizar organizações existentes com dados de teste
UPDATE public.organizations 
SET plan_tier = 'Enterprise',
    ai_tokens_limit = 2000000,
    custom_token_override = 500000,
    ai_tokens_used = 420000,
    active_status = true
WHERE id = 'org-alp-nexus';

UPDATE public.organizations 
SET plan_tier = 'Business',
    ai_tokens_limit = 500000,
    custom_token_override = 0,
    ai_tokens_used = 180000,
    active_status = true
WHERE id = 'org-client-acme';

UPDATE public.organizations 
SET plan_tier = 'Agency',
    ai_tokens_limit = 1000000,
    custom_token_override = 250000,
    ai_tokens_used = 650000,
    active_status = true
WHERE id = 'org-client-stark';
