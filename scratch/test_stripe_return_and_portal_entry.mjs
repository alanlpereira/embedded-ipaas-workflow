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

async function testStripeReturnFlow() {
  console.log('====================================================');
  console.log('🧪 TESTE E2E: RETORNO DA STRIPE (?success=true) -> PORTAL PJE DIRETO');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const emailStripe = `stripe.user.${Date.now()}@synapse-demo.com`;
  const oabStripe = `77${Math.floor(1000 + Math.random() * 9000)}`;

  console.log(`1. Criando usuário para teste de retorno da Stripe (${emailStripe}, OAB ${oabStripe})...`);
  const { data: authData } = await supabase.auth.signUp({
    email: emailStripe,
    password: 'Password123!',
    options: { data: { full_name: 'Dra. Stripe Return' } }
  });

  if (authData?.user) {
    await supabase.from('profiles').upsert({
      id: authData.user.id,
      email: emailStripe,
      full_name: 'Dra. Stripe Return',
      role: 'Member',
      oab_number: oabStripe,
      oab_uf: 'MG',
      subscription_status: 'inactive',
      created_at: new Date().toISOString()
    });
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // 1. Fazer login primeiro
    console.log('2. Acessando /juridico e realizando login...');
    await page.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    const emailIn = page.locator('input[type="email"]');
    const passIn = page.locator('input[type="password"]');

    if (await emailIn.count() > 0 && await passIn.count() > 0) {
      await emailIn.first().fill(emailStripe);
      await passIn.first().fill('Password123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    // 2. Simular o retorno da Stripe com ?success=true&session_id=cs_test_mock
    console.log('3. Simulando retorno do Checkout da Stripe com URL /juridico?success=true&session_id=cs_test_mock...');
    await page.goto(`${APP_URL}/juridico?success=true&session_id=cs_test_mock`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'stripe_return_direct_pje_portal.png'), fullPage: true });

    const bodyText = await page.innerText('body');
    console.log('\n--- TEXTO DA PÁGINA APÓS RETORNO DA STRIPE ---');
    console.log(bodyText.slice(0, 500).replace(/\n/g, ' '));

    const isStripePage = bodyText.includes('Vitrine Oficial de Planos') || bodyText.includes('Escolha o Plano Ideal');
    const isPjePortal = bodyText.includes('Portal de Intimações') || bodyText.includes('PJe Online') || bodyText.includes('Consultas Automáticas') || bodyText.includes('5001234');

    console.log(`\n📊 EXIBIU TELA DE PLANOS DE NOVO (DEVE SER FALSE): ${isStripePage}`);
    console.log(`✅ ENTROU DIRETO NO PORTAL PJE APÓS STRIPE (DEVE SER TRUE): ${isPjePortal}`);

  } catch (err) {
    console.error('❌ Erro no teste Playwright:', err);
  } finally {
    await browser.close();
    console.log('\n====================================================');
    console.log('🏁 TESTE E2E DE RETORNO DA STRIPE CONCLUÍDO');
    console.log('====================================================');
  }
}

testStripeReturnFlow();
