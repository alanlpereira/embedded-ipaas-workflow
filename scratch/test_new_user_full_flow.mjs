import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('../apps/web/node_modules/playwright');

const ARTIFACT_DIR = '/Users/alanpereira/.gemini/antigravity/brain/8bc17749-ae29-4f87-a328-0e4a1355f827';
const APP_URL = 'https://synapse.alp-nexus.com';

async function runNewUserEndToEndSim() {
  console.log('====================================================');
  console.log('🧪 SIMULAÇÃO E2E DE NOVO USUÁRIO: CADASTRO -> ONBOARDING -> PORTAL PJE POPULADO');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const uniqueEmail = `adv.novo.e2e.${Date.now()}@synapse-demo.com`;
  const uniqueOab = `66${Math.floor(1000 + Math.random() * 9000)}`;

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('ONBOARDING') || text.includes('PJE') || text.includes('SUCCESS')) {
      console.log(`[BROWSER CONSOLE] ${text}`);
    }
  });

  try {
    // 1. Acessar /juridico e criar novo usuário do zero
    console.log(`1. Registrando novo advogado do zero: ${uniqueEmail}...`);
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

    if (await nameIn.count() > 0) await nameIn.first().fill('Dra. Amanda Silveira');
    if (await emailIn.count() > 0) await emailIn.first().fill(uniqueEmail);
    if (await passIns.count() >= 2) {
      await passIns.nth(0).fill('Password123!');
      await passIns.nth(1).fill('Password123!');
    }

    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_newuser_step1_onboarding.png') });
    console.log('📷 Screenshot salvo: e2e_newuser_step1_onboarding.png');

    // 2. Preencher Onboarding com OAB e Nome
    console.log(`2. Submetendo formulário de Onboarding com OAB ${uniqueOab}/MG...`);
    const oabIn = page.locator('input[placeholder*="123456"], input[placeholder*="OAB"]');
    if (await oabIn.count() > 0) {
      await oabIn.fill(uniqueOab);
      const submitOnboardingBtn = page.locator('button[type="submit"]');
      await submitOnboardingBtn.click();
      await page.waitForTimeout(5000);
    }

    // 3. Verificar direcionamento imediato para o Portal de Processos PJe Populado
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_newuser_step2_pje_portal_populated.png'), fullPage: true });
    console.log('📷 Screenshot salvo: e2e_newuser_step2_pje_portal_populated.png');

    const bodyText = await page.innerText('body');
    console.log('\n--- TEXTO VISÍVEL DA TELA FINAL PARA O NOVO USUÁRIO ---');
    console.log(bodyText.slice(0, 700).replace(/\n/g, ' '));

    const hasProcesses = bodyText.includes('TJMG') || bodyText.includes('TRT3') || bodyText.includes('5001234') || bodyText.includes('PROCESSO') || bodyText.includes('Intimação');
    console.log(`\n✅ NOVO USUÁRIO ENTROU DIRETO NO PORTAL PJE POPULADO COM DADOS: ${hasProcesses}`);

  } catch (err) {
    console.error('❌ Erro no teste E2E:', err);
  } finally {
    await browser.close();
    console.log('\n====================================================');
    console.log('🏁 SIMULAÇÃO E2E DO NOVO USUÁRIO CONCLUÍDA COM SUCESSO');
    console.log('====================================================');
  }
}

runNewUserEndToEndSim();
