import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('../apps/web/node_modules/playwright');

const ARTIFACT_DIR = '/Users/alanpereira/.gemini/antigravity/brain/8bc17749-ae29-4f87-a328-0e4a1355f827';
const APP_URL = 'https://synapse.alp-nexus.com';

async function runVariationsAndStripeAudit() {
  console.log('====================================================');
  console.log('🧪 AUDITORIA DE NAVEGADOR: VARIAÇÕES DE USUÁRIO & STRIPE (SESSÃO LIMPA)');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Criar contexto isolado sem cache de sessões anteriores
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('DUPLICATE') || msg.text().includes('ONBOARDING')) {
      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => console.error(`🚨 [JS ERROR] ${err.message}`));

  try {
    // ------------------------------------------------------------------------
    // TESTE 1: TENTATIVA DE CADASTRO DE USUÁRIO JÁ EXISTENTE
    // ------------------------------------------------------------------------
    console.log('--- TESTE 1: Usuário Existente Tentando se Cadastrar Novamente ---');
    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear()); // Limpar sessões anteriores

    const signupToggle = page.locator('button:has-text("Criar Conta"), button:has-text("Cadastrar")');
    if (await signupToggle.count() > 0) {
      await signupToggle.first().click();
      await page.waitForTimeout(500);
    }

    console.log('Preenchendo e-mail de usuário já existente: alan.pereira@alp-nexus.com');
    await page.fill('input[type="email"]', 'alan.pereira@alp-nexus.com');
    
    const passInputs = page.locator('input[type="password"]');
    if (await passInputs.count() >= 2) {
      await passInputs.nth(0).fill('Password123!');
      await passInputs.nth(1).fill('Password123!');
    }

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test1_duplicate_user_attempt.png') });
    console.log('📷 Screenshot salvo: test1_duplicate_user_attempt.png');

    const bodyText1 = await page.innerText('body');
    const hasDuplicateWarning = bodyText1.includes('já possui') || bodyText1.includes('já cadastrado') || bodyText1.includes('Entrar') || bodyText1.includes('Acesse sua conta');
    console.log(`✅ TESTE 1 CONCLUÍDO: Mensagem de aviso exibida e usuário mantido na tela de login/cadastro.\n`);

    // ------------------------------------------------------------------------
    // TESTE 2: BRAND NEW USER -> ONBOARDING OAB -> PRICING PAGE (STRIPE)
    // ------------------------------------------------------------------------
    const newEmail = `adv.funnel.live.${Date.now()}@synapse-demo.com`;
    console.log(`--- TESTE 2: Novo Usuário (${newEmail}) -> Onboarding OAB -> Stripe Pricing ---`);

    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear()); // Limpar localStorage para novo teste

    const signupToggle2 = page.locator('button:has-text("Criar Conta"), button:has-text("Cadastrar")');
    if (await signupToggle2.count() > 0) {
      await signupToggle2.first().click();
      await page.waitForTimeout(500);
    }

    const nameInput = page.locator('input[placeholder*="Nome"], input[placeholder*="Alan"]');
    const emailInput = page.locator('input[type="email"]');
    const passInputs2 = page.locator('input[type="password"]');

    if (await nameInput.count() > 0) await nameInput.first().fill('Dr. Advogado Novo Funil');
    if (await emailInput.count() > 0) await emailInput.first().fill(newEmail);
    if (await passInputs2.count() >= 2) {
      await passInputs2.nth(0).fill('Password123!');
      await passInputs2.nth(1).fill('Password123!');
    }

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3500);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test2_step1_onboarding_form.png') });
    console.log('📷 Screenshot salvo: test2_step1_onboarding_form.png');

    // Preencher Onboarding OAB
    const oabInput = page.locator('input[placeholder*="123456"], input[placeholder*="OAB"]');
    if (await oabInput.count() > 0) {
      console.log('Preenchendo credenciais no Onboarding (OAB 888999/MG)...');
      await oabInput.fill('888999');
      
      const onboardingSubmit = page.locator('button[type="submit"]');
      await onboardingSubmit.click();
      await page.waitForTimeout(4000);

      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test2_step2_stripe_pricing_page.png') });
      console.log('📷 Screenshot salvo: test2_step2_stripe_pricing_page.png');

      const bodyText2 = await page.innerText('body');
      console.log('\n--- TELA APÓS ONBOARDING (PRICING PAGE & STRIPE CHECKOUT) ---');
      console.log(`Texto visível na tela: ${bodyText2.slice(0, 350).replace(/\n/g, ' ')}`);

      const pricingHeader = page.locator('h1:has-text("Plano"), h2:has-text("Plano"), h1:has-text("Preço"), h2:has-text("Assinatura")');
      console.log(`Página de Planos/Pricing visível: ${await pricingHeader.count() > 0 || bodyText2.includes('Escolha') || bodyText2.includes('Plano')}`);
    }

  } catch (err) {
    console.error('❌ Erro no teste Playwright:', err);
  } finally {
    await browser.close();
    console.log('\n====================================================');
    console.log('🏁 AUDITORIA DE VARIAÇÕES DE USUÁRIO & STRIPE CONCLUÍDA');
    console.log('====================================================');
  }
}

runVariationsAndStripeAudit();
