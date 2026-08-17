import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('../apps/web/node_modules/playwright');

const ARTIFACT_DIR = '/Users/alanpereira/.gemini/antigravity/brain/8bc17749-ae29-4f87-a328-0e4a1355f827';
const APP_URL = 'https://synapse.alp-nexus.com';

async function runFrente1Simulation() {
  console.log('====================================================');
  console.log('🔬 FRENTE 1: SIMULAÇÃO E2E DE DIAGNÓSTICO NO CHROME');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const networkTraces = [];
  const consoleTraces = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleTraces.push({ type, text });
    console.log(`[BROWSER CONSOLE ${type.toUpperCase()}] ${text}`);
  });

  page.on('pageerror', (err) => {
    console.error(`🚨 [UNCAUGHT EXCEPTION] ${err.message}`);
    consoleTraces.push({ type: 'uncaught', text: err.message, stack: err.stack });
  });

  page.on('response', async (res) => {
    const url = res.url();
    const status = res.status();
    let body = '';
    try {
      body = await res.text();
    } catch (e) {}

    networkTraces.push({ url, status, body });
    if (status >= 400 || url.includes('/rest/v1/') || url.includes('/auth/v1/')) {
      console.log(`📡 [NETWORK RESPONSE ${status}] ${url}`);
      if (body) console.log(`   Body: ${body.slice(0, 300)}`);
    }
  });

  try {
    // 1. Acessar /juridico com sessão limpa
    console.log('\n--- 1. Navegando para /juridico ---');
    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    // 2. Mudar para Cadastro
    const signupToggle = page.locator('button:has-text("Criar Conta"), button:has-text("Cadastrar")');
    if (await signupToggle.count() > 0) {
      await signupToggle.first().click();
      await page.waitForTimeout(500);
    }

    const testEmail = `diagnostic.e2e.${Date.now()}@synapse-demo.com`;
    console.log(`\n--- 2. Efetuando cadastro com e-mail: ${testEmail} ---`);

    const nameInput = page.locator('input[placeholder*="Nome"], input[placeholder*="Alan"]');
    const emailInput = page.locator('input[type="email"]');
    const passInputs = page.locator('input[type="password"]');

    if (await nameInput.count() > 0) await nameInput.first().fill('Dr. Advogado Diagnóstico');
    if (await emailInput.count() > 0) await emailInput.first().fill(testEmail);
    if (await passInputs.count() >= 2) {
      await passInputs.nth(0).fill('Password123!');
      await passInputs.nth(1).fill('Password123!');
    }

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3500);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'frente1_step1_signup.png') });

    // 3. Preencher Onboarding
    const oabInput = page.locator('input[placeholder*="123456"], input[placeholder*="OAB"]');
    if (await oabInput.count() > 0) {
      console.log('\n--- 3. Tela de Onboarding Detectada. Disparando Submit com OAB 123456/MG ---');
      await oabInput.fill('123456');

      const submitOnboarding = page.locator('button[type="submit"]');
      await submitOnboarding.click();
      await page.waitForTimeout(4000);

      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'frente1_step2_onboarding_submit.png') });
    }

    console.log('\n--- 4. RESUMO DOS LOGS LITERAIS DO NAVEGADOR ---');
    console.log(`Total de Logs de Console: ${consoleTraces.length}`);
    console.log(`Total de Respostas de Rede: ${networkTraces.length}`);

  } catch (err) {
    console.error('❌ Erro na simulação E2E:', err);
  } finally {
    await browser.close();
    console.log('\n====================================================');
    console.log('🏁 SIMULAÇÃO FRENTE 1 CONCLUÍDA');
    console.log('====================================================');
  }
}

runFrente1Simulation();
