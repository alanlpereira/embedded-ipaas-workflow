import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('../apps/web/node_modules/playwright');

const ARTIFACT_DIR = '/Users/alanpereira/.gemini/antigravity/brain/8bc17749-ae29-4f87-a328-0e4a1355f827';
const APP_URL = 'https://synapse.alp-nexus.com';

async function testExistingUserLoginFlow() {
  console.log('====================================================');
  console.log('🧪 TESTE E2E: LOGIN DE USUÁRIO JÁ CRIADO -> PORTAL PJE DIRETO');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('PJE') || text.includes('LOGIN') || text.includes('SUCCESS') || text.includes('RBAC')) {
      console.log(`[BROWSER CONSOLE] ${text}`);
    }
  });

  try {
    // 1. Acessar /juridico e fazer login com conta existente (Master / Advogado)
    console.log('1. Acessando https://synapse.alp-nexus.com/juridico...');
    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    console.log('2. Efetuando login com usuário existente (alan.pereira@alp-nexus.com)...');
    const emailIn = page.locator('input[type="email"]');
    const passIn = page.locator('input[type="password"]');

    if (await emailIn.count() > 0 && await passIn.count() > 0) {
      await emailIn.first().fill('alan.pereira@alp-nexus.com');
      await passIn.first().fill('Password123!');
      
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.first().click();
      await page.waitForTimeout(5000);
    }

    // 3. Capturar tela e verificar se o usuário entrou DIRETO NO PORTAL PJE sem passar por escolha de plano
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'existing_user_login_direct_pje_portal.png'), fullPage: true });
    console.log('📷 Screenshot salvo: existing_user_login_direct_pje_portal.png');

    const bodyText = await page.innerText('body');
    console.log('\n--- TEXTO DA PÁGINA FINAL ---');
    console.log(bodyText.slice(0, 700).replace(/\n/g, ' '));

    const isPricingPage = bodyText.includes('Vitrine Oficial de Planos') || bodyText.includes('Escolha o Plano Ideal');
    const isPjeDashboard = bodyText.includes('Portal de Intimações') || bodyText.includes('PJe Online') || bodyText.includes('Consultas Automáticas') || bodyText.includes('5001234');

    console.log(`\n📊 AVISO DE PLANOS EXIBIDO (DEVE SER FALSE): ${isPricingPage}`);
    console.log(`✅ ENTROU DIRETO NO PORTAL PJE (DEVE SER TRUE): ${isPjeDashboard}`);

  } catch (err) {
    console.error('❌ Erro no teste Playwright:', err);
  } finally {
    await browser.close();
    console.log('\n====================================================');
    console.log('🏁 TESTE E2E DE LOGIN DE USUÁRIO EXISTENTE CONCLUÍDO');
    console.log('====================================================');
  }
}

testExistingUserLoginFlow();
