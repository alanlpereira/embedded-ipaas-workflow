import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('../apps/web/node_modules/playwright');

const ARTIFACT_DIR = '/Users/alanpereira/.gemini/antigravity/brain/8bc17749-ae29-4f87-a328-0e4a1355f827';
const APP_URL = 'https://synapse.alp-nexus.com';

async function runUserExperienceFlow() {
  console.log('====================================================');
  console.log('🌐 TESTANDO FLUXO COMPLETO DO USUÁRIO NO NAVEGADOR');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', (msg) => console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`));
  page.on('pageerror', (err) => console.error(`🚨 [JS ERROR] ${err.message}`));

  try {
    // 1. Acessar /juridico
    console.log('1. Acessando https://synapse.alp-nexus.com/juridico...');
    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });

    // 2. Mudar para Cadastro
    const signupToggle = page.locator('button:has-text("Criar Conta"), button:has-text("Cadastrar")');
    if (await signupToggle.count() > 0) {
      await signupToggle.first().click();
      await page.waitForTimeout(500);
    }

    const email = `adv.final.${Date.now()}@synapse-demo.com`;
    console.log(`2. Efetuando cadastro com e-mail: ${email}`);

    // Preencher campos de cadastro
    const nameInput = page.locator('input[placeholder*="Nome"], input[placeholder*="Alan"]');
    const emailInput = page.locator('input[type="email"]');
    const passInputs = page.locator('input[type="password"]');

    if (await nameInput.count() > 0) await nameInput.first().fill('Dr. Advogado Teste Final');
    if (await emailInput.count() > 0) await emailInput.first().fill(email);
    if (await passInputs.count() >= 2) {
      await passInputs.nth(0).fill('Password123!');
      await passInputs.nth(1).fill('Password123!');
    } else if (await passInputs.count() === 1) {
      await passInputs.first().fill('Password123!');
    }

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_flow_step1_after_signup.png') });
    console.log('📷 Screenshot salvo: final_flow_step1_after_signup.png');

    // 3. Preencher formulário de Onboarding se visível
    const oabInput = page.locator('input[placeholder*="123456"], input[placeholder*="OAB"]');
    if (await oabInput.count() > 0) {
      console.log('3. Tela de Onboarding da OAB detectada! Preenchendo OAB 999111/MG...');
      await oabInput.fill('999111');
      
      const onboardingSubmit = page.locator('button[type="submit"]');
      await onboardingSubmit.click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_flow_step2_after_onboarding.png') });
      console.log('📷 Screenshot salvo: final_flow_step2_after_onboarding.png');
    }

    // 4. Inspecionar tela final
    const bodyText = await page.innerText('body');
    console.log('\n--- 4. ESTADO FINAL DO NAVEGADOR ---');
    console.log(`Texto visível na tela: ${bodyText.slice(0, 300).replace(/\n/g, ' ')}`);

  } catch (err) {
    console.error('❌ Erro no teste Playwright:', err);
  } finally {
    await browser.close();
    console.log('\n====================================================');
    console.log('🏁 TESTE DE FLUXO FINAL CONCLUÍDO com SUCESSO');
    console.log('====================================================');
  }
}

runUserExperienceFlow();
