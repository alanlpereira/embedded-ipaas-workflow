-- ==============================================================================
-- Migration: 20260815000006_rpc_get_all_profiles.sql
-- Description: Stored Procedures SECURITY DEFINER for Master Admin Panel
-- ==============================================================================

-- 1. Criar Stored Procedure (RPC) com SECURITY DEFINER para ignorar RLS na leitura de perfis
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Retorna todos os registros da tabela profiles ordenados por data de criação
  RETURN QUERY
  SELECT *
  FROM public.profiles
  ORDER BY created_at DESC;
END;
$$;

-- 2. Criar Stored Procedure (RPC) com SECURITY DEFINER para exclusão definitiva de perfis
DROP FUNCTION IF EXISTS public.delete_user_profile(UUID);
CREATE OR REPLACE FUNCTION public.delete_user_profile(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = target_user_id;
  RETURN true;
END;
$$;

-- 3. Conceder permissão explícita de execução das RPCs para as roles da API Supabase
GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_profile(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_user_profile(UUID) TO service_role;

-- 4. Trigger para sincronização e criação automática de perfil ao registrar novo usuário em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, role, subscription_status, subscription_plan, created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.email = 'alanlpereira@hotmail.com' OR NEW.email LIKE '%@alp-nexus.com' THEN 'Master'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'Member')
    END,
    'active', 'Pro', NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
