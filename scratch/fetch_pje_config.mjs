async function fetchPjeConfig() {
  console.log('🔍 BUSCANDO CONFIGURAÇÃO DE BACKEND EM https://comunica.pje.jus.br/assets/config/config.json...');

  try {
    const res = await fetch('https://comunica.pje.jus.br/assets/config/config.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    console.log(`HTTP Status: ${res.status}`);
    const json = await res.json();
    console.log('\n🎯 CONFIGURAÇÃO DO BACKEND DO CNJ PJe COMUNICA:');
    console.log(JSON.stringify(json, null, 2));

  } catch (e) {
    console.error('❌ Erro:', e.message);
  }
}

fetchPjeConfig();
