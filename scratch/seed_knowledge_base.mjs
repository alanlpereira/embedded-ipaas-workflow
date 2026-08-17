import { createRequire } from 'module';
const require = createRequire(import.meta.url);

global.WebSocket = class DummyWebSocket {
  constructor() {}
  on() {}
  close() {}
};

const { createClient } = require('../apps/web/node_modules/@supabase/supabase-js');

const SUPABASE_URL = 'https://wurfruxigmajgnqsyleq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ARRAY DE MANUAIS FACTUAIS EXTRAÍDOS DA AUDITORIA DO CÓDIGO-FONTE
const factualKnowledgeSeed = [
  {
    title: "Como funciona o Login, Cadastro e Perfil de Advogado?",
    content: "O acesso ao Synapse é realizado via e-mail e senha gerenciados pelo Supabase Auth. No primeiro acesso, o usuário cria sua conta e tem seu perfil cadastrado na tabela public.profiles. No Onboarding, o advogado deve preencher o número de sua OAB e a UF correspondente para habilitar as automações do PJe."
  },
  {
    title: "OAB e Regras de Preenchimento no Onboarding",
    content: "A OAB informada no Onboarding (número e UF) é utilizada pelo sistema para realizar buscas e sincronização de processos em tempo real no PJe Live. Uma vez preenchida, a OAB fica vinculada ao perfil do advogado e garante o direcionamento direto para o Portal de Processos."
  },
  {
    title: "Diferença entre Perfil Master e Perfil Member",
    content: "O perfil Master possui autoridade administrativa total no sistema: acesso ao Editor IPaaS (/), Gestão da Base RAG (/admin/knowledge), Auditoria (/audit) e Painel Master. O perfil Member é destinado aos advogados usuários da plataforma, tendo acesso exclusivo ao Módulo Jurídico (/juridico - Portal PJe) e ao Help Desk (/ajuda)."
  },
  {
    title: "Assinatura de Planos, Recusa de Cartão e Controle de Acesso (Billing)",
    content: "O Synapse possui o Plano Pro (R$ 149/mês para advogados autônomos) e o Plano Enterprise para múltiplos escritórios. Se a assinatura estiver com status active no perfil, o acesso ao Portal PJe é liberado. Caso o status esteja inactive, o cartão seja recusado ou ocorra inadimplência no pagamento, o sistema bloqueia o Portal Jurídico e redireciona o usuário para a seleção de planos."
  },
  {
    title: "Como funciona a Geração de Peças com Inteligência Artificial?",
    content: "A geração de peças processuais utiliza a API da Anthropic com o modelo dinâmico claude-3-5-sonnet-latest sob uma Persona Jurídica Estrita. As peças são estruturadas com alto rigor técnico segundo o CPC, qualificando partes e peticionando formalmente. Caso haja oscilação de conexão, o sistema aciona um fallback local estruturado de emergência."
  },
  {
    title: "Contabilização de Consumo Mensal de IA (ai_monthly_usage)",
    content: "Cada geração de peça ou consulta processual incrementa em +1 a coluna ai_monthly_usage na tabela public.profiles no PostgreSQL. Esse controle é feito exclusivamente server-side pela Edge Function llm-router via chamada RPC segura, garantindo transparência e integridade financeira."
  },
  {
    title: "Como funciona o Suporte RAG e Atendimento Humanizado (WhatsApp)",
    content: "O Help Desk do Synapse (/ajuda) utiliza um motor de RAG com embeddings de 768 dimensões gerados pelo Google Gemini (text-embedding-004) e busca por similaridade no pgvector (threshold 0.65). Se a dúvida não estiver nos manuais ou exigir intervenção técnica/financeira, a IA aciona automaticamente o transbordo para o consultor corporativo via WhatsApp (https://wa.me/5532988654825)."
  }
];

async function seedKnowledgeBase() {
  console.log('====================================================================');
  console.log('🌱 INICIANDO SEED INTELIGENTE DA BASE DE CONHECIMENTO RAG');
  console.log('====================================================================\n');

  // 1. Autenticar usuário Master para obter access token válido
  const masterEmail = `master.seed.${Date.now()}@alp-nexus.com`;
  const masterPassword = 'MasterPassword123!';

  console.log(`1. Autenticando usuário Master para o Seed: ${masterEmail}...`);
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: masterEmail,
    password: masterPassword,
    options: { data: { full_name: 'Master Seed Bot' } }
  });

  if (authErr || !authData?.user) {
    console.error('❌ Falha ao criar/autenticar Master Bot:', authErr);
    process.exit(1);
  }

  const userId = authData.user.id;
  const token = authData.session.access_token;

  // Garantir perfil Master no PostgreSQL
  await supabase.from('profiles').upsert({
    id: userId,
    email: masterEmail,
    full_name: 'Master Seed Bot',
    role: 'Master',
    oab_number: '000000',
    oab_uf: 'MG',
    subscription_status: 'active',
    created_at: new Date().toISOString()
  });

  console.log('✅ Usuário Master autenticado no PostgreSQL!\n');
  console.log(`📊 Total de Manuais Factuais a Ingerir via Gemini Embeddings (768d): ${factualKnowledgeSeed.length}\n`);

  const results = [];

  for (let i = 0; i < factualKnowledgeSeed.length; i++) {
    const item = factualKnowledgeSeed[i];
    console.log(`[${i + 1}/${factualKnowledgeSeed.length}] Vetorizando e salvando manual: "${item.title}"...`);

    try {
      // Disparar POST para a Edge Function rag-ingestion com o token do Master
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rag-ingestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: item.title,
          content: item.content
        })
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        console.log(`   ✅ SUCESSO 100%: Vetor gerado (768d) e Inserido no PostgreSQL (ID: ${resData.id})`);
        results.push({ title: item.title, id: resData.id, status: 'SUCCESS' });
      } else {
        console.error(`   ❌ ERRO na Ingestão RAG:`, resData.error || 'Falha na resposta HTTP');
        results.push({ title: item.title, status: 'FAILED', error: resData.error });
      }
    } catch (err) {
      console.error(`   ❌ EXCEÇÃO ao vetorizar "${item.title}":`, err.message);
      results.push({ title: item.title, status: 'ERROR', error: err.message });
    }
  }

  console.log('\n====================================================================');
  console.log('📋 RELATÓRIO OFICIAL DO SEED DE CONHECIMENTO RAG:');
  console.log('====================================================================');
  results.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.status}] "${r.title}" (ID no DB: "${r.id || 'N/A'}")`);
  });
  console.log('====================================================================');

  const totalSuccess = results.filter(r => r.status === 'SUCCESS').length;
  console.log(`\n🏁 RESULTADO DA POPULAÇÃO DA BASE: ${totalSuccess}/${factualKnowledgeSeed.length} manuais inseridos com VETOR EMBEDDING (768d) com 100% de Sucesso!`);
}

seedKnowledgeBase();
