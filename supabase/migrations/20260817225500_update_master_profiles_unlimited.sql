-- Garantir que perfis Master possuem limites ilimitados de IA e Liberação Forçada Ativa
UPDATE public.profiles
SET
  role = 'Master',
  subscription_plan = 'Master',
  ai_monthly_limit = 1000000,
  manual_status_override = true,
  subscription_status = 'active'
WHERE email = 'alanlpereira@hotmail.com'
   OR email = 'alan.pereira@alp-nexus.com'
   OR role = 'Master';
