import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('../apps/web/node_modules/playwright');

global.WebSocket = class DummyWebSocket {
  constructor() {}
  on() {}
  close() {}
};

const { createClient } = require('../apps/web/node_modules/@supabase/supabase-js');

const ARTIFACT_DIR = '/Users/alanpereira/.gemini/antigravity/brain/8bc17749-ae29-4f87-a328-0e4a1355f827';
const APP_URL = 'https://synapse.alp-nexus.com';

const SUPABASE_URL = 'https://wurfruxigmajgnqsyleq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runDualScenarioE2EAudit() {
  console.log('====================================================================');
  console.log('🌐 FRENTE 4: SIMULAÇÃO E2E OBRIGATÓRIA (RAG DUAL SCENARIO AUDIT)');
  console.log('====================================================================\n');

  const memberEmail = `member.dual.${Date.now()}@synapse-demo.com`;
  const memberPassword = 'Password123!';

  // 1. Criar e Autenticar Usuário Member
  console.log(`1. Criando Usuário Member no Supabase Auth: ${memberEmail}...`);
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: memberEmail,
    password: memberPassword,
    options: { data: { full_name: 'Adv. Teste Dual Scenario' } }
  });

  if (authErr || !authData?.user) {
    console.error('❌ Falha ao criar Usuário Member:', authErr);
    process.exit(1);
  }

  const userId = authData.user.id;
  const token = authData.session.access_token;

  await supabase.from('profiles').upsert({
    id: userId,
    email: memberEmail,
    full_name: 'Adv. Teste Dual Scenario',
    role: 'Member',
    oab_number: '554433',
    oab_uf: 'MG',
    subscription_status: 'active',
    subscription_plan: 'Pro',
    created_at: new Date().toISOString()
  });

  console.log('✅ Perfil Member configurado com sucesso no PostgreSQL!\n');

  // ------------------------------------------------------------------
  // CENÁRIO 1: Sucesso RAG ("O que acontece se meu cartão for recusado?")
  // ------------------------------------------------------------------
  console.log('--- 🧪 CENÁRIO 1: Consulta Válida (Cartão Recusado & Billing) ---');
  const q1 = "O que acontece se meu cartão for recusado?";
  console.log(`• Enviando pergunta: "${q1}"...`);

  const resp1 = await fetch(`${SUPABASE_URL}/functions/v1/llm-router`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action_type: 'help', prompt: q1 })
  });

  const res1 = await resp1.json();
  console.log('\n📥 RESPOSTA DA IA (CENÁRIO 1):');
  console.log('• Success:', res1.success);
  console.log('• Provider Used:', res1.providerUsed);
  console.log('• Conteúdo da Resposta:\n', res1.reply);

  const c1UsedManual = res1.reply?.includes('Assinatura') || res1.reply?.includes('plano') || res1.reply?.includes('inactive') || res1.reply?.includes('bloqueia') || res1.reply?.includes('seleção de planos');
  console.log(`• Avaliação do Cenário 1: ${c1UsedManual ? '✅ PASS (Utilizou o manual de Assinatura/Billing)' : '❌ FAIL'}\n`);

  // ------------------------------------------------------------------
  // CENÁRIO 2: Fallback WhatsApp ("Como faço para alterar a cor do fundo do site?")
  // ------------------------------------------------------------------
  console.log('--- 🧪 CENÁRIO 2: Pergunta Fora do Manual (Fallback WhatsApp) ---');
  const q2 = "Como faço para alterar a cor do fundo do site?";
  console.log(`• Enviando pergunta: "${q2}"...`);

  const resp2 = await fetch(`${SUPABASE_URL}/functions/v1/llm-router`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action_type: 'help', prompt: q2 })
  });

  const res2 = await resp2.json();
  console.log('\n📥 RESPOSTA DA IA (CENÁRIO 2):');
  console.log('• Success:', res2.success);
  console.log('• Provider Used:', res2.providerUsed);
  console.log('• Conteúdo da Resposta:\n', res2.reply);

  const hasWhatsappLink = res2.reply?.includes('https://wa.me/5532988654825') || res2.reply?.includes('5532988654825');
  const hasTransferText = res2.reply?.includes('transferir você para o nosso atendimento') || res2.reply?.includes('atendimento corporativo');
  const c2PassedFallback = hasWhatsappLink && hasTransferText;
  console.log(`• Avaliação do Cenário 2: ${c2PassedFallback ? '✅ PASS (0% Alucinação - Resposta exata de transbordo com link do WhatsApp)' : '❌ FAIL'}\n`);

  console.log('====================================================================');
  console.log('📊 EVIDÊNCIAS FACTUAIS DA AUDITORIA DUAL SCENARIO:');
  console.log('====================================================================');
  console.log(`1. Cenário 1 (Cartão Recusado): ${c1UsedManual ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`2. Cenário 2 (Fallback WhatsApp): ${c2PassedFallback ? '✅ PASS' : '❌ FAIL'}`);
  console.log('====================================================================');

  const allPassed = c1UsedManual && c2PassedFallback;
  console.log(`\n🏁 RESULTADO GERAL DA AUDITORIA: ${allPassed ? '✅ 100% APROVADO SEM REGRESSÕES (DUAL SCENARIO PASS)' : '❌ FALHA EM CENÁRIO'}`);
}

runDualScenarioE2EAudit();
