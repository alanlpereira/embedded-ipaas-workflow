-- Migration: Infraestrutura White-Label & Gerenciamento de Agência
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#00f2fe',
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS custom_domain TEXT;

-- Atualizar organização Master Padrão
UPDATE public.organizations 
SET primary_color = '#00f2fe',
    custom_domain = 'flow.alp-nexus.com'
WHERE id = 'org-alp-nexus';

-- Inserir Sub-organizações para a Agência (Multi-Tenancy White-Label)
INSERT INTO public.organizations (id, name, slug, primary_color, logo_url, custom_domain)
VALUES
(
    'org-client-acme',
    'Acme Corporation B2B',
    'acme-corp',
    '#10b981',
    'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/box.svg',
    'workflow.acme.com'
),
(
    'org-client-stark',
    'Stark Industries Inc',
    'stark-industries',
    '#f59e0b',
    'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield.svg',
    'ipaas.stark.com'
)
ON CONFLICT (id) DO UPDATE 
SET primary_color = EXCLUDED.primary_color,
    logo_url = EXCLUDED.logo_url,
    custom_domain = EXCLUDED.custom_domain;
