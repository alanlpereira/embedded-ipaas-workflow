import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Testando com a chave pública/servidor do Gemini do projeto
const apiKey = process.env.VITE_GEMINI_API_KEY || 'AIzaSyA_dummy';

async function testGeminiModelsDirect() {
  console.log('⚡ Testando chamada direta à API do Google Gemini...');

  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp', 'gemini-2.0-flash'];

  for (const mName of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Responda em 1 frase curta: Olá!' }] }]
        })
      });

      const text = await res.text();
      console.log(`- Modelo ${mName}: Status HTTP ${res.status}`);
      if (res.ok) {
        console.log(`  ✅ Resposta: ${text.slice(0, 200)}`);
      } else {
        console.log(`  ⚠️ Erro: ${text.slice(0, 200)}`);
      }
    } catch (e) {
      console.error(`❌ Exceção ${mName}:`, e.message);
    }
  }
}

testGeminiModelsDirect();
