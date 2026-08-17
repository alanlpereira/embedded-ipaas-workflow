import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('../apps/web/node_modules/playwright');

const ARTIFACT_DIR = '/Users/alanpereira/.gemini/antigravity/brain/8bc17749-ae29-4f87-a328-0e4a1355f827';
const APP_URL = 'https://synapse.alp-nexus.com';

async function runBrowserAudit() {
  console.log('====================================================');
  console.log('🌐 INICIANDO AUDITORIA FORENSE DE NAVEGADOR (PLAYWRIGHT)');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  const consoleLogs = [];
  const networkErrors = [];
  const networkRequests = [];

  // Listeners de Eventos do Navegador
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, text });
    console.log(`[BROWSER CONSOLE ${type.toUpperCase()}] ${text}`);
  });

  page.on('pageerror', (err) => {
    console.error(`🚨 [UNCAUGHT JS ERROR] ${err.message}`);
    consoleLogs.push({ type: 'pageerror', text: err.message, stack: err.stack });
  });

  page.on('request', (req) => {
    const url = req.url();
    const method = req.method();
    if (url.includes('/rest/v1/') || url.includes('/auth/v1/')) {
      const postData = req.postData();
      networkRequests.push({ method, url, postData });
      console.log(`📡 [HTTP ${method}] ${url} ${postData ? `| Payload: ${postData}` : ''}`);
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    const status = res.status();
    if (status >= 400) {
      let bodyText = '';
      try {
        bodyText = await res.text();
      } catch (e) {}
      networkErrors.push({ url, status, statusText: res.statusText(), body: bodyText });
      console.error(`❌ [HTTP ${status} FAILED] ${url} | Resposta: ${bodyText}`);
    }
  });

  try {
    // 1. Navegar para a rota /juridico
    console.log(`\n--- 1. Navegando para ${APP_URL}/juridico ---`);
    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle', timeout: 30000 });
    
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_step1_juridico_login.png'), fullPage: true });
    console.log('📷 Screenshot salvo: audit_step1_juridico_login.png');

    // 2. Inspecionar campos do formulário
    console.log('\n--- 2. Inspecionando elementos do formulário de login ---');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    console.log(`Campos encontrados: Email inputs (${await emailInput.count()}), Password inputs (${await passwordInput.count()})`);

    // 3. Testar Login com Usuário Master existente
    console.log('\n--- 3. Testando Login com conta Master (alan.pereira@alp-nexus.com) ---');
    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      await emailInput.first().fill('alan.pereira@alp-nexus.com');
      await passwordInput.first().fill('Password123!');
      
      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        await page.waitForTimeout(4000);
      }
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_step3_master_dashboard.png'), fullPage: true });
    console.log('📷 Screenshot salvo: audit_step3_master_dashboard.png');

    // 4. Testar Rota Raiz (synapse.alp-nexus.com/)
    console.log(`\n--- 4. Navegando para Domínio Raiz (${APP_URL}/) ---`);
    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_step4_root_builder.png'), fullPage: true });
    console.log('📷 Screenshot salvo: audit_step4_root_builder.png');

  } catch (err) {
    console.error('❌ Erro durante a automação do navegador:', err);
  } finally {
    await browser.close();
    console.log('\n====================================================');
    console.log('🏁 AUDITORIA DE NAVEGADOR CONCLUÍDA COM SUCESSO');
    console.log('====================================================');
  }
}

runBrowserAudit();
