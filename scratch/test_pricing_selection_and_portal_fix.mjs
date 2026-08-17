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

async function runPricingSelectionAudit() {
  console.log('====================================================================');
  console.log('🧪 TESTE E2E: SELEÇÃO DE PLANOS PARA NOVO USUÁRIO (PRO HABILITADO)');
  console.log('====================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const emailMember = `pro.selection.audit.${Date.now()}@synapse-demo.com`;
  const oabMember = `55${Math.floor(1000 + Math.random() * 9000)}`;

  console.log(`1. Criando novo usuário inativo (${emailMember}, OAB ${oabMember})...`);
  const { data: authData } = await supabase.auth.signUp({
    email: emailMember,
    password: 'Password123!',
    options: { data: { full_name: 'Dr. Novo Advogado Teste Pro' } }
  });

  if (authData?.user) {
    await supabase.from('profiles').upsert({
      id: authData.user.id,
      email: emailMember,
      full_name: 'Dr. Novo Advogado Teste Pro',
      role: 'Member',
      oab_number: oabMember,
      oab_uf: 'MG',
      subscription_status: 'inactive',
      created_at: new Date().toISOString()
    });
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('2. Efetuando login e navegando até a tela de planos...');
    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    const emailIn = page.locator('input[type="email"]');
    const passIn = page.locator('input[type="password"]');

    if (await emailIn.count() > 0 && await passIn.count() > 0) {
      await emailIn.first().fill(emailMember);
      await passIn.first().fill('Password123!');
      await page.click('button[type="submit"]');
    }

    console.log('3. Aguardando renderização da tela de escolha de planos...');
    await page.waitForSelector('text=Escolha o Plano Ideal, text=Múltiplos Advogados', { timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pricing_plan_selection_enabled.png'), fullPage: true });

    const bodyText = await page.innerText('body');

    // TESTE 1: Garantir que NENHUM plano está marcado como "Seu Plano Atual" para um novo usuário
    console.log('\n--- TESTE 1: VERIFICAÇÃO DE DISPONIBILIDADE DO PLANO PRO ---');
    const hasCurrentPlanBadge = bodyText.includes('Seu Plano Atual');
    const proButtonText = await page.locator('button:has-text("Pro"), button:has-text("Iniciar 14 Dias Grátis")').allInnerTexts();

    console.log(`Mensagem "Seu Plano Atual" exibida no topo (deve ser false): ${hasCurrentPlanBadge}`);
    console.log(`Botões de Planos disponíveis: ${proButtonText.length}`);

    // TESTE 2: Garantir que o botão do plano Pro é CLICÁVEL (não está disabled)
    const proCardButton = page.locator('button:has-text("Pro")');
    const isProButtonDisabled = await proCardButton.count() > 0 ? await proCardButton.first().isDisabled() : false;

    console.log(`Botão do Plano Pro desabilitado? ${isProButtonDisabled}`);
    const test1Passed = !hasCurrentPlanBadge && !isProButtonDisabled;
    console.log(`Resultado do Teste 1: ${test1Passed ? '✅ SUCESSO 100% (Novo usuário pode escolher o plano Pro)' : '❌ FALHA'}`);

    // TESTE 3: Clicar no Plano Pro e confirmar acionamento da Stripe
    console.log('\n--- TESTE 2: SELEÇÃO DO PLANO PRO VIA STRIPE CHECKOUT ---');
    const networkRequests = [];
    page.on('request', req => networkRequests.push(req.url()));

    if (await proCardButton.count() > 0) {
      console.log('Simulando clique no botão do Plano Pro...');
      await proCardButton.first().click();
      await page.waitForTimeout(4000);
    }

    const stripeInvoked = networkRequests.some(url => url.includes('create-checkout-session') || url.includes('checkout.stripe.com')) || (await page.innerText('body')).includes('Conectando');
    console.log(`Stripe Checkout iniciado para o Plano Pro: ${stripeInvoked ? '✅ SIM' : '❌ NÃO'}`);

    console.log('\n====================================================================');
    const overallSuccess = test1Passed && stripeInvoked;
    console.log(`🏁 RESULTADO GERAL DA AUDITORIA: ${overallSuccess ? '✅ 100% APROVADO' : '❌ REGRESSÃO'}`);
    console.log('====================================================================');

  } catch (err) {
    console.error('❌ Erro no teste Playwright:', err);
  } finally {
    await browser.close();
  }
}

runPricingSelectionAudit();
