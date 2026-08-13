async function discoverPjeEndpoints() {
  console.log('🔍 INVESTIGANDO ENDPOINTS OFICIAIS DO PJe COMUNICA (comunica.pje.jus.br)...');

  const candidateEndpoints = [
    'https://comunica.pje.jus.br/api/v1/comunicacao',
    'https://comunica.pje.jus.br/api/v1/comunicacoes',
    'https://comunica.pje.jus.br/api/v1/comunicacao-processual',
    'https://comunica.pje.jus.br/api/v1/publicacao',
    'https://comunica.pje.jus.br/api/v1/consulta',
    'https://comunica.pje.jus.br/api/v1/pesquisa',
    'https://comunica.pje.jus.br/api/v1/comunicacao?numeroOab=145105&ufOab=MG',
    'https://comunica.pje.jus.br/api/v1/comunicacoes?numeroOab=145105&ufOab=MG',
  ];

  for (const ep of candidateEndpoints) {
    try {
      const res = await fetch(ep, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://comunica.pje.jus.br/consulta'
        }
      });

      const contentType = res.headers.get('content-type') || '';
      console.log(`📡 [${res.status}] ${ep} (Content-Type: ${contentType})`);

      const text = await res.text();
      if (contentType.includes('json') || text.startsWith('{') || text.startsWith('[')) {
        console.log('  ✅ RESPOSTA JSON ENCONTRADA:');
        console.log('  ' + text.slice(0, 1000));
      } else {
        console.log('  📄 Retornou HTML/Text (Primeiros 100 chars): ' + text.slice(0, 100).replace(/\n/g, ' '));
      }
    } catch (e) {
      console.log(`  ❌ Falha: ${e.message}`);
    }
  }
}

discoverPjeEndpoints();
