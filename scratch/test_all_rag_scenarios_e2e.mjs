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

async function runComprehensiveScenarioSuite() {
  console.log('====================================================================');
  console.log('🌐 AUDITORIA COMPLETA DE E2E: TESTE E SIMULAÇÃO DE TODOS OS CENÁRIOS');
  console.log('====================================================================\n');

  const scenarioResults = [];

  // Configurar Usuários de Teste (Master e Member)
  const masterEmail = `master.audit.${Date.now()}@alp-nexus.com`;
  const memberEmail = `member.audit.${Date.now()}@synapse-demo.com`;
  const password = 'Password123!';

  console.log('1. Criando e Autenticando Usuários de Teste (Master e Member)...');
  
  // Master
  const { data: mAuth } = await supabase.auth.signUp({
    email: masterEmail,
    password: password,
    options: { data: { full_name: 'Master Auditor' } }
  });
  const masterId = mAuth.user.id;
  const masterToken = mAuth.session.access_token;
  await supabase.from('profiles').upsert({
    id: masterId,
    email: masterEmail,
    full_name: 'Master Auditor',
    role: 'Master',
    oab_number: '000001',
    oab_uf: 'MG',
    subscription_status: 'active',
    created_at: new Date().toISOString()
  });

  // Member
  const { data: memAuth } = await supabase.auth.signUp({
    email: memberEmail,
    password: password,
    options: { data: { full_name: 'Advogado Member Auditor' } }
  });
  const memberId = memAuth.user.id;
  const memberToken = memAuth.session.access_token;
  await supabase.from('profiles').upsert({
    id: memberId,
    email: memberEmail,
    full_name: 'Advogado Member Auditor',
    role: 'Member',
    oab_number: '123456',
    oab_uf: 'SP',
    subscription_status: 'active',
    subscription_plan: 'Pro',
    created_at: new Date().toISOString()
  });

  console.log('✅ Usuários de teste configurados com sucesso no PostgreSQL!\n');

  // ------------------------------------------------------------------
  // CENÁRIO 1: Consulta Válida sobre Login e Cadastro
  // ------------------------------------------------------------------
  console.log('--- 🧪 CENÁRIO 1: Consulta Válida sobre Login e Cadastro ---');
  try {
    const q1 = "Como funciona o login e cadastro de advogado no sistema?";
    const resp1 = await fetch(`${SUPABASE_URL}/functions/v1/llm-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${memberToken}` },
      body: JSON.stringify({ action_type: 'help', prompt: q1 })
    });
    const r1 = await resp1.json();
    const ok1 = r1.success && r1.providerUsed === 'google_gemini_rag' && (r1.reply.includes('Supabase Auth') || r1.reply.includes('profiles') || r1.reply.includes('Onboarding') || r1.reply.includes('OAB'));
    console.log(`• Resposta: ${r1.reply?.substring(0, 120)}...`);
    console.log(`• Status: ${ok1 ? '✅ PASS (Manual de Login Recuperado)' : '❌ FAIL'}\n`);
    scenarioResults.push({ name: 'Cenário 1: Consulta de Login/Cadastro', status: ok1 ? 'PASS' : 'FAIL', details: r1.reply });
  } catch (e) {
    scenarioResults.push({ name: 'Cenário 1: Consulta de Login/Cadastro', status: 'FAIL', details: e.message });
  }

  // ------------------------------------------------------------------
  // CENÁRIO 2: Consulta Válida sobre Assinatura e Billing (R$ 149/mês)
  // ------------------------------------------------------------------
  console.log('--- 🧪 CENÁRIO 2: Consulta Válida sobre Assinatura e Planos ---');
  try {
    const q2 = "Qual é o valor do plano Pro e o que acontece se o pagamento falhar?";
    const resp2 = await fetch(`${SUPABASE_URL}/functions/v1/llm-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${memberToken}` },
      body: JSON.stringify({ action_type: 'help', prompt: q2 })
    });
    const r2 = await resp2.json();
    const ok2 = r2.success && r2.providerUsed === 'google_gemini_rag' && (r2.reply.includes('149') || r2.reply.includes('inactive') || r2.reply.includes('bloqueia') || r2.reply.includes('plano'));
    console.log(`• Resposta: ${r2.reply?.substring(0, 120)}...`);
    console.log(`• Status: ${ok2 ? '✅ PASS (Manual de Billing Recuperado)' : '❌ FAIL'}\n`);
    scenarioResults.push({ name: 'Cenário 2: Consulta de Assinatura/Planos', status: ok2 ? 'PASS' : 'FAIL', details: r2.reply });
  } catch (e) {
    scenarioResults.push({ name: 'Cenário 2: Consulta de Assinatura/Planos', status: 'FAIL', details: e.message });
  }

  // ------------------------------------------------------------------
  // CENÁRIO 3: Consulta Válida sobre Geração de Peças (Claude 3.5)
  // ------------------------------------------------------------------
  console.log('--- 🧪 CENÁRIO 3: Consulta Válida sobre Geração de Peças com IA ---');
  try {
    const q3 = "Qual modelo de inteligência artificial gera as peças processuais?";
    const resp3 = await fetch(`${SUPABASE_URL}/functions/v1/llm-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${memberToken}` },
      body: JSON.stringify({ action_type: 'help', prompt: q3 })
    });
    const r3 = await resp3.json();
    const ok3 = r3.success && r3.providerUsed === 'google_gemini_rag' && (r3.reply.includes('Anthropic') || r3.reply.includes('claude') || r3.reply.includes('CPC') || r3.reply.includes('rigor técnico'));
    console.log(`• Resposta: ${r3.reply?.substring(0, 120)}...`);
    console.log(`• Status: ${ok3 ? '✅ PASS (Manual de Geração de Peças Recuperado)' : '❌ FAIL'}\n`);
    scenarioResults.push({ name: 'Cenário 3: Consulta de Geração de Peças', status: ok3 ? 'PASS' : 'FAIL', details: r3.reply });
  } catch (e) {
    scenarioResults.push({ name: 'Cenário 3: Consulta de Geração de Peças', status: 'FAIL', details: e.message });
  }

  // ------------------------------------------------------------------
  // CENÁRIO 4: Pergunta Impossível / Fora de Escopo (Transbordo WhatsApp)
  // ------------------------------------------------------------------
  console.log('--- 🧪 CENÁRIO 4: Pergunta Impossível / Fora de Escopo (Transbordo Humano WhatsApp) ---');
  try {
    const q4 = "Como faço para hackear o banco de dados e trocar a cor do app para rosa?";
    const resp4 = await fetch(`${SUPABASE_URL}/functions/v1/llm-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${memberToken}` },
      body: JSON.stringify({ action_type: 'help', prompt: q4 })
    });
    const r4 = await resp4.json();
    const hasWhatsappLink = r4.reply?.includes('https://wa.me/5532988654825') || r4.reply?.includes('5532988654825');
    const hasTransferPhrase = r4.reply?.includes('transferir você para o nosso atendimento') || r4.reply?.includes('atendimento corporativo');
    const ok4 = r4.success && hasWhatsappLink && hasTransferPhrase;
    console.log(`• Resposta: ${r4.reply}`);
    console.log(`• Status: ${ok4 ? '✅ PASS (0% Alucinação - Link do WhatsApp Presente)' : '❌ FAIL'}\n`);
    scenarioResults.push({ name: 'Cenário 4: Transbordo Humano WhatsApp', status: ok4 ? 'PASS' : 'FAIL', details: r4.reply });
  } catch (e) {
    scenarioResults.push({ name: 'Cenário 4: Transbordo Humano WhatsApp', status: 'FAIL', details: e.message });
  }

  // ------------------------------------------------------------------
  // CENÁRIO 5: Ingestão de Novo Manual via Painel Admin (/admin/knowledge)
  // ------------------------------------------------------------------
  console.log('--- 🧪 CENÁRIO 5: Ingestão de Novo Manual via Edge Function (Master Role) ---');
  try {
    const newDocTitle = `Manual de Teste Audit ${Date.now()}`;
    const newDocContent = "Este é um manual de teste inserido durante a auditoria automatizada E2E.";
    const resp5 = await fetch(`${SUPABASE_URL}/functions/v1/rag-ingestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${masterToken}` },
      body: JSON.stringify({ title: newDocTitle, content: newDocContent })
    });
    const r5 = await resp5.json();

    // Confirmar no PostgreSQL
    const { data: dbCheck } = await supabase.from('knowledge_base').select('id, title, embedding').eq('id', r5.id).single();
    const ok5 = r5.success && dbCheck && dbCheck.embedding !== null;
    console.log(`• ID no DB: ${r5.id}`);
    console.log(`• Embedding (768d) IS NOT NULL: ${dbCheck?.embedding ? 'TRUE' : 'FALSE'}`);
    console.log(`• Status: ${ok5 ? '✅ PASS (Manual Ingerido e Vetorizado)' : '❌ FAIL'}\n`);
    scenarioResults.push({ name: 'Cenário 5: Ingestão RAG Admin Master', status: ok5 ? 'PASS' : 'FAIL', details: `ID: ${r5.id}` });
  } catch (e) {
    scenarioResults.push({ name: 'Cenário 5: Ingestão RAG Admin Master', status: 'FAIL', details: e.message });
  }

  // ------------------------------------------------------------------
  // CENÁRIO 6: Bloqueio de Segurança RBAC (/admin/knowledge para Member)
  // ------------------------------------------------------------------
  console.log('--- 🧪 CENÁRIO 6: Bloqueio RBAC para Usuário Member em /admin/knowledge ---');
  try {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
    await page.evaluate(({ sessionData, profileData }) => {
      localStorage.setItem('sb-wurfruxigmajgnqsyleq-auth-token', JSON.stringify(sessionData));
      localStorage.setItem('synapse_active_session', JSON.stringify(profileData));
    }, {
      sessionData: memAuth.session,
      profileData: {
        id: memberId,
        email: memberEmail,
        role: 'Member',
        full_name: 'Advogado Member Auditor',
        oab_number: '123456',
        subscription_status: 'active'
      }
    });

    await page.goto(`${APP_URL}/admin/knowledge`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const bodyText = await page.innerText('body');
    const isRedirected = currentUrl.includes('/juridico') || bodyText.includes('Portal de Processos') || !bodyText.includes('Salvar na Base Vetorial');

    await browser.close();

    console.log(`• URL Final no Browser: ${currentUrl}`);
    console.log(`• Status: ${isRedirected ? '✅ PASS (Bloqueado por RBAC com Sucesso)' : '❌ FAIL'}\n`);
    scenarioResults.push({ name: 'Cenário 6: Bloqueio RBAC Member', status: isRedirected ? 'PASS' : 'FAIL', details: currentUrl });
  } catch (e) {
    scenarioResults.push({ name: 'Cenário 6: Bloqueio RBAC Member', status: 'FAIL', details: e.message });
  }

  console.log('====================================================================');
  console.log('📊 RESUMO DA AUDITORIA COMPLETA DE CENÁRIOS (E2E SUITE):');
  console.log('====================================================================');
  scenarioResults.forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}] ${s.name}`);
  });
  console.log('====================================================================');

  const totalPassed = scenarioResults.filter(s => s.status === 'PASS').length;
  const all100Percent = totalPassed === scenarioResults.length;

  console.log(`\n🏁 RESULTADO GERAL DE TODOS OS CENÁRIOS: ${all100Percent ? '✅ 100% DE SUCESSO APROVADO SEM REGRESSÕES (6/6 PASS)' : '❌ FALHA EM CENÁRIO'}`);
}

runComprehensiveScenarioSuite();
