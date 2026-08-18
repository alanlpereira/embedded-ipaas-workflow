import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const SUPABASE_URL = 'https://wurfruxigmajgnqsyleq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';

async function testLlmRouterDirect() {
  console.log('⚡ Testando a resposta direta da Edge Function llm-router atualizada...');

  const prompt = 'Elabore uma petição inicial de Ação de Cobrança c/c Indenização por Danos Morais para um cliente que não recebeu pelo serviço prestado de advocacia no valor de R$ 50.000,00.';

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/llm-router`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        action_type: 'gerar_peca',
        prompt: prompt,
        userId: '2ee2b924-8c34-4a8c-a882-2d120d128267' // alan.pereira@alp-nexus.com (Master)
      })
    });

    const data = await res.json();
    console.log(`📊 Status HTTP: ${res.status}`);
    console.log('   Provider Usado:', data.providerUsed || 'N/A');
    console.log('   Modelo Usado:', data.modelUsed || 'N/A');
    console.log('   Tamanho da Resposta (caracteres):', (data.reply || data.text || data.response || JSON.stringify(data)).length);
    console.log('\n--- PRIMEIRA PARTE DA RESPOSTA DE IA (PRIMEIROS 800 CHARS) ---');
    console.log((data.reply || data.text || data.response || JSON.stringify(data, null, 2)).slice(0, 800));

  } catch (err) {
    console.error('❌ Erro no teste llm-router:', err);
  }
}

testLlmRouterDirect();
