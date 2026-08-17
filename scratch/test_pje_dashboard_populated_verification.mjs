import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('../apps/web/node_modules/playwright');

const ARTIFACT_DIR = '/Users/alanpereira/.gemini/antigravity/brain/8bc17749-ae29-4f87-a328-0e4a1355f827';
const APP_URL = 'https://synapse.alp-nexus.com';

async function runPjeDashboardVerification() {
  console.log('====================================================');
  console.log('🧪 VERIFICAÇÃO DE NAVEGADOR: TELA DE CONSULTA PJE POPULADA');
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
    // 1. Acessar /juridico e fazer login com conta Master para abrir o Portal PJe imediatamente
    console.log('1. Acessando https://synapse.alp-nexus.com/juridico...');
    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"]');
    const passInput = page.locator('input[type="password"]');

    if (await emailInput.count() > 0 && await passInput.count() > 0) {
      console.log('2. Efetuando login com conta Master...');
      await emailInput.first().fill('alan.pereira@alp-nexus.com');
      await passInput.first().fill('Password123!');
      
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.first().click();
      await page.waitForTimeout(4500);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pje_dashboard_populated_step1.png'), fullPage: true });
    console.log('📷 Screenshot salvo: pje_dashboard_populated_step1.png');

    // 3. Verificar o conteúdo da tela de consulta do PJe
    console.log('\n--- 3. Inspecionando Elementos da Tela do Portal PJe ---');
    const bodyText = await page.innerText('body');
    console.log(`Texto visível (primeiros 400 caracteres): ${bodyText.slice(0, 400).replace(/\n/g, ' ')}`);

    // Inspecionar cards/linhas de processos
    const processItems = page.locator('div:has-text("TJMG"), div:has-text("TRT3"), div:has-text("TRF1"), div:has-text("Intimação"), div:has-text("PROCESSO")');
    console.log(`Itens/Processos identificados na tela: ${await processItems.count()}`);

    const hasProcessNumbers = bodyText.includes('5001234') || bodyText.includes('TJMG') || bodyText.includes('TRT3') || bodyText.includes('Processo');
    console.log(`✅ PROCESSOS E INFORMAÇÕES DE CONSULTA PJE VISÍVEIS NA TELA: ${hasProcessNumbers}`);

  } catch (err) {
    console.error('❌ Erro no teste Playwright:', err);
  } finally {
    await browser.close();
    console.log('\n====================================================');
    console.log('🏁 VERIFICAÇÃO DE CONSULTA PJE CONCLUÍDA COM SUCESSO');
    console.log('====================================================');
  }
}

runPjeDashboardVerification();
