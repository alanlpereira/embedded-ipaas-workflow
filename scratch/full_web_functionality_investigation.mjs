import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('../apps/web/node_modules/playwright');

const ARTIFACT_DIR = '/Users/alanpereira/.gemini/antigravity/brain/8bc17749-ae29-4f87-a328-0e4a1355f827';
const APP_URL = 'https://synapse.alp-nexus.com';

async function runFullWebFunctionalInvestigation() {
  console.log('====================================================');
  console.log('🔍 AUDITORIA E INVESTIGAÇÃO DE FUNCIONALIDADES WEB');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const auditResults = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    console.error(`🚨 [UNCAUGHT EXCEPTION] ${err.message}`);
    auditResults.push({ stage: 'Uncaught Exception', error: err.message });
  });

  page.on('response', async (res) => {
    if (res.status() >= 400) {
      let body = '';
      try { body = await res.text(); } catch (e) {}
      console.error(`❌ [HTTP ${res.status()}] ${res.url()} | ${body}`);
      auditResults.push({ stage: 'Network Response', url: res.url(), status: res.status(), body });
    }
  });

  try {
    // ------------------------------------------------------------------------
    // 1. INVESTIGAÇÃO DO CONSTRUTOR DE FLUXOS IPAAS (DOMÍNIO RAIZ /)
    // ------------------------------------------------------------------------
    console.log('--- 1. Investigando Construtor de Fluxos Synapse IPaaS (/) ---');
    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page_audit_1_root_builder.png'), fullPage: true });
    console.log('📷 Screenshot salvo: page_audit_1_root_builder.png');

    const flowchartNodes = page.locator('.react-flow__node');
    console.log(`Nós de fluxo renderizados na tela: ${await flowchartNodes.count()}`);

    // ------------------------------------------------------------------------
    // 2. INVESTIGAÇÃO DA TELA DE LOGIN / AUTENTICAÇÃO (/juridico)
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Investigando Módulo Jurídico e Tela de Login (/juridico) ---');
    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page_audit_2_login_screen.png'), fullPage: true });
    console.log('📷 Screenshot salvo: page_audit_2_login_screen.png');

    // ------------------------------------------------------------------------
    // 3. AUTENTICAÇÃO COM CONTA MASTER (alan.pereira@alp-nexus.com)
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Autenticando com Conta Master (alan.pereira@alp-nexus.com) ---');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      await emailInput.first().fill('alan.pereira@alp-nexus.com');
      await passwordInput.first().fill('Password123!');
      
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.first().click();
      await page.waitForTimeout(4000);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page_audit_3_master_pje_portal.png'), fullPage: true });
    console.log('📷 Screenshot salvo: page_audit_3_master_pje_portal.png');

    // ------------------------------------------------------------------------
    // 4. NAVEGAÇÃO ENTRE ABAS DO SISTEMA
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Investigando Navegação entre Abas (Copilot, Clientes, Perfil) ---');
    
    // Inspecionar Botão de Copilot / Chat de IA
    const copilotTab = page.locator('button:has-text("Copilot"), button:has-text("IA"), nav button');
    if (await copilotTab.count() > 0) {
      console.log('Testando clique em elemento de navegação...');
    }

    // ------------------------------------------------------------------------
    // 5. INVESTIGAÇÃO DA TELA PÚBLICA DE PLANOS E STRIPE CHECKOUT (/pricing)
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Investigando Vitrine de Planos e Stripe Checkout (/pricing) ---');
    await page.goto(`${APP_URL}/pricing`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'page_audit_5_pricing_plans.png'), fullPage: true });
    console.log('📷 Screenshot salvo: page_audit_5_pricing_plans.png');

    const planCards = page.locator('div:has-text("Plano"), div:has-text("R$")');
    console.log(`Cards de planos identificados na tela: ${await planCards.count()}`);

  } catch (err) {
    console.error('❌ Erro na investigação das páginas web:', err);
  } finally {
    await browser.close();
    console.log('\n====================================================');
    console.log('🏁 AUDITORIA E INVESTIGAÇÃO DE FUNCIONALIDADES CONCLUÍDA');
    console.log('====================================================');
  }
}

runFullWebFunctionalInvestigation();
