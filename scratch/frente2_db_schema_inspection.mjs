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

async function runFrente2Inspection() {
  console.log('====================================================');
  console.log('🔍 FRENTE 2: MAPEAMENTO DE CONSTRAINTS NO BANCO (AUTH SIGNUP REAL)');
  console.log('====================================================\n');

  // Criar 2 usuários reais no Auth para vincular na chave estrangeira profiles_id_fkey
  const email1 = `unique.test1.${Date.now()}@synapse-demo.com`;
  const email2 = `unique.test2.${Date.now()}@synapse-demo.com`;

  const { data: u1 } = await supabase.auth.signUp({ email: email1, password: 'Password123!' });
  const { data: u2 } = await supabase.auth.signUp({ email: email2, password: 'Password123!' });

  const userId1 = u1?.user?.id;
  const userId2 = u2?.user?.id;

  console.log(`Usuários criados para o teste: U1 (${userId1}) | U2 (${userId2})`);

  if (!userId1 || !userId2) {
    console.error('❌ Falha ao criar usuários para o teste de schema.');
    return;
  }

  const testOab = '999888';

  // 1. Inserir OAB 999888 para o Usuário 1
  const { error: upd1Err } = await supabase.from('profiles').update({
    oab_number: testOab,
    oab_uf: 'MG'
  }).eq('id', userId1);

  // 2. Tentar inserir a MESMA OAB 999888 para o Usuário 2
  const { error: upd2Err } = await supabase.from('profiles').update({
    oab_number: testOab,
    oab_uf: 'MG'
  }).eq('id', userId2);

  console.log('\n--- VERIFICAÇÃO 1: CONSTRAINT UNIQUE NA COLUNA oab_number ---');
  if (upd2Err) {
    console.log('🔒 RESULTADO: O PostgreSQL REJEITOU a segunda inserção com a mesma OAB!');
    console.log('   Mensagem do PostgreSQL:', upd2Err.message);
    console.log('   Código do Erro PostgreSQL:', upd2Err.code);
  } else {
    console.log('🔓 RESULTADO: O PostgreSQL ACEITOU dois usuários com a mesma OAB (oab_number="999888").');
    console.log('   EVIDÊNCIA: A coluna oab_number NÃO possui atualmente NENHUMA constraint UNIQUE ativa!');
  }

  // 3. Verificação de Imutabilidade (Alterar OAB do Usuário 1 de "999888" para "777666")
  console.log('\n--- VERIFICAÇÃO 2: IMUTABILIDADE (UPDATE DE OAB JÁ PREENCHIDA) ---');
  const { error: updateOabAgainErr } = await supabase.from('profiles').update({
    oab_number: '777666',
    updated_at: new Date().toISOString()
  }).eq('id', userId1);

  if (updateOabAgainErr) {
    console.log('🔒 RESULTADO: O PostgreSQL REJEITOU a alteração de uma OAB já preenchida!');
    console.log('   Mensagem do PostgreSQL:', updateOabAgainErr.message);
  } else {
    console.log('🔓 RESULTADO: O PostgreSQL PERMITIU alterar a OAB de "999888" para "777666".');
    console.log('   EVIDÊNCIA: NÃO existe atualmente NENHUMA política de RLS ou Trigger no PostgreSQL impedindo o UPDATE de uma OAB já preenchida!');
  }

  // Limpeza dos usuários de teste
  await supabase.rpc('delete_user_profile', { target_user_id: userId1 });
  await supabase.rpc('delete_user_profile', { target_user_id: userId2 });
  console.log('\n✅ Limpeza de registros de teste concluída.');
}

runFrente2Inspection();
