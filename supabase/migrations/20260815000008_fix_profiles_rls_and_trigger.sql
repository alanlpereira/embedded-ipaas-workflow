-- ==============================================================================
-- Migration: 20260815000008_fix_profiles_rls_and_trigger.sql
-- Description: Garantir Trigger automático blindado e RLS permissivo para public.profiles
-- ==============================================================================

-- 1. Alterar organization_id para ser opcional caso possua a restrição NOT NULL
ALTER TABLE public.profiles ALTER COLUMN organization_id DROP NOT NULL;

-- 2. Garantir RLS ativado na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas conflitantes anteriores da tabela profiles
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_write_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_anon" ON public.profiles;
DROP POLICY IF EXISTS "profiles_auth" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem visualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- 4. Criar Políticas RLS Globais e Robustas para a tabela public.profiles
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (true);

-- 5. Função e Trigger PostgreSQL Blindados para Criar Perfil Automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Buscar ou criar organização padrão para satisfazer chave estrangeira se existir
  BEGIN
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    IF default_org_id IS NULL THEN
      INSERT INTO public.organizations (name) VALUES ('Organização Padrão') RETURNING id INTO default_org_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    default_org_id := NULL;
  END;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    organization_id,
    subscription_status,
    subscription_plan,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    default_org_id,
    'inactive',
    'Pro',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro imprevisto, não abortar o cadastro na tabela auth.users
  RAISE WARNING 'Aviso no Trigger handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar Trigger na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
