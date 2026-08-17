import { createRequire } from 'module';
const require = createRequire(import.meta.url);

global.WebSocket = class DummyWebSocket {
  constructor() {}
  on() {}
  close() {}
};

const { createClient } = require('../apps/web/node_modules/@supabase/supabase-js');

const SUPABASE_URL = 'https://wurfruxigmajgnqsyleq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigration() {
  console.log('====================================================================');
  console.log('🐘 APLICANDO MIGRAÇÃO: RAG DB, CHAT HISTORY & INCREMENT_AI_USAGE RPC');
  console.log('====================================================================\n');

  // Testar conexão executando RPC ou SELECT nas tabelas criadas
  console.log('1. Verificando acesso às tabelas public.knowledge_base, chat_sessions, chat_messages...');

  const { data: kbData, error: kbErr } = await supabase.from('knowledge_base').select('id').limit(1);
  console.log(`- Tabela knowledge_base: ${kbErr ? `Erro: ${kbErr.message}` : '✅ OK / Acessível'}`);

  const { data: csData, error: csErr } = await supabase.from('chat_sessions').select('id').limit(1);
  console.log(`- Tabela chat_sessions: ${csErr ? `Erro: ${csErr.message}` : '✅ OK / Acessível'}`);

  const { data: cmData, error: cmErr } = await supabase.from('chat_messages').select('id').limit(1);
  console.log(`- Tabela chat_messages: ${cmErr ? `Erro: ${cmErr.message}` : '✅ OK / Acessível'}`);

  console.log('\n2. Testando chamada RPC increment_ai_usage...');
  // Buscar um usuário para testar
  const { data: profiles } = await supabase.from('profiles').select('id, email, ai_monthly_usage').limit(1);
  if (profiles && profiles.length > 0) {
    const testProfile = profiles[0];
    console.log(`Usuário de teste: ${testProfile.email} | ai_monthly_usage atual: ${testProfile.ai_monthly_usage || 0}`);

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('increment_ai_usage', {
      p_user_id: testProfile.id,
      p_count: 1
    });

    if (rpcErr) {
      console.error(`❌ Erro RPC increment_ai_usage: ${rpcErr.message}`);
    } else {
      console.log(`✅ RPC increment_ai_usage executada com SUCESSO! Novo ai_monthly_usage: ${rpcRes}`);
    }
  }

  console.log('\n====================================================================');
  console.log('🏁 CONCLUÍDA VERIFICAÇÃO DA MIGRAÇÃO DO BANCO DE DADOS');
  console.log('====================================================================');
}

applyMigration();
