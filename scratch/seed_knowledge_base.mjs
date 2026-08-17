const SUPABASE_URL = 'https://auth.alp-nexus.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const MANUALS = [
  {
    title: 'Como resetar a senha e gerenciar acesso',
    content: `Categoria: Autenticação & Segurança
Para resetar ou redefinir a sua senha de acesso na plataforma Synapse IPaaS Legal:
1. Acesse a tela de Login ou Meu Perfil (/juridico/perfil ou /login).
2. Na tela de login, clique na opção 'Esqueci minha senha' ou 'Resetar Senha'.
3. Digite o seu e-mail cadastrado (o mesmo utilizado na OAB/Perfil) e clique em 'Enviar link de redefinição'.
4. Você receberá um e-mail com o token de segurança para cadastrar uma nova senha.
5. Caso já esteja logado no sistema, acesse a aba 'Meu Perfil', clique em 'Alterar Senha', informe a nova senha desejada e confirme.`
  },
  {
    title: 'Planos de Assinatura, Limites de IA e Preços',
    content: `Categoria: Financeiro & Planos
A plataforma Synapse IPaaS Legal oferece 4 planos oficiais adaptados ao seu volume de trabalho:
- Plano Light (R$ 49,90/mês): Inclui automações de fluxos e consultas diárias ao PJe Comunica. Não inclui suporte a Inteligência Artificial (0 peças/mês).
- Plano Pro (R$ 79,90/mês): Inclui automações, PJe e 10 peças/mês geradas por Inteligência Artificial (Claude 3.5 Sonnet / Gemini).
- Plano Master (R$ 99,90/mês): Inclui automações, PJe e 50 peças/mês geradas por IA.
- Plano Ultra (R$ 200,00/mês): Inclui automações, PJe e 200 peças/mês geradas por IA.
Você pode alterar ou cancelar seu plano a qualquer momento acessando a aba 'Gestão da Organização' ou 'Meu Perfil'.`
  },
  {
    title: 'Como consultar intimações e processos no PJe Comunica',
    content: `Categoria: Portal de Processos & PJe
Para pesquisar intimações e movimentações do PJe Comunica:
1. Acesse a aba 'Portal de Processos' (/juridico) no menu lateral.
2. Informe o número da sua OAB e a UF (Estado) correspondente no filtro superior.
3. Escolha o período desejado (Data Inicial e Data Final). Por padrão, o sistema busca o dia de hoje.
4. Clique em 'Buscar Intimações'. O sistema fará a busca oficial via API do PJe Comunica do CNJ.
5. Os resultados exibirão os processos, tribunal de origem, data de disponibilização e o teor da intimação.`
  },
  {
    title: 'Geração de Peças Jurídicas com Legal Copilot (IA)',
    content: `Categoria: Inteligência Artificial
Para gerar petições, contestações, recursos e análises jurídicas com o Legal Copilot:
1. Acesse a aba 'Legal Copilot (IA)' no menu lateral ou clique no botão 'Analisar com IA' dentro de um processo.
2. Selecione o tipo de peça (Petição Inicial, Contestação, Agravo, Recurso de Apelação, Parecer).
3. Insira os fatos do caso, pedidos e teses principais.
4. Clique em 'Gerar Peça'. A inteligência artificial (Claude 3.5 Sonnet) elaborará o documento com rigor técnico, doutrina e jurisprudência aplicável.`
  },
  {
    title: 'Cadastro de Advogados, Membros da Equipe e OAB',
    content: `Categoria: Gestão de Organização
Para cadastrar novos advogados e membros da sua banca:
1. Acesse a aba 'Gestão da Organização' (/juridico/tenant-admin).
2. Clique em 'Convidar Novo Membro'.
3. Informe o nome completo, e-mail institucional e o número da OAB/UF do novo advogado.
4. Selecione o papel (Advogado / Member ou Administrador / Admin).
5. O novo usuário receberá as credenciais por e-mail para acesso imediato.`
  }
];

async function seed() {
  console.log('🔍 Testando conexão com Supabase REST API (auth.alp-nexus.com)...');
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const getRes = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_base?select=id,title`, { headers });
  if (!getRes.ok) {
    console.error(`❌ Erro ao consultar knowledge_base: ${getRes.status} ${await getRes.text()}`);
    return;
  }
  const existing = await getRes.json();
  console.log(`📋 Total de manuais cadastrados atualmente: ${existing.length}`);

  for (const item of MANUALS) {
    console.log(`\n⏳ Processando: "${item.title}"...`);

    const payload = {
      title: item.title,
      content: item.content
    };

    const postRes = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_base`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (postRes.ok) {
      const inserted = await postRes.json();
      console.log(`   ✅ Registrado com sucesso! ID: ${inserted[0]?.id}`);
    } else {
      console.error(`   ❌ Erro ao inserir manual: ${postRes.status} ${await postRes.text()}`);
    }
  }

  console.log('\n✨ Povoamento da Base de Conhecimento RAG finalizado com sucesso!');
}

seed().catch(console.error);
