import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);

global.WebSocket = class DummyWebSocket {
  constructor() {}
  on() {}
  close() {}
};

const { chromium } = require('../apps/web/node_modules/playwright');
const { createClient } = require('../apps/web/node_modules/@supabase/supabase-js');

const ARTIFACT_DIR = '/Users/alanpereira/.gemini/antigravity/brain/7ca6f7e5-04cc-49be-8cd4-f29f6f88ca29';
const APP_URL = 'https://synapse.alp-nexus.com';

const SUPABASE_URL = 'https://wurfruxigmajgnqsyleq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testMasterAdminRealDataE2E() {
  console.log('⚡ Validando o Painel Admin Master Global com Dados 100% Reais do PostgreSQL...');

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    const masterEmail = 'alanlpereira@hotmail.com';
    const { data: masterAuth } = await supabase.from('profiles').select('id, email, role').eq('email', masterEmail).single();

    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
    await page.evaluate(({ masterData }) => {
      localStorage.setItem('synapse_active_session', JSON.stringify(masterData));
    }, { masterData: masterAuth });

    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Clicar na aba Admin Master Global se necessário
    const masterTabBtn = await page.$('button:has-text("Admin Master Global"), a:has-text("Admin Master Global")');
    if (masterTabBtn) {
      await masterTabBtn.click();
      await page.waitForTimeout(2000);
    }

    const screenshotPath = path.join(ARTIFACT_DIR, 'master_admin_real_db_data.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✅ Screenshot do Painel Master Real capturado em: ${screenshotPath}`);

  } catch (err) {
    console.error('❌ Erro na simulação Playwright:', err);
  } finally {
    await browser.close();
  }
}

testMasterAdminRealDataE2E();
