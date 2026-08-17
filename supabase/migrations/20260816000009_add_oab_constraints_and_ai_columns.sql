-- ==============================================================================
-- Migration: 20260816000009_add_oab_constraints_and_ai_columns.sql
-- Description: Adicionar colunas ausentes e travas de unicidade/imutabilidade para OAB
-- ==============================================================================

-- 1. Criação das colunas faltantes exigidas pelo frontend
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_monthly_limit integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_monthly_usage integer DEFAULT 0;

-- 2. Limpeza prévia de OABs duplicadas em perfis antigos de teste para permitir o índice UNIQUE
UPDATE public.profiles p1
SET oab_number = NULL
WHERE p1.oab_number IS NOT NULL AND p1.oab_number <> ''
  AND EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.oab_number = p1.oab_number
      AND (p2.created_at > p1.created_at OR (p2.created_at = p1.created_at AND p2.id > p1.id))
  );

-- 3. Trava de Unicidade da OAB
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_oab_number'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT unique_oab_number UNIQUE (oab_number);
  END IF;
END $$;

-- 4. Trava de Imutabilidade da OAB (Trigger)
CREATE OR REPLACE FUNCTION prevent_oab_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a OAB antiga existir (não for nula nem vazia) e a nova for diferente, aborta a transação
  IF OLD.oab_number IS NOT NULL AND OLD.oab_number <> '' AND NEW.oab_number IS DISTINCT FROM OLD.oab_number THEN
    RAISE EXCEPTION 'Regra de Negócio: A OAB não pode ser alterada após o cadastro inicial.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_oab_immutability ON public.profiles;

CREATE TRIGGER enforce_oab_immutability
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_oab_update();
