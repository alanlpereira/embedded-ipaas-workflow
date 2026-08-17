import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('../apps/web/node_modules/playwright');

const ARTIFACT_DIR = '/Users/alanpereira/.gemini/antigravity/brain/8bc17749-ae29-4f87-a328-0e4a1355f827';
const APP_URL = 'https://synapse.alp-nexus.com';

async function debugNewUserFlow() {
  console.log('====================================================');
  console.log('🕵️ DEPURANDO FLUXO DE NOVO USUÁRIO ATÉ O DASHBOARD PJE');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const uniqueEmail = `newuser.test.${Date.now()}@synapse-demo.com`;
  const uniqueOab = `88${Math.floor(1000 + Math.random() * 9000)}`;

  page.on('console', (msg) => console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`));
  page.on('pageerror', (err) => console.error(`🚨 [JS ERROR] ${err.message}`));

  try {
    // 1. Cadastrar Novo Usuário
    console.log(`1. Criando novo usuário: ${uniqueEmail} / OAB: ${uniqueOab}...`);
    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    const signupBtn = page.locator('button:has-text("Criar Conta"), button:has-text("Cadastrar")');
    if (await signupBtn.count() > 0) {
      await signupBtn.first().click();
      await page.waitForTimeout(500);
    }

    const nameIn = page.locator('input[placeholder*="Nome"], input[placeholder*="Alan"]');
    const emailIn = page.locator('input[type="email"]');
    const passIns = page.locator('input[type="password"]');

    if (await nameIn.count() > 0) await nameIn.first().fill('Dr. Novo Advogado Teste');
    if (await emailIn.count() > 0) await emailIn.first().fill(uniqueEmail);
    if (await passIns.count() >= 2) {
      await passIns.nth(0).fill('Password123!');
      await passIns.nth(1).fill('Password123!');
    }

    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);

    // 2. Preencher Onboarding
    console.log('2. Preenchendo Onboarding da OAB...');
    const oabIn = page.locator('input[placeholder*="123456"], input[placeholder*="OAB"]');
    if (await oabIn.count() > 0) {
      await oabIn.fill(uniqueOab);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(4000);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'debug_newuser_step1_after_onboarding.png') });
    console.log('📷 Screenshot após Onboarding: debug_newuser_step1_after_onboarding.png');

    // 3. Simular seleção de plano no Pricing Page (para avançar ao Dashboard)
    console.log('3. Inspecionando se caiu no PricingPage e simulando ativação...');
    const bodyTextPricing = await page.innerText('body');
    console.log(`Página atual: ${bodyTextPricing.slice(0, 300).replace(/\n/g, ' ')}`);

    const selectPlanBtn = page.locator('button:has-text("Assinar"), button:has-text("Começar"), button:has-text("Testar")');
    if (await selectPlanBtn.count() > 0) {
      console.log('Clicando no botão do plano para simular o checkout/retorno...');
      await selectPlanBtn.first().click();
      await page.waitForTimeout(4000);
    }

    // Screenshot final
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'debug_newuser_step2_dashboard_view.png'), fullPage: true });
    console.log('📷 Screenshot final do Dashboard: debug_newuser_step2_dashboard_view.png');

    const finalBodyText = await page.innerText('body');
    console.log('\n--- TEXTO DA PÁGINA FINAL ---');
    console.log(finalBodyText.slice(0, 600));

  } catch (err) {
    console.error('❌ Erro no teste Playwright:', err);
  } finally {
    await browser.close();
  }
}

debugNewUserFlow();
