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

async function testColumnsAndConstraints() {
  console.log('====================================================');
  console.log('🔬 TESTANDO ESTRUTURA E COLUNAS NA TABELA PROFILES');
  console.log('====================================================\n');

  // 1. Testar se as colunas ai_monthly_limit e ai_monthly_usage funcionam no SELECT
  console.log('--- 1. Testando SELECT com ai_monthly_limit e ai_monthly_usage ---');
  const { data: selectData, error: selectErr } = await supabase
    .from('profiles')
    .select('id, email, subscription_status, stripe_customer_id, ai_monthly_limit, ai_monthly_usage')
    .limit(1);

  if (selectErr) {
    console.error('❌ ERRO NO SELECT:', selectErr.message, '| Code:', selectErr.code);
  } else {
    console.log('✅ SELECT EXECUTADO COM SUCESSO! Colunas ativas:', selectData);
  }
}

testColumnsAndConstraints();
