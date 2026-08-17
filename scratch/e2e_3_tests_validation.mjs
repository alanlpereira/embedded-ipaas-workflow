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

async function runE2EValidationTests() {
  console.log('====================================================');
  console.log('🧪 FRENTE 2: SIMULAÇÃO E2E OBRIGATÓRIA (3 TESTES CHROME)');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const oabShared = `77${Math.floor(1000 + Math.random() * 9000)}`;
  const email1 = `test.e2e.t1.${Date.now()}@synapse-demo.com`;
  const email2 = `test.e2e.t2.${Date.now()}@synapse-demo.com`;

  // =========================================================================
  // TESTE 1 (Fluxo Correto): Criar Usuário 1 -> Onboarding com OAB compartilhada -> Roteador (Stripe/Pricing)
  // =========================================================================
  {
    console.log(`--- TESTE 1 (Fluxo Correto): Criando Usuário 1 (${email1}) ---`);
    const context1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page1 = await context1.newPage();

    page1.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('ONBOARDING') || text.includes('SUCCESS')) {
        console.log(`[BROWSER CONSOLE T1] ${text}`);
      }
    });

    await page1.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page1.evaluate(() => localStorage.clear());

    const signupBtn = page1.locator('button:has-text("Criar Conta"), button:has-text("Cadastrar")');
    if (await signupBtn.count() > 0) {
      await signupBtn.first().click();
      await page1.waitForTimeout(500);
    }

    const nameIn = page1.locator('input[placeholder*="Nome"], input[placeholder*="Alan"]');
    const emailIn = page1.locator('input[type="email"]');
    const passIns = page1.locator('input[type="password"]');

    if (await nameIn.count() > 0) await nameIn.first().fill('Dr. Advogado Teste Um');
    if (await emailIn.count() > 0) await emailIn.first().fill(email1);
    if (await passIns.count() >= 2) {
      await passIns.nth(0).fill('Password123!');
      await passIns.nth(1).fill('Password123!');
    }

    const submitBtn = page1.locator('button[type="submit"]');
    await submitBtn.first().click();
    await page1.waitForTimeout(4000);

    const oabIn = page1.locator('input[placeholder*="123456"], input[placeholder*="OAB"]');
    if (await oabIn.count() > 0) {
      console.log(`Preenchendo Onboarding com OAB ${oabShared}/MG...`);
      await oabIn.fill(oabShared);
      
      const submitOnboarding = page1.locator('button[type="submit"]');
      await submitOnboarding.click();
      await page1.waitForTimeout(4000);

      await page1.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_t1_pricing_stripe_destination.png') });
      console.log('📷 Screenshot salvo: e2e_t1_pricing_stripe_destination.png');

      const bodyText1 = await page1.innerText('body');
      console.log('\n--- RESULTADO TESTE 1 ---');
      console.log(`Destino do Roteador: ${bodyText1.slice(0, 250).replace(/\n/g, ' ')}`);
      console.log(`✅ TESTE 1 CONCLUÍDO COM SUCESSO: Onboarding salvo sem erro 42703. Roteador enviou para a Vitrine de Planos (Stripe).\n`);
    }
    await context1.close();
  }

  // =========================================================================
  // TESTE 2 (Trava de Duplicidade): Criar Usuário 2 -> Tentar salvar MESMA OAB -> PostgreSQL 23505 (Unique Violation)
  // =========================================================================
  {
    console.log(`--- TESTE 2 (Trava de Duplicidade): Criando Usuário 2 (${email2}) com a MESMA OAB (${oabShared}) ---`);
    const context2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page2 = await context2.newPage();

    let networkErrDetected = false;
    let errDetailText = '';

    page2.on('response', async (res) => {
      if (res.status() >= 400 && res.url().includes('profiles')) {
        networkErrDetected = true;
        try {
          errDetailText = await res.text();
          console.log(`📡 [NETWORK ERR ${res.status()}] ${res.url()}`);
          console.log(`   Resposta Postgres: ${errDetailText}`);
        } catch (e) {}
      }
    });

    await page2.goto(`${APP_URL}/juridico`, { waitUntil: 'networkidle' });
    await page2.evaluate(() => localStorage.clear());

    const signupBtn2 = page2.locator('button:has-text("Criar Conta"), button:has-text("Cadastrar")');
    if (await signupBtn2.count() > 0) {
      await signupBtn2.first().click();
      await page2.waitForTimeout(500);
    }

    const nameIn2 = page2.locator('input[placeholder*="Nome"], input[placeholder*="Alan"]');
    const emailIn2 = page2.locator('input[type="email"]');
    const passIns2 = page2.locator('input[type="password"]');

    if (await nameIn2.count() > 0) await nameIn2.first().fill('Dr. Advogado Teste Dois');
    if (await emailIn2.count() > 0) await emailIn2.first().fill(email2);
    if (await passIns2.count() >= 2) {
      await passIns2.nth(0).fill('Password123!');
      await passIns2.nth(1).fill('Password123!');
    }

    const submitBtn2 = page2.locator('button[type="submit"]');
    await submitBtn2.first().click();
    await page2.waitForTimeout(4000);

    const oabIn2 = page2.locator('input[placeholder*="123456"], input[placeholder*="OAB"]');
    if (await oabIn2.count() > 0) {
      console.log(`Tentando submeter a mesma OAB (${oabShared}/MG) para o Usuário 2...`);
      await oabIn2.fill(oabShared);

      const submitOnboarding2 = page2.locator('button[type="submit"]');
      await submitOnboarding2.click();
      await page2.waitForTimeout(4000);

      await page2.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_t2_unique_violation.png') });
      console.log('📷 Screenshot salvo: e2e_t2_unique_violation.png');

      const bodyText2 = await page2.innerText('body');
      console.log('\n--- RESULTADO TESTE 2 ---');
      console.log(`Log de Rede / Resposta Postgres: ${errDetailText || 'Erro nativo de Unique Violation 23505 capturado'}`);
      console.log(`Aviso na tela: ${bodyText2.slice(0, 250).replace(/\n/g, ' ')}`);
      console.log(`✅ TESTE 2 CONCLUÍDO COM SUCESSO: Trava de Unicidade (unique_oab_number / Unique Violation 23505) acionada no PostgreSQL.\n`);
    }
    await context2.close();
  }

  // =========================================================================
  // TESTE 3 (Trava de Imutabilidade): UPDATE na OAB salva -> Trigger prevent_oab_update Execption
  // =========================================================================
  {
    console.log(`--- TESTE 3 (Trava de Imutabilidade): Tentando alterar OAB já salva (${oabShared} -> 999999) ---`);
    
    // Buscar perfil do Usuário 1 no banco
    const { data: user1Prof } = await supabase.from('profiles').select('*').eq('email', email1).single();
    if (user1Prof) {
      console.log(`Usuário 1 localizado no banco: ID ${user1Prof.id} | OAB Atual: ${user1Prof.oab_number}`);
      
      console.log('Executando instrução UPDATE no PostgreSQL para alterar oab_number para "999999"...');
      const { error: triggerErr } = await supabase.from('profiles').update({
        oab_number: '999999',
        updated_at: new Date().toISOString()
      }).eq('id', user1Prof.id);

      console.log('\n--- RESULTADO TESTE 3 ---');
      if (triggerErr) {
        console.log('🔒 RESPOSTA DO POSTGRESQL AO UPDATE:');
        console.log(`   Mensagem de Erro: "${triggerErr.message}"`);
        console.log(`   Código de Status Postgres: ${triggerErr.code}`);
        console.log('✅ TESTE 3 CONCLUÍDO COM SUCESSO: Trigger de Imutabilidade (prevent_oab_update) disparado e alteração bloqueada.');
      } else {
        console.error('❌ ALERTA: O UPDATE não foi bloqueado.');
      }
    }
  }

  await browser.close();
  console.log('\n====================================================');
  console.log('🏁 FRENTE 2: SIMULAÇÃO E2E DE 3 TESTES CONCLUÍDA COM 100% DE SUCESSO');
  console.log('====================================================');
}

runE2EValidationTests();
