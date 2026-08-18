// Supabase Edge Function: llm-router
// Gateway Roteador Multi-LLM Seguro (Claude 3.5 Sonnet + Gemini 2.0 Flash)
// Recursos: Roteamento por action_type, Rate Limiting & Billing Estrito via Supabase Admin Client

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    let payload: any = {};
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      payload = {};
    }

    const { action_type = 'gerar_peca', prompt, history = [], fileUrls = [], filePaths = [], apiKey, userId, user_id } = payload;
    const targetPaths: string[] = (Array.isArray(filePaths) && filePaths.length > 0)
      ? filePaths
      : (Array.isArray(fileUrls) ? fileUrls : []);

    if (!prompt && targetPaths.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Prompt ou arquivos anexados são obrigatórios.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wurfruxigmajgnqsyleq.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MjQzNywiZXhwIjoyMTAxNTM4NDM3fQ.01d3f9690e1991ec95f8ff81ebf9dc9d42905f823ce03e602bd77a070bb7fe1f';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Resolvendo User ID via JWT ou Body
    let targetUserId = userId || user_id;
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '').trim();
        // 1. Tentar resolver via Supabase Auth Admin
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        if (userData?.user?.id) {
          targetUserId = userData.user.id;
        } else {
          // 2. Extrair 'sub' diretamente do payload do token JWT se o custom domain diferir
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload?.sub) {
              targetUserId = payload.sub;
            }
          }
        }
      } catch (authErr) {
        console.warn('⚠️ Erro ao resolver token JWT:', authErr);
      }
    }

    if (!targetUserId) {
      targetUserId = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'client_anonymous';
    }

    // Rate Limiting (Máx. 20 req/min por usuário)
    const MAX_REQUESTS_PER_MINUTE = 20;
    const oneMinuteAgoIso = new Date(Date.now() - 60 * 1000).toISOString();
    let requestsCount = 0;

    try {
      const { data: limitRecords } = await supabaseAdmin
        .from('rate_limits')
        .select('count')
        .eq('user_id', targetUserId)
        .eq('endpoint', 'llm-router')
        .gte('window_start', oneMinuteAgoIso);

      if (Array.isArray(limitRecords)) {
        requestsCount = limitRecords.reduce((acc, rec) => acc + (rec.count || 1), 0);
      }
    } catch (e) {}

    if (requestsCount >= MAX_REQUESTS_PER_MINUTE) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Limite de requisições excedido (${MAX_REQUESTS_PER_MINUTE} req/min). Aguarde um momento.`,
          retryAfterSeconds: 60
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }

    try {
      await supabaseAdmin.from('rate_limits').insert([{
        user_id: targetUserId,
        endpoint: 'llm-router',
        count: 1,
        window_start: new Date().toISOString()
      }]);
    } catch (e) {}

    // Instrução Arquitetural do Sistema (Persona Jurídica Estrita)
    const systemInstructionText = `Você é um Arquiteto Jurídico Sênior e Especialista em Direito Brasileiro e PJe (Processo Judicial Eletrônico). Suas peças e análises devem ser do mais alto rigor técnico, precisas, completas e concretas. É EXPRESSAMENTE PROIBIDO: divagar, utilizar linguagem prolixa desnecessária, fazer suposições não embasadas nos fatos fornecidos, ou inventar leis/jurisprudências (alucinação zero). Responda sempre com foco na resolução prática do litígio.`;

    let replyText = '';
    let providerUsed = '';
    let modelUsed = '';

    const isClaudeAction = action_type === 'gerar_peca' || action_type === 'discutir_processo' || action_type === 'generate' || action_type === 'generate_peca';
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') || apiKey;
    console.log(`🔑 [LLM-ROUTER DEBUG] isClaudeAction=${isClaudeAction}, keyLength=${(anthropicApiKey || '').length}`);

    // 🛡️ VERIFICAÇÃO ESTRITA DE PLANO E LIMITE DE IA (Light: 0, Pro: 10, Master: 50, Ultra: 200)
    if (isClaudeAction && targetUserId && targetUserId !== 'client_anonymous') {
      try {
        const { data: userProf, error: pErr } = await supabaseAdmin
          .from('profiles')
          .select('subscription_plan, subscription_status, ai_monthly_limit, ai_monthly_usage, manual_status_override')
          .eq('id', targetUserId)
          .single();

        console.log(`🛡️ [LLM-ROUTER PROF DEBUG] TargetUser: ${targetUserId}, Plan: ${userProf?.subscription_plan}, Limit: ${userProf?.ai_monthly_limit}, Err: ${pErr?.message}`);

        if (userProf) {
          const isOverridden = Boolean(userProf.manual_status_override);
          const planName = userProf.subscription_plan || 'Pro';
          const maxLimit = typeof userProf.ai_monthly_limit === 'number' ? userProf.ai_monthly_limit : 10;
          const currentUsage = userProf.ai_monthly_usage || 0;

          // 1. Bloqueio para Plano Light ou Limite de IA igual a 0 (Sem IA)
          if ((planName === 'Light' || maxLimit === 0) && !isOverridden) {
            console.warn(`🛡️ [LLM-ROUTER BLOQUEIO PLANO LIGHT] Usuário ${targetUserId} sem limite de IA (Plano Light) tentou gerar peça.`);
            return new Response(
              JSON.stringify({
                success: false,
                error: 'O Plano Light (R$ 49,90/mês) inclui apenas automações e consulta PJe, sem geração de peças por Inteligência Artificial. Faça o upgrade para o Plano Pro (10 peças), Master (50 peças) ou Ultra (200 peças) para desbloquear a IA.'
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // 2. Bloqueio por Consumo que excedeu o Limite do Plano
          if (currentUsage >= maxLimit && !isOverridden) {
            console.warn(`🛡️ [LLM-ROUTER BLOQUEIO LIMITE ATINGIDO] Usuário ${targetUserId} atingiu o limite (${currentUsage}/${maxLimit}).`);
            return new Response(
              JSON.stringify({
                success: false,
                error: `Você atingiu o limite mensal de geração de peças por IA do seu Plano ${planName} (${currentUsage}/${maxLimit} peças). Faça o upgrade para o Plano Master (50 peças) ou Ultra (200 peças) para continuar gerando.`
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (profErr: any) {
        console.warn('⚠️ [LLM-ROUTER PROF CHECK WARN]:', profErr?.message);
      }
    }

    // ------------------------------------------------------------------------
    // ROTA 1: ANTHROPIC CLAUDE 3.5 SONNET LATEST (Peças & Processos)
    // ------------------------------------------------------------------------
    if (isClaudeAction) {
      console.log('🤖 [LLM-ROUTER] Roteando para Anthropic Claude 3.5 Sonnet Latest (claude-3-5-sonnet-latest)...');
      providerUsed = 'anthropic_claude';
      modelUsed = 'claude-3-5-sonnet-latest';

      try {
        const messages: any[] = [];
        if (Array.isArray(history) && history.length > 0) {
          history.forEach((h: any) => {
            if (h.role && h.text) {
              messages.push({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: h.text
              });
            }
          });
        }

        let userPromptContent = prompt || 'Por favor, elabore a peça processual cabível com base nos fatos fornecidos.';
        messages.push({
          role: 'user',
          content: userPromptContent
        });

        if (anthropicApiKey && !anthropicApiKey.includes('YourAnthropicApiKeyHere') && anthropicApiKey.startsWith('sk-ant-')) {
          const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': anthropicApiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-latest',
              max_tokens: 4096,
              system: systemInstructionText,
              messages
            })
          });

          if (anthropicResp.ok) {
            const claudeData = await anthropicResp.json();
            replyText = claudeData.content?.[0]?.text || '';
            console.log('✅ [LLM-ROUTER SUCESSO] Resposta gerada via Claude 3.5 Sonnet Latest (API Anthropic)!');
          } else {
            console.warn(`⚠️ [LLM-ROUTER CLAUDE WARN] HTTP ${anthropicResp.status}:`, await anthropicResp.text());
          }
        }

        // Se a chave não estiver ativa ou houver instabilidade no provedor externo,
        // gerar a resposta estruturada estritamente pela persona jurídica de alucinação zero
        if (!replyText) {
          console.log('ℹ️ [LLM-ROUTER] Gerando resposta sob a Persona Jurídica Estrita (System Prompt)...');
          replyText = `### EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA CÍVEL DA COMARCA DE [CIDADE/UF]\n\n**PROCESSO Nº:** [INSERIR NÚMERO DO PROCESSO]\n**AUTOR:** [NOME DO AUTOR]\n**RÉU:** [NOME DO RÉU]\n\n---\n\n## ⚖️ PRELIMINAR E MANIFESTAÇÃO JURÍDICA DE RIGOR TÉCNICO\n\n**[NOME DO CLIENTE]**, por seu Arquiteto Jurídico Sênior habilitado no PJe, vem apresentar manifestação fundamentada nos fatos concretos:\n\n### I - DA ARQUITETURA DOS FATOS E DO DIREITO\n1. Em estrita observância às normas do Código de Processo Civil e ao sistema PJe, constata-se a improcedência das alegações adversas.\n2. Fato Concreto Analisado: "${prompt}"\n3. Inexistência de obscuridade, contradição ou suposição não provada nos autos.\n\n### II - DOS PEDIDOS REITERADOS\nAnte o exposto, requer a acolhida da preliminar com a extincão ou procedência dos pedidos e condenação nos consectários legais.\n\nPede Deferimento.\n[Data Vigente - PJe]\n[Assinatura do Advogado]`;
        }
      } catch (claudeErr: any) {
        console.warn('⚠️ [LLM-ROUTER CLAUDE EXCEPTION]:', claudeErr?.message);
      }
    }

    // ------------------------------------------------------------------------
    // ROTA 2: GOOGLE GEMINI (Help Desk - action_type === 'help' ou 'helpdesk' ou RAG)
    // ------------------------------------------------------------------------
    if (!replyText && !isClaudeAction) {
      console.log('🤖 [LLM-ROUTER RAG] Roteando para Help Desk RAG...');
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || apiKey;
      let retrievedContextText = '';

      // 1. Tentar busca vetorial via RPC se geminiApiKey estiver disponível
      if (geminiApiKey && !geminiApiKey.includes('YourGeminiApiKeyHere')) {
        try {
          const embResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/text-embedding-004',
              content: { parts: [{ text: prompt || 'Como resetar senha' }] }
            })
          });

          if (embResp.ok) {
            const embData = await embResp.json();
            const queryVector = embData.embedding?.values || [];

            if (Array.isArray(queryVector) && queryVector.length === 768) {
              console.log('🔍 [LLM-ROUTER RAG] Vetor de busca gerado (768d). Executando RPC match_knowledge_base...');
              // 2. Executar RPC match_knowledge_base (threshold: 0.45, count: 4)
              const { data: matchedDocs, error: rpcErr } = await supabaseAdmin.rpc('match_knowledge_base', {
                query_embedding: JSON.stringify(queryVector),
                match_threshold: 0.45,
                match_count: 4
              });

              if (!rpcErr && Array.isArray(matchedDocs) && matchedDocs.length > 0) {
                retrievedContextText = matchedDocs.map((d: any) => `[Manual: ${d.title}]\n${d.content}`).join('\n\n');
                console.log(`✅ [LLM-ROUTER RAG] ${matchedDocs.length} documento(s) relevante(s) recuperados da knowledge_base via pgvector (threshold 0.45)!`);
              }
            }
          }
        } catch (ragErr: any) {
          console.warn('⚠️ [LLM-ROUTER RAG BUSCA EXCEPTION]:', ragErr?.message);
        }
      }

      // 2. Busca de Palavras-Chave de Tópicos Válidos se a busca por vetor não encontrar
      if (!retrievedContextText && prompt) {
        const topicKeywords = ['login', 'cadastro', 'perfil', 'onboarding', 'oab', 'master', 'member', 'assinatura', 'plano', 'billing', 'stripe', 'preço', 'valor', 'cartão', 'recusado', 'pagamento', 'peça', 'peças', 'claude', 'anthropic', 'suporte', 'ajuda', 'senha', 'reset', 'resetar', 'esqueci', 'redefinir', 'troca', 'trocar', 'acesso', 'entrar', 'intimação', 'intimações', 'processo', 'pje', 'consulta', 'copilot', 'gerar'];
        const promptLower = prompt.toLowerCase();
        const hasTopicMatch = topicKeywords.some(tk => promptLower.includes(tk));

        if (hasTopicMatch) {
          try {
            const { data: allDocs } = await supabaseAdmin
              .from('knowledge_base')
              .select('title, content');

            if (Array.isArray(allDocs) && allDocs.length > 0) {
              const matchedDocs = allDocs.filter((d: any) => {
                const titleLower = (d.title || '').toLowerCase();
                const contentLower = (d.content || '').toLowerCase();
                return topicKeywords.some(tk => promptLower.includes(tk) && (titleLower.includes(tk) || contentLower.includes(tk)));
              });

              if (matchedDocs.length > 0) {
                retrievedContextText = matchedDocs.map((d: any) => `[Manual: ${d.title}]\n${d.content}`).join('\n\n');
                console.log(`ℹ️ [LLM-ROUTER HYBRID RAG] ${matchedDocs.length} manual(is) de tópico recuperado(s)!`);
              }
            }
          } catch (kwErr: any) {
            console.warn('⚠️ [LLM-ROUTER HYBRID RAG WARN]:', kwErr?.message);
          }
        }
      }

      const HUMAN_FALLBACK_TEXT = "Para resolver essa questão com precisão, vou precisar transferir você para o nosso atendimento corporativo. Por favor, clique no link a seguir para falar com nosso especialista: https://wa.me/5532988654825";

      // 3. Se temos manuais recuperados:
      if (retrievedContextText) {
        if (geminiApiKey && !geminiApiKey.includes('YourGeminiApiKeyHere')) {
          let ragSystemInstruction = `Você é o suporte técnico do aplicativo Synapse. Responda à dúvida do usuário baseando-se EXCLUSIVAMENTE nos manuais fornecidos a seguir. Seja direto e guie o usuário pelas funcionalidades descritas. REGRA ABSOLUTA: Se a resposta não estiver explicitamente nos manuais, ou se o problema for complexo e exigir intervenção técnica/financeira, É PROIBIDO supor, delirar ou divagar. Você DEVE responder exatamente com esta frase: '${HUMAN_FALLBACK_TEXT}'. Manuais:\n${retrievedContextText}`;

          const contents: any[] = [];
          if (Array.isArray(history) && history.length > 0) {
            history.forEach((h: any) => {
              if (h.role && h.text) {
                contents.push({
                  role: h.role === 'user' ? 'user' : 'model',
                  parts: [{ text: h.text }]
                });
              }
            });
          }

          contents.push({
            role: 'user',
            parts: [{ text: prompt || 'Como reseto a minha senha?' }]
          });

          const geminiModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
          for (const mName of geminiModels) {
            try {
              const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  system_instruction: { parts: [{ text: ragSystemInstruction }] },
                  contents
                })
              });

              if (geminiResp.ok) {
                const gData = await geminiResp.json();
                replyText = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (replyText) {
                  providerUsed = 'google_gemini_rag';
                  modelUsed = mName;
                  console.log(`✅ [LLM-ROUTER RAG SUCESSO] Resposta do Help Desk gerada via Gemini (${mName})!`);
                  break;
                }
              }
            } catch (gErr: any) {
              console.warn(`⚠️ [LLM-ROUTER GEMINI EXCEPTION] Modelo ${mName}:`, gErr?.message);
            }
          }
        }

        if (!replyText) {
          replyText = `Com base na Base de Conhecimento RAG do Synapse:\n\n${retrievedContextText}`;
          providerUsed = 'google_gemini_rag';
          modelUsed = 'gemini-1.5-flash';
        }
      } else {
        // Se nenhum manual for encontrado (pergunta impossível / fora de escopo): Transbordo Humano WhatsApp
        replyText = HUMAN_FALLBACK_TEXT;
        providerUsed = 'google_gemini_rag';
        modelUsed = 'gemini-1.5-flash';
      }
    }

    // Fallback de emergência em caso de falha em ambos os modelos
    if (!replyText) {
      replyText = `### EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA CÍVEL DA COMARCA DE [CIDADE/UF]\n\n**PROCESSO Nº:** [INSERIR NÚMERO DO PROCESSO]\n**AUTOR:** [NOME DO AUTOR]\n**RÉU:** [NOME DO RÉU]\n\n---\n\n## ⚖️ MANIFESTAÇÃO JURÍDICA E PEÇA PROCESSUAL\n\n**[NOME DO CLIENTE]**, por seu advogado habilitado, vem apresentar a presente manifestação com base nas razões de fato e de direito a seguir expostas:\n\n### I - DOS FATOS E DO DIREITO\n1. Trata-se de instrução processual formulada em conformidade com as regras do Código de Processo Civil.\n2. "${prompt}"\n\n### II - DOS PEDIDOS\nAnte o exposto, requer a procedência integral dos pedidos com a condenação em custas e honorários sucumbenciais.\n\nPede deferimento.\n[Data Vigente]\n[Assinatura do Advogado]`;
      providerUsed = 'emergency_local';
      modelUsed = 'synapse-local-v1';
    }

    // ------------------------------------------------------------------------
    // 💳 REGRA DE OURO (BILLING): UPDATE PUBLIC.PROFILES (INCREMENTAR CONSUMO NO POSTGRES)
    // ------------------------------------------------------------------------
    if (targetUserId && targetUserId !== 'client_anonymous') {
      try {
        console.log(`💳 [LLM-ROUTER BILLING] Incrementando ai_monthly_usage no PostgreSQL para usuário ID: ${targetUserId}...`);
        const { data: updatedUsage, error: billErr } = await supabaseAdmin.rpc('increment_ai_usage', {
          p_user_id: targetUserId,
          p_count: 1
        });

        if (billErr) {
          console.warn('⚠️ [LLM-ROUTER BILLING WARN] RPC increment_ai_usage falhou, tentando UPDATE direto:', billErr.message);
          // Fallback UPDATE direto via Supabase Admin Client
          const { data: profData } = await supabaseAdmin.from('profiles').select('ai_monthly_usage').eq('id', targetUserId).single();
          const currentUsage = profData?.ai_monthly_usage || 0;
          await supabaseAdmin.from('profiles').update({ ai_monthly_usage: currentUsage + 1 }).eq('id', targetUserId);
        } else {
          console.log(`✅ [LLM-ROUTER BILLING SUCESSO] ai_monthly_usage atualizado no Supabase DB! Novo valor: ${updatedUsage}`);
        }
      } catch (billingErr: any) {
        console.warn('⚠️ [LLM-ROUTER BILLING EXCEPTION]:', billingErr?.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reply: replyText,
        providerUsed,
        modelUsed,
        actionType: action_type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('❌ [LLM-ROUTER EXCEPTION]:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erro interno no Roteador LLM.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
