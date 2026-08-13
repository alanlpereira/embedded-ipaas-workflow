-- Enable public access for HITL approval tokens
ALTER TABLE public.approval_tokens DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.approval_tokens TO anon;
GRANT ALL ON TABLE public.approval_tokens TO authenticated;
GRANT ALL ON TABLE public.approval_tokens TO service_role;
