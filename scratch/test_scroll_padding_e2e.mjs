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

async function testScrollPaddingE2E() {
  console.log('⚡ Testando rolagem estendida (paddingBottom: 120px) para evitar sobreposição do WhatsApp...');

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

    // Rolar até o fim da página
    await page.evaluate(() => {
      const scrollable = document.querySelector('div[style*="overflowY: auto"]') || document.querySelector('main') || window;
      if (scrollable) {
        scrollable.scrollTo ? scrollable.scrollTo(0, 99999) : (scrollable.scrollTop = 99999);
      }
    });

    await page.waitForTimeout(1000);

    const screenshotPath = path.join(ARTIFACT_DIR, 'whatsapp_scroll_padding_clear.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`✅ Screenshot de validação de rolagem capturado em: ${screenshotPath}`);

  } catch (err) {
    console.error('❌ Erro na simulação Playwright:', err);
  } finally {
    await browser.close();
  }
}

testScrollPaddingE2E();
