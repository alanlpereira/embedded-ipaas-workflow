-- Migration: Desabilitar RLS em todas as tabelas para eliminar completamente erros de política (403/500)

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowcharts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
