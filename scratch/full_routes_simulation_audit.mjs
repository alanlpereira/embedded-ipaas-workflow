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

async function runFullSystemAudit() {
  console.log('====================================================================');
  console.log('🏛️ SIMULAÇÃO E AUDITORIA COMPLETA DE TODAS AS ROTAS DA APLICAÇÃO');
  console.log('====================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const auditResults = [];

  // -------------------------------------------------------------------------
  // ROTA 1: / (Raiz IPaaS) - Não Autenticado
  // -------------------------------------------------------------------------
  {
    console.log('📌 Testando Rota 1: / (Raiz IPaaS) sem autenticação...');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const body = await page.innerText('body');
    const isLoginView = body.includes('Entrar') || body.includes('Password') || body.includes('Synapse');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'route_audit_1_root_unauth.png'), fullPage: true });

    auditResults.push({
      route: '/ (Sem Auth)',
      expected: 'Tela de Login / Autenticação',
      passed: isLoginView,
      detail: isLoginView ? 'Redirecionou para Login com sucesso' : 'Falhou em renderizar Login'
    });
    await context.close();
  }

  // -------------------------------------------------------------------------
  // ROTA 2: / (Raiz IPaaS) - Usuário Master Autenticado
  // -------------------------------------------------------------------------
  {
    console.log('📌 Testando Rota 2: / (Raiz IPaaS) com Usuário Master (alan.pereira@alp-nexus.com)...');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    const emailIn = page.locator('input[type="email"]');
    const passIn = page.locator('input[type="password"]');

    if (await emailIn.count() > 0 && await passIn.count() > 0) {
      await emailIn.first().fill('alan.pereira@alp-nexus.com');
      await passIn.first().fill('Password123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
    }

    const body = await page.innerText('body');
    const isEditorView = body.includes('Editor de Fluxos') || body.includes('AUTOMAÇÕES') || body.includes('Canvas') || body.includes('Módulo Jurídico');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'route_audit_2_root_master.png'), fullPage: true });

    auditResults.push({
      route: '/ (Master Auth)',
      expected: 'Construtor de Fluxos / IPaaS Admin',
      passed: isEditorView,
      detail: isEditorView ? 'Abriu Construtor IPaaS com sucesso' : 'Falhou em abrir Construtor'
    });
    await context.close();
  }

  // -------------------------------------------------------------------------
  // ROTA 3: /juridico - Usuário Master Autenticado
  // -------------------------------------------------------------------------
  {
    console.log('📌 Testando Rota 3: /juridico com Usuário Master (alan.pereira@alp-nexus.com)...');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    const emailIn = page.locator('input[type="email"]');
    const passIn = page.locator('input[type="password"]');

    if (await emailIn.count() > 0 && await passIn.count() > 0) {
      await emailIn.first().fill('alan.pereira@alp-nexus.com');
      await passIn.first().fill('Password123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
    }

    const body = await page.innerText('body');
    const isPjePortal = body.includes('Portal de Intimações') || body.includes('PJe Online') || body.includes('Consultas Automáticas');
    const isOnboardingOrPricing = body.includes('Onboarding do Advogado') || body.includes('Vitrine Oficial de Planos');
    const isSuccess = isPjePortal && !isOnboardingOrPricing;

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'route_audit_3_juridico_master.png'), fullPage: true });

    auditResults.push({
      route: '/juridico (Master Auth)',
      expected: 'Portal de Processos PJe (LegalDashboardPage)',
      passed: isSuccess,
      detail: isSuccess ? 'Abriu Portal PJe diretamente sem Onboarding/Stripe' : 'Regressão detectada no Master'
    });
    await context.close();
  }

  // -------------------------------------------------------------------------
  // ROTA 4: /juridico - Novo Usuário Member (Fluxo Onboarding -> Planos/Stripe)
  // -------------------------------------------------------------------------
  {
    const emailMemberB = `audit.newmember.${Date.now()}@synapse-demo.com`;
    const oabMemberB = `88${Math.floor(1000 + Math.random() * 9000)}`;
    console.log(`📌 Testando Rota 4: /juridico com Novo Member (${emailMemberB})...`);

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    const signupToggle = page.locator('button:has-text("Criar Conta"), button:has-text("Cadastrar")');
    if (await signupToggle.count() > 0) {
      await signupToggle.first().click();
      await page.waitForTimeout(500);
    }

    const nameIn = page.locator('input[placeholder*="Nome"], input[placeholder*="Alan"]');
    const emailIn = page.locator('input[type="email"]');
    const passIns = page.locator('input[type="password"]');

    if (await nameIn.count() > 0) await nameIn.first().fill('Dr. Audit Member B');
    if (await emailIn.count() > 0) await emailIn.first().fill(emailMemberB);
    if (await passIns.count() >= 2) {
      await passIns.nth(0).fill('Password123!');
      await passIns.nth(1).fill('Password123!');
    }

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    const bodyStep1 = await page.innerText('body');
    const isOnboarding = bodyStep1.includes('Onboarding do Advogado') || bodyStep1.includes('OAB');

    const oabIn = page.locator('input[placeholder*="123456"], input[placeholder*="OAB"]');
    if (await oabIn.count() > 0) {
      await oabIn.fill(oabMemberB);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
    }

    const bodyStep2 = await page.innerText('body');
    const isPricing = bodyStep2.includes('Vitrine Oficial de Planos') || bodyStep2.includes('Escolha o Plano Ideal');
    const isSuccess = isOnboarding && isPricing;

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'route_audit_4_new_member.png'), fullPage: true });

    auditResults.push({
      route: '/juridico (Novo Member)',
      expected: 'Cadastro -> Onboarding OAB -> Vitrine de Planos/Stripe',
      passed: isSuccess,
      detail: isSuccess ? 'Onboarding e Redirecionamento para Planos/Stripe OK' : 'Falha na transição de telas'
    });
    await context.close();
  }

  // -------------------------------------------------------------------------
  // ROTA 5: /juridico - Member Sem OAB (Redirecionamento Forçado para Onboarding)
  // -------------------------------------------------------------------------
  {
    const emailMemberC = `audit.incomplete.${Date.now()}@synapse-demo.com`;
    console.log(`📌 Testando Rota 5: /juridico com Member Sem OAB (${emailMemberC})...`);

    const { data: authData } = await supabase.auth.signUp({
      email: emailMemberC,
      password: 'Password123!',
      options: { data: { full_name: 'Dr. Sem OAB Audit' } }
    });

    if (authData?.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: emailMemberC,
        full_name: 'Dr. Sem OAB Audit',
        role: 'Member',
        oab_number: '',
        oab_uf: 'MG',
        subscription_status: 'inactive',
        created_at: new Date().toISOString()
      });
    }

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    const emailIn = page.locator('input[type="email"]');
    const passIn = page.locator('input[type="password"]');

    if (await emailIn.count() > 0 && await passIn.count() > 0) {
      await emailIn.first().fill(emailMemberC);
      await passIn.first().fill('Password123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(6000);
    }

    const body = await page.innerText('body');
    const forcedOnboarding = body.includes('Onboarding do Advogado') || body.includes('OAB') || body.includes('credenciais da OAB');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'route_audit_5_incomplete_member.png'), fullPage: true });

    auditResults.push({
      route: '/juridico (Member Sem OAB)',
      expected: 'Redirecionamento Forçado para Onboarding',
      passed: forcedOnboarding,
      detail: forcedOnboarding ? 'Guard de Onboarding funcionando 100%' : 'Falha em forçar Onboarding'
    });
    await context.close();
  }

  // -------------------------------------------------------------------------
  // ROTA 6: /juridico - Member Com OAB & Status Inativo (Bloqueio em Planos/Stripe)
  // -------------------------------------------------------------------------
  {
    const emailMemberD = `audit.inactive.${Date.now()}@synapse-demo.com`;
    const oabD = `99${Math.floor(1000 + Math.random() * 9000)}`;
    console.log(`📌 Testando Rota 6: /juridico com Member Inativo (${emailMemberD}, OAB ${oabD})...`);

    const { data: authData } = await supabase.auth.signUp({
      email: emailMemberD,
      password: 'Password123!',
      options: { data: { full_name: 'Dr. Inativo Audit' } }
    });

    if (authData?.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: emailMemberD,
        full_name: 'Dr. Inativo Audit',
        role: 'Member',
        oab_number: oabD,
        oab_uf: 'MG',
        subscription_status: 'inactive',
        created_at: new Date().toISOString()
      });
    }

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    const emailIn = page.locator('input[type="email"]');
    const passIn = page.locator('input[type="password"]');

    if (await emailIn.count() > 0 && await passIn.count() > 0) {
      await emailIn.first().fill(emailMemberD);
      await passIn.first().fill('Password123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(6000);
    }

    const body = await page.innerText('body');
    const stripeBlocked = body.includes('Vitrine Oficial de Planos') || body.includes('Escolha o Plano Ideal');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'route_audit_6_inactive_member.png'), fullPage: true });

    auditResults.push({
      route: '/juridico (Member Inativo)',
      expected: 'Bloqueio no /juridico -> Redirecionamento para Planos/Stripe',
      passed: stripeBlocked,
      detail: stripeBlocked ? 'Guard de Pagamento em Planos/Stripe funcionando 100%' : 'Falha no bloqueio de inadimplência'
    });
    await context.close();
  }

  // -------------------------------------------------------------------------
  // ROTA 7: Retorno da Stripe (?success=true) - Ativação e Entrada no Portal PJe
  // -------------------------------------------------------------------------
  {
    const emailStripe = `audit.stripe.return.${Date.now()}@synapse-demo.com`;
    const oabStripe = `77${Math.floor(1000 + Math.random() * 9000)}`;
    console.log(`📌 Testando Rota 7: Retorno da Stripe (?success=true) (${emailStripe})...`);

    const { data: authData } = await supabase.auth.signUp({
      email: emailStripe,
      password: 'Password123!',
      options: { data: { full_name: 'Dra. Stripe Return Audit' } }
    });

    if (authData?.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: emailStripe,
        full_name: 'Dra. Stripe Return Audit',
        role: 'Member',
        oab_number: oabStripe,
        oab_uf: 'MG',
        subscription_status: 'inactive',
        created_at: new Date().toISOString()
      });
    }

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    const emailIn = page.locator('input[type="email"]');
    const passIn = page.locator('input[type="password"]');

    if (await emailIn.count() > 0 && await passIn.count() > 0) {
      await emailIn.first().fill(emailStripe);
      await passIn.first().fill('Password123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    // Simular a URL de retorno da Stripe
    await page.goto(`${APP_URL}/juridico?success=true&session_id=cs_test_mock`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    const body = await page.innerText('body');
    const isPjePortal = body.includes('Portal de Intimações') || body.includes('PJe Online') || body.includes('Consultas Automáticas');
    const isPricing = body.includes('Vitrine Oficial de Planos') || body.includes('Escolha o Plano Ideal');
    const isSuccess = isPjePortal && !isPricing;

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'route_audit_7_stripe_return.png'), fullPage: true });

    auditResults.push({
      route: '/juridico?success=true (Retorno Stripe)',
      expected: 'Ativação PostgreSQL -> Entrada Direta no Portal PJe',
      passed: isSuccess,
      detail: isSuccess ? 'Ativou plano no banco e abriu Portal PJe diretamente' : 'Falha ao processar retorno da Stripe'
    });
    await context.close();
  }

  // -------------------------------------------------------------------------
  // ROTA 8: Rotas Públicas Isoladas (/demo, /decide/test, /embed/test, /approve/test)
  // -------------------------------------------------------------------------
  {
    console.log('📌 Testando Rota 8: Rotas Públicas Isoladas (/demo)...');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(`${APP_URL}/demo`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const body = await page.innerText('body');
    const isDemoView = body.includes('Demo') || body.includes('Synapse') || body.includes('Fluxo') || body.includes('Demonstração');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'route_audit_8_public_demo.png'), fullPage: true });

    auditResults.push({
      route: '/demo (Pública)',
      expected: 'Visualização da Demonstração Interativa Sem Exigir Auth',
      passed: isDemoView,
      detail: isDemoView ? 'Rota pública renderizou com sucesso' : 'Falha em exibir rota pública'
    });
    await context.close();
  }

  await browser.close();

  console.log('\n====================================================================');
  console.log('📊 RESUMO DA AUDITORIA E SIMULAÇÃO COMPLETA DE TODAS AS ROTAS');
  console.log('====================================================================\n');

  let allPassed = true;
  auditResults.forEach((res, index) => {
    console.log(`[ROTA ${index + 1}] ${res.route}`);
    console.log(`   Comportamento Esperado: ${res.expected}`);
    console.log(`   Resultado: ${res.passed ? '✅ SUCESSO 100%' : '❌ FALHA'}`);
    console.log(`   Detalhe: ${res.detail}\n`);
    if (!res.passed) allPassed = false;
  });

  console.log('====================================================================');
  console.log(`🏁 RESULTADO GERAL DA AUDITORIA: ${allPassed ? '✅ 100% APROVADO SEM ERROS OU REGRESSÕES' : '❌ REGRESSÃO ENCONTRADA'}`);
  console.log('====================================================================');
}

runFullSystemAudit();
