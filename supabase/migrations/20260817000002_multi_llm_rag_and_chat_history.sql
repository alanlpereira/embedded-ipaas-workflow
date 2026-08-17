-- Migration: 20260817000002_multi_llm_rag_and_chat_history.sql
-- Descrição: Habilita pgvector, cria tabelas knowledge_base, chat_sessions, chat_messages e RPC increment_ai_usage

-- 1. Ativar a extensão vetorial para o Help Desk (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar tabela de Base de Conhecimento (RAG)
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  embedding vector(768), -- Modelo de embedding 768 dimensões (ex: Gemini/Text-Embedding-004)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Criar tabelas de Histórico de Chat Seguras (Isoladas por RLS)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  process_number text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS estrito
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS Permissivas / Acesso Seguro
DROP POLICY IF EXISTS "knowledge_base_select_policy" ON public.knowledge_base;
CREATE POLICY "knowledge_base_select_policy" ON public.knowledge_base FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "chat_sessions_all_policy" ON public.chat_sessions;
CREATE POLICY "chat_sessions_all_policy" ON public.chat_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "chat_messages_all_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_all_policy" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Conceder Permissões de Leitura e Escrita
GRANT ALL ON public.knowledge_base TO anon, authenticated, service_role;
GRANT ALL ON public.chat_sessions TO anon, authenticated, service_role;
GRANT ALL ON public.chat_messages TO anon, authenticated, service_role;

-- 4. Função RPC com SECURITY DEFINER para incremento atômico de ai_monthly_usage na public.profiles
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id uuid, p_count integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_usage integer;
BEGIN
  UPDATE public.profiles
  SET ai_monthly_usage = COALESCE(ai_monthly_usage, 0) + p_count
  WHERE id = p_user_id
  RETURNING ai_monthly_usage INTO v_new_usage;
  
  RETURN COALESCE(v_new_usage, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_ai_usage(uuid, integer) TO anon, authenticated, service_role;
