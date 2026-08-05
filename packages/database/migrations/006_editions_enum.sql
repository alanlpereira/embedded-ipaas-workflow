-- ============================================================================
-- MIGRATION 006: Hierarquia de Edições (Forge, Kinex, Axiom, Synapse)
-- ============================================================================

-- Remove restrições legadas de plan_tier
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_plan_tier_check;

-- Adiciona a nova validação restrita às 4 edições oficiais do motor
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_plan_tier_check 
  CHECK (plan_tier IN ('Forge', 'Kinex', 'Axiom', 'Synapse'));

-- Atualiza dados legados se existirem para os novos nomes de edições
UPDATE public.organizations SET plan_tier = 'Forge' WHERE plan_tier = 'Starter';
UPDATE public.organizations SET plan_tier = 'Kinex' WHERE plan_tier = 'Business';
UPDATE public.organizations SET plan_tier = 'Axiom' WHERE plan_tier = 'Agency';
UPDATE public.organizations SET plan_tier = 'Synapse' WHERE plan_tier = 'Enterprise';
