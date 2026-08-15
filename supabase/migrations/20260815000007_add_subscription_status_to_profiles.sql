-- ==============================================================================
-- Migration: 20260815000007_add_subscription_status_to_profiles.sql
-- Description: Adicionar coluna subscription_status na tabela public.profiles
-- ==============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text;
