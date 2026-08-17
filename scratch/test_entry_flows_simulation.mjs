import { createRequire } from 'module';
const require = createRequire(import.meta.url);

global.WebSocket = class DummyWebSocket {
  constructor() {}
  on() {}
  close() {}
};

const { createClient } = require('../apps/web/node_modules/@supabase/supabase-js');

// 🎯 URL OFICIAL DE PRODUÇÃO IDENTIFICADA NA AUDITORIA DE NAVEGADOR
const SUPABASE_URL = 'https://wurfruxigmajgnqsyleq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runProductionSimulation() {
  console.log('====================================================');
  console.log('🌐 SIMULAÇÃO NA URL OFICIAL DE PRODUÇÃO: ' + SUPABASE_URL);
  console.log('====================================================\n');

  // 1. Testar consulta da RPC get_all_profiles
  console.log('--- 1. Testando RPC get_all_profiles() na URL de Produção ---');
  const { data: rpcProfiles, error: rpcErr } = await supabase.rpc('get_all_profiles');
  if (rpcErr) {
    console.error('❌ Erro na RPC get_all_profiles:', rpcErr.message, '| Code:', rpcErr.code);
  } else {
    console.log(`✅ Total de perfis na URL de produção: ${rpcProfiles?.length || 0}`);
    rpcProfiles?.forEach(p => console.log(`  - ID: ${p.id} | Email: ${p.email} | Status: ${p.subscription_status} | OAB: ${p.oab_number}`));
  }

  // 2. Testar query na tabela profiles
  console.log('\n--- 2. Testando query na tabela profiles ---');
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  if (profErr) {
    console.error('❌ Erro na tabela profiles:', profErr.message, '| Code:', profErr.code);
  } else {
    console.log(`✅ Total de perfis lidos diretamente: ${profiles?.length || 0}`);
  }

  // 3. Testar query na tabela workflows
  console.log('\n--- 3. Testando query na tabela workflows (Verificação de 22P02) ---');
  const { data: wf, error: wfErr } = await supabase.from('workflows').select('*').eq('organization_id', 'org-alp-nexus');
  if (wfErr) {
    console.error('❌ ERRO NO WORKFLOWS:', wfErr.message, '| Code:', wfErr.code);
  } else {
    console.log('✅ Query em workflows com organization_id="org-alp-nexus" EXECUTADA COM SUCESSO! Total:', wf?.length);
  }

  // 4. Testar cadastro de novo usuário na URL oficial de produção
  const testEmail = `adv.live.${Date.now()}@synapse-demo.com`;
  const testPassword = 'Password123!';
  console.log(`\n--- 4. Testando Cadastro de Novo Usuário (Sign Up): ${testEmail} ---`);

  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Advogado Teste Produção',
        role: 'Member'
      }
    }
  });

  if (authErr) {
    console.error('❌ Erro no Sign Up:', authErr.message);
  } else if (authData.user) {
    const userId = authData.user.id;
    console.log(`✅ [SIGNUP SUCCESS] User ID: ${userId}`);

    // Verificar se o Trigger criou o perfil
    const { data: initProf } = await supabase.from('profiles').select('*').eq('id', userId).single();
    console.log('Perfil criado automaticamente pelo Trigger PostgreSQL:', initProf);

    // Testar UPDATE de Onboarding (OAB)
    console.log('\n--- 5. Testando UPDATE de Onboarding (OAB/MG 555666) ---');
    const { error: updErr } = await supabase.from('profiles').update({
      oab_number: '555666',
      oab_uf: 'MG',
      full_name: 'Dr. Advogado Teste Produção',
      updated_at: new Date().toISOString()
    }).eq('id', userId);

    if (updErr) {
      console.error('❌ Erro no UPDATE do Onboarding:', updErr.message);
    } else {
      console.log('✅ UPDATE de Onboarding EXECUTADO COM SUCESSO!');
    }

    const { data: finalProf } = await supabase.from('profiles').select('*').eq('id', userId).single();
    console.log('Estado final do perfil após Onboarding no PostgreSQL:', finalProf);

    // Limpar usuário de teste
    console.log('\n--- 6. Limpando perfil de teste ---');
    await supabase.rpc('delete_user_profile', { target_user_id: userId });
    console.log('✅ Limpeza concluída.');
  }
}

runProductionSimulation();
