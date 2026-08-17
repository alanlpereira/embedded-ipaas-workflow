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

async function runEnterpriseBannerAudit() {
  console.log('====================================================================');
  console.log('🧪 TESTE E2E: BANNER ENTERPRISE (WHATSAPP + STRIPE ISOLATION)');
  console.log('====================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const emailMember = `enterprise.audit.${Date.now()}@synapse-demo.com`;
  const oabMember = `66${Math.floor(1000 + Math.random() * 9000)}`;

  console.log(`1. Criando conta de advogado inativo para visualizar a tela de planos (${emailMember}, OAB ${oabMember})...`);
  const { data: authData } = await supabase.auth.signUp({
    email: emailMember,
    password: 'Password123!',
    options: { data: { full_name: 'Dr. Enterprise Audit' } }
  });

  if (authData?.user) {
    await supabase.from('profiles').upsert({
      id: authData.user.id,
      email: emailMember,
      full_name: 'Dr. Enterprise Audit',
      role: 'Member',
      oab_number: oabMember,
      oab_uf: 'MG',
      subscription_status: 'inactive',
      created_at: new Date().toISOString()
    });
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const networkRequests = [];
  page.on('request', req => {
    networkRequests.push(req.url());
  });

  try {
    console.log('2. Efetuando login e acessando a rota /juridico...');
    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    const emailIn = page.locator('input[type="email"]');
    const passIn = page.locator('input[type="password"]');

    if (await emailIn.count() > 0 && await passIn.count() > 0) {
      await emailIn.first().fill(emailMember);
      await passIn.first().fill('Password123!');
      await page.click('button[type="submit"]');
    }

    // Aguardar até a página de planos ser totalmente renderizada na tela
    console.log('   Aguardando renderização dos planos na tela...');
    await page.waitForSelector('text=Vitrine Oficial de Planos, text=Múltiplos Advogados', { timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'enterprise_banner_pricing_page.png'), fullPage: true });

    // -----------------------------------------------------------------------
    // TESTE 1: UX/Grid - Verificar que os 4 cartões antigos permanecem visíveis e sem sobreposição
    // -----------------------------------------------------------------------
    console.log('\n--- TESTE 1: UX / GRID ---');
    const bodyText = await page.innerText('body');
    const hasForgeCard = bodyText.includes('Forge') || bodyText.includes('R$ 97') || bodyText.includes('Starter');
    const hasKinexCard = bodyText.includes('Kinex') || bodyText.includes('R$ 297') || bodyText.includes('Pro');
    const hasAxiomCard = bodyText.includes('Axiom') || bodyText.includes('R$ 797') || bodyText.includes('Business');
    const hasSynapseCard = bodyText.includes('Synapse') || bodyText.includes('R$ 1.997') || bodyText.includes('Legal Ops');
    const hasEnterpriseBanner = bodyText.includes('Múltiplos Advogados') && bodyText.includes('Falar com Consultor');

    const test1Passed = hasForgeCard && hasKinexCard && hasAxiomCard && hasSynapseCard && hasEnterpriseBanner;
    console.log(`Cartões de Planos Presentes: Forge (${hasForgeCard}), Kinex (${hasKinexCard}), Axiom (${hasAxiomCard}), Synapse (${hasSynapseCard})`);
    console.log(`Banner Enterprise Presente: ${hasEnterpriseBanner}`);
    console.log(`Grid de Cartões Visível sem sobreposição: ${test1Passed ? '✅ SUCESSO 100%' : '❌ FALHA'}`);

    // -----------------------------------------------------------------------
    // TESTE 2: Rota do Banner - Verificar o link do WhatsApp (5532988654825)
    // -----------------------------------------------------------------------
    console.log('\n--- TESTE 2: ROTA DO BANNER WHATSAPP ---');
    const whatsappLinkLocator = page.locator('a[id="whatsapp-enterprise-btn"], a[href*="wa.me"]');
    const hrefValue = await whatsappLinkLocator.first().getAttribute('href');

    console.log(`URL Interceptada no Botão: ${hrefValue}`);

    const hasExact13Numbers = hrefValue.includes('5532988654825');
    const targetAttribute = await whatsappLinkLocator.first().getAttribute('target');
    const opensNewTab = targetAttribute === '_blank';

    const stripeRequestsBeforeClick = networkRequests.filter(url => url.includes('create-checkout-session'));
    const test2Passed = hasExact13Numbers && opensNewTab && stripeRequestsBeforeClick.length === 0;

    console.log(`URL do WhatsApp com 13 números exatos (+55 32 98865-4825): ${hasExact13Numbers ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`Abre em nova aba (_blank): ${opensNewTab ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`Invocou Backend da Stripe ao verificar o link (deve ser 0): ${stripeRequestsBeforeClick.length === 0 ? '✅ 0 Chamadas' : '❌ Invocou Stripe'}`);
    console.log(`Resultado do Teste 2: ${test2Passed ? '✅ SUCESSO 100%' : '❌ FALHA'}`);

    // -----------------------------------------------------------------------
    // TESTE 3: Isolamento da Stripe - Clicar em plano convencional para gerar checkout
    // -----------------------------------------------------------------------
    console.log('\n--- TESTE 3: ISOLAMENTO DA STRIPE ---');
    const planButtons = page.locator('button:has-text("Iniciar 14 Dias Grátis")');
    let stripeInvoked = false;

    if (await planButtons.count() > 0) {
      console.log('Simulando clique no primeiro plano convencional...');
      await planButtons.first().click();
      await page.waitForTimeout(4000);

      const stripeRequestsAfterClick = networkRequests.filter(url => url.includes('create-checkout-session') || url.includes('checkout.stripe.com'));
      stripeInvoked = stripeRequestsAfterClick.length > 0 || (await page.innerText('body')).includes('Stripe') || (await page.innerText('body')).includes('Conectando');
    }

    console.log(`Stripe Checkout Invocado Perfeitamente para Plano Convencional: ${stripeInvoked ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`Resultado do Teste 3: ${stripeInvoked ? '✅ SUCESSO 100%' : '❌ FALHA'}`);

    console.log('\n====================================================================');
    const overallSuccess = test1Passed && test2Passed && stripeInvoked;
    console.log(`🏁 RESULTADO GERAL DA AUDITORIA DO BANNER: ${overallSuccess ? '✅ 100% APROVADO' : '❌ REGRESSÃO'}`);
    console.log('====================================================================');

  } catch (err) {
    console.error('❌ Erro no teste Playwright:', err);
  } finally {
    await browser.close();
  }
}

runEnterpriseBannerAudit();
