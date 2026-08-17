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

async function runMatrixSimulation() {
  console.log('====================================================');
  console.log('🧪 MATRIZ DE SIMULAÇÃO E2E OBRIGATÓRIA (4 CENÁRIOS CHROME)');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // =========================================================================
  // CENÁRIO A (Master): Login com conta Master em /juridico -> PJe Consulta
  // =========================================================================
  {
    console.log('--- CENÁRIO A (Master): Login com alan.pereira@alp-nexus.com em /juridico ---');
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageA = await contextA.newPage();

    await pageA.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await pageA.evaluate(() => localStorage.clear());

    const emailIn = pageA.locator('input[type="email"]');
    const passIn = pageA.locator('input[type="password"]');

    if (await emailIn.count() > 0 && await passIn.count() > 0) {
      await emailIn.first().fill('alan.pereira@alp-nexus.com');
      await passIn.first().fill('Password123!');
      await pageA.click('button[type="submit"]');
      await pageA.waitForTimeout(6000);
    }

    await pageA.screenshot({ path: path.join(ARTIFACT_DIR, 'cenario_a_master_pje_consulta.png'), fullPage: true });

    const bodyA = await pageA.innerText('body');
    const isPjeConsulta = bodyA.includes('Portal de Intimações') || bodyA.includes('PJe Online') || bodyA.includes('Consultas Automáticas') || bodyA.includes('5001234');
    const isOnboardingOrStripe = bodyA.includes('Onboarding do Advogado') || bodyA.includes('Vitrine Oficial de Planos');

    const isMasterSuccess = isPjeConsulta && !isOnboardingOrStripe;
    console.log(`Log Esperado Cenário A: Acesso direto à tela de Consulta PJe sem Onboarding/Stripe. Resultado: ${isMasterSuccess ? '✅ SUCESSO 100%' : '❌ FALHA'}`);
    await contextA.close();
  }

  // =========================================================================
  // CENÁRIO B (Novo Member): Criar conta nova -> Onboarding -> Preenche OAB -> Planos/Stripe
  // =========================================================================
  {
    const emailB = `cenario.b.newuser.${Date.now()}@synapse-demo.com`;
    const oabB = `44${Math.floor(1000 + Math.random() * 9000)}`;
    console.log(`\n--- CENÁRIO B (Novo Member): Criando conta nova (${emailB}) ---`);

    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageB = await contextB.newPage();

    await pageB.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await pageB.evaluate(() => localStorage.clear());

    const signupToggle = pageB.locator('button:has-text("Criar Conta"), button:has-text("Cadastrar")');
    if (await signupToggle.count() > 0) {
      await signupToggle.first().click();
      await pageB.waitForTimeout(500);
    }

    const nameIn = pageB.locator('input[placeholder*="Nome"], input[placeholder*="Alan"]');
    const emailIn = pageB.locator('input[type="email"]');
    const passIns = pageB.locator('input[type="password"]');

    if (await nameIn.count() > 0) await nameIn.first().fill('Dr. Member Cenário B');
    if (await emailIn.count() > 0) await emailIn.first().fill(emailB);
    if (await passIns.count() >= 2) {
      await passIns.nth(0).fill('Password123!');
      await passIns.nth(1).fill('Password123!');
    }

    await pageB.click('button[type="submit"]');
    await pageB.waitForTimeout(6000);

    const bodyB1 = await pageB.innerText('body');
    const redirectedToOnboarding = bodyB1.includes('Onboarding do Advogado') || bodyB1.includes('OAB');
    console.log(`   Público novo redirecionado para Onboarding: ${redirectedToOnboarding ? '✅ SIM' : '❌ NÃO'}`);

    const oabIn = pageB.locator('input[placeholder*="123456"], input[placeholder*="OAB"]');
    if (await oabIn.count() > 0) {
      console.log(`   Preenchendo OAB ${oabB}/MG e submetendo...`);
      await oabIn.fill(oabB);
      await pageB.click('button[type="submit"]');
      await pageB.waitForTimeout(6000);
    }

    await pageB.screenshot({ path: path.join(ARTIFACT_DIR, 'cenario_b_newmember_stripe_destination.png'), fullPage: true });

    const bodyB2 = await pageB.innerText('body');
    const redirectedToStripe = bodyB2.includes('Vitrine Oficial de Planos') || bodyB2.includes('Escolha o Plano Ideal') || bodyB2.includes('Gerenciar Assinatura') || bodyB2.includes('Light');
    console.log(`Log Esperado Cenário B: Redirecionamento para Onboarding -> OAB -> Planos/Stripe. Resultado: ${redirectedToStripe ? '✅ SUCESSO 100%' : '❌ FALHA'}`);
    await contextB.close();
  }

  // =========================================================================
  // CENÁRIO C (Member Incompleto): Login com conta com e-mail, mas OAB vazia/nula
  // =========================================================================
  {
    const emailC = `cenario.c.incomplete.${Date.now()}@synapse-demo.com`;
    console.log(`\n--- CENÁRIO C (Member Incompleto): Criando conta sem OAB (${emailC}) ---`);

    const { data: authData } = await supabase.auth.signUp({
      email: emailC,
      password: 'Password123!',
      options: { data: { full_name: 'Dr. Incompleto Cenário C' } }
    });

    if (authData?.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: emailC,
        full_name: 'Dr. Incompleto Cenário C',
        role: 'Member',
        oab_number: '',
        oab_uf: 'MG',
        subscription_status: 'inactive',
        created_at: new Date().toISOString()
      });
    }

    const contextC = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageC = await contextC.newPage();

    await pageC.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await pageC.evaluate(() => localStorage.clear());

    const emailIn = pageC.locator('input[type="email"]');
    const passIn = pageC.locator('input[type="password"]');

    if (await emailIn.count() > 0 && await passIn.count() > 0) {
      await emailIn.first().fill(emailC);
      await passIn.first().fill('Password123!');
      await pageC.click('button[type="submit"]');
      await pageC.waitForTimeout(7000);
    }

    await pageC.screenshot({ path: path.join(ARTIFACT_DIR, 'cenario_c_incomplete_onboarding_forced.png'), fullPage: true });

    const bodyC = await pageC.innerText('body');
    const forcedOnboarding = bodyC.includes('Onboarding do Advogado') || bodyC.includes('OAB') || bodyC.includes('credenciais da OAB') || bodyC.includes('Número da OAB');

    console.log(`Log Esperado Cenário C: Redirecionamento forçado e imediato para Onboarding. Resultado: ${forcedOnboarding ? '✅ SUCESSO 100%' : '❌ FALHA'}`);
    await contextC.close();
  }

  // =========================================================================
  // CENÁRIO D (Member Inadimplente/Inativo): Login com OAB salva, mas subscription_status = 'inactive'
  // =========================================================================
  {
    const emailD = `cenario.d.inactive.${Date.now()}@synapse-demo.com`;
    const oabD = `55${Math.floor(1000 + Math.random() * 9000)}`;
    console.log(`\n--- CENÁRIO D (Member Inativo): Criando conta com OAB (${oabD}) e status = inactive (${emailD}) ---`);

    const { data: authDataD } = await supabase.auth.signUp({
      email: emailD,
      password: 'Password123!',
      options: { data: { full_name: 'Dr. Inativo Cenário D' } }
    });

    if (authDataD?.user) {
      await supabase.from('profiles').upsert({
        id: authDataD.user.id,
        email: emailD,
        full_name: 'Dr. Inativo Cenário D',
        role: 'Member',
        oab_number: oabD,
        oab_uf: 'MG',
        subscription_status: 'inactive',
        created_at: new Date().toISOString()
      });
    }

    const contextD = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageD = await contextD.newPage();

    await pageD.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await pageD.evaluate(() => localStorage.clear());

    const emailIn = pageD.locator('input[type="email"]');
    const passIn = pageD.locator('input[type="password"]');

    if (await emailIn.count() > 0 && await passIn.count() > 0) {
      await emailIn.first().fill(emailD);
      await passIn.first().fill('Password123!');
      await pageD.click('button[type="submit"]');
      await pageD.waitForTimeout(7000);
    }

    await pageD.screenshot({ path: path.join(ARTIFACT_DIR, 'cenario_d_inactive_stripe_blocked.png'), fullPage: true });

    const bodyD = await pageD.innerText('body');
    const stripeBlocked = bodyD.includes('Vitrine Oficial de Planos') || bodyD.includes('Escolha o Plano Ideal') || bodyD.includes('Gerenciar Assinatura') || bodyD.includes('Light');

    console.log(`Log Esperado Cenário D: Bloqueio na rota /juridico e redirecionamento forçado para Planos/Stripe. Resultado: ${stripeBlocked ? '✅ SUCESSO 100%' : '❌ FALHA'}`);
    await contextD.close();
  }

  await browser.close();
  console.log('\n====================================================');
  console.log('🏁 MATRIZ DE SIMULAÇÃO E2E DOS 4 CENÁRIOS CONCLUÍDA');
  console.log('====================================================');
}

runMatrixSimulation();
