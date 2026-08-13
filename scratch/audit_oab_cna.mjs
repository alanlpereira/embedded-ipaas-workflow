async function auditOabAndPjeWeb() {
  console.log('🔍 AUDITORIA PROFUNDA: PESQUISANDO OAB 145105 E WEB SCRAPING...');

  // 1. Pesquisar PJe Comunica por HTML Scraping da página de busca publica
  const comunicaHtmlUrl = 'https://comunica.pje.jus.br/consulta';
  try {
    const res = await fetch(comunicaHtmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    console.log(`📡 PJe Comunica HTML Page Status: ${res.status}`);
  } catch (e) {
    console.error('Error fetching PJe html:', e);
  }

  // 2. Pesquisa de OAB 145105 no CNA (Cadastro Nacional dos Advogados)
  try {
    const cnaUrl = 'https://cna.oab.org.br/Home/Search';
    const cnaRes = await fetch('https://cna.oab.org.br/', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    console.log(`📡 CNA OAB Portal Status: ${cnaRes.status}`);
  } catch (e) {
    console.error('Error checking CNA:', e);
  }
}

auditOabAndPjeWeb();
