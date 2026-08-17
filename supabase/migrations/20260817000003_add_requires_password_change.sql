-- Migration: Adicionar coluna requires_password_change para fluxo de reset obrigatório no primeiro login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS requires_password_change boolean DEFAULT false;
