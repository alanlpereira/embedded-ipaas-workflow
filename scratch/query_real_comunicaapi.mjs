async function queryRealComunicaApi() {
  console.log('🔍 CONSULTANDO A API REAL E OFICIAL DO CNJ PJe COMUNICA em comunicaapi.pje.jus.br...');
  console.log('📌 OAB Solicitada: 145105 | UF: MG\n');

  const baseUrl = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';

  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - 90); // Últimos 90 dias

  const formatDate = (d) => d.toISOString().split('T')[0];

  // Parâmetros oficiais do CNJ
  const params = new URLSearchParams({
    numeroOab: '145105',
    ufOab: 'MG',
    dataDisponibilizacaoInicio: '2024-01-01',
    dataDisponibilizacaoFim: formatDate(today),
    pagina: '1',
    itensPorPagina: '50'
  });

  const fullUrl = `${baseUrl}?${params.toString()}`;
  console.log(`📡 GET URL: ${fullUrl}`);

  try {
    const res = await fetch(fullUrl, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://comunica.pje.jus.br',
        'Referer': 'https://comunica.pje.jus.br/'
      }
    });

    console.log(`HTTP Status: ${res.status} ${res.statusText}`);

    const json = await res.json();
    console.log('\n==================================================');
    console.log('📦 ESTRUTURA REAL RETORNADA PELA API DO CNJ:');
    console.log(JSON.stringify(json, null, 2).slice(0, 4000));

    if (json.items && json.items.length > 0) {
      console.log(`\n🎉 ENCONTRADAS ${json.items.length} COMUNICAÇÕES REAIS NO CNJ PARA A OAB 145105/MG!`);
      json.items.forEach((item, index) => {
        console.log(`\n--- PROCESSO REAL #${index + 1} ---`);
        console.log(`📌 Número do Processo: ${item.numero_processo || item.numeroProcesso || item.numero}`);
        console.log(`🏛️ Órgão / Tribunal: ${item.nomeOrgao || item.orgao || item.siglaTribunal}`);
        console.log(`📅 Data Disponibilização: ${item.data_disponibilizacao || item.dataDisponibilizacao}`);
        console.log(`👥 Partes: ${item.destinatarioAdvogados?.map(a => a.nome).join(', ') || item.destinatarios}`);
        console.log(`📜 Meio / Tipo: ${item.tipoComunicacao || item.meio}`);
        console.log(`📝 Texto / Teor: ${item.texto || item.teor || item.titulo}`);
      });
    } else {
      console.log('\n⚠️ A API oficial retornou 0 itens para OAB 145105/MG no período informado.');
    }

  } catch (e) {
    console.error('❌ Exceção ao consultar API oficial:', e.message);
  }
}

queryRealComunicaApi();
