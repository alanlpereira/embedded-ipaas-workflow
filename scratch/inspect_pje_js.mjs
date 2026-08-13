async function inspectMainJs() {
  console.log('🔍 EXTRAINDO ENDPOINTS EXATOS DO PJe COMUNICA DE main-es2015.js...');
  const res = await fetch('https://comunica.pje.jus.br/main-es2015.407d1efc0c244c539f0e.js');
  const code = await res.text();

  // Procurar por URLs de serviço, APIs REST e parâmetros HTTP
  const regex = /["'](https?:\/\/[^"']+|\/api\/[^"']+|api\/v\d\/[^"']+)["']/g;
  const matches = [...code.matchAll(regex)].map(m => m[1]);

  console.log('🎯 ALL MATCHES FOUND IN JS:');
  const unique = [...new Set(matches)];
  unique.forEach(u => console.log('  -> ' + u));

  // Procurar também por "comunicacao" em contextos de URL ou HttpClient
  const httpMatches = [...code.matchAll(/this\.http\.[a-z]+\([^)]+\)/g)].map(m => m[0]);
  console.log(`\n📡 ENCONTRADAS ${httpMatches.length} CHAMADAS HTTP ANGULAR:`);
  httpMatches.slice(0, 20).forEach(h => console.log('  -> ' + h));
}

inspectMainJs();
