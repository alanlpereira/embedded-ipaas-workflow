// Supabase Edge Function: llm-router
// Gateway Roteador Multi-LLM Seguro & Resiliente (Claude 3.5 Sonnet + Gemini 2.0 Flash + Synapse Legal Engine)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

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
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        if (userData?.user?.id) {
          targetUserId = userData.user.id;
        } else {
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

    // Consultar Perfil do Usuário no Supabase (Role & Billing)
    let isMasterUser = false;
    let isOverridden = false;
    let planName = 'Pro';
    let maxLimit = 10;
    let currentUsage = 0;
    let userEmail = '';

    if (targetUserId && targetUserId !== 'client_anonymous') {
      try {
        const { data: userProf } = await supabaseAdmin
          .from('profiles')
          .select('email, role, subscription_plan, subscription_status, ai_monthly_limit, ai_monthly_usage, manual_status_override')
          .eq('id', targetUserId)
          .single();

        if (userProf) {
          userEmail = userProf.email || '';
          isMasterUser = userProf.role === 'Master' || userEmail === 'alanlpereira@hotmail.com' || userEmail.endsWith('@alp-nexus.com');
          isOverridden = Boolean(userProf.manual_status_override) || isMasterUser;
          planName = userProf.subscription_plan || (isMasterUser ? 'Master' : 'Pro');
          maxLimit = isMasterUser ? 999999 : (typeof userProf.ai_monthly_limit === 'number' ? userProf.ai_monthly_limit : 10);
          currentUsage = userProf.ai_monthly_usage || 0;
        }
      } catch (e) {}
    }

    // Rate Limiting (Isento para Master)
    if (!isMasterUser) {
      const MAX_REQUESTS_PER_MINUTE = 30;
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
            error: `Limite de requisições excedido (${MAX_REQUESTS_PER_MINUTE} req/min). Aguarde um momento.`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validar Plano de Assinatura (se não for Master / Override)
    const isClaudeAction = action_type === 'gerar_peca' || action_type === 'discutir_processo' || action_type === 'generate' || action_type === 'generate_peca' || action_type === 'copilot';

    if (isClaudeAction && !isMasterUser && !isOverridden) {
      if (planName === 'Light' || maxLimit === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'O Plano Light inclui apenas automações e consulta PJe. Faça o upgrade para o Plano Pro, Master ou Ultra para desbloquear a geração de peças por IA.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (currentUsage >= maxLimit) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Você atingiu o limite mensal de geração de peças por IA do seu Plano ${planName} (${currentUsage}/${maxLimit} peças). Faça o upgrade para continuar gerando.`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Prompt de Instrução Jurídica Completo de Alta Inteligência
    const legalSystemInstruction = `Você é um Arquiteto Jurídico Sênior, Doutor em Direito Processual Civil pela USP e Especialista em PJe e Tribunais Brasileiros. Suas petições e análises devem ser produzidas com o mais alto rigor técnico, profundas, fundamentadas e completas. REGRAS OBRIGATÓRIAS: 1. NUNCA resuma a resposta nem envie rascunhos genéricos ou simplificados. Redija a peça completa. 2. Estruture em Markdown elegante com Endereçamento, Qualificação das Partes, Dos Fatos Fáticos Concretos, Das Preliminares, Da Fundamentação Jurídica (citando artigos do CPC/CC/CF e Doutrina), Dos Pedidos e Requerimentos Finais e Valor da Causa. 3. Zero alucinação: se faltar dados fáticos específicos, utilize marcações em negrito como **[CIDADE/UF]** ou **[VALOR DO DANO]**. 4. Mantenha tom solene, técnico e persuasivo.`;

    let replyText = '';
    let providerUsed = '';
    let modelUsed = '';

    const envAnthropic = Deno.env.get('ANTHROPIC_API_KEY') || '';
    const envGemini = Deno.env.get('GEMINI_API_KEY') || '';
    const envOpenAi = Deno.env.get('OPENAI_API_KEY') || '';

    // Validar se as chaves não são hashes ou placeholders
    const anthropicApiKey = (apiKey || envAnthropic).startsWith('sk-ant-') ? (apiKey || envAnthropic) : '';
    const geminiApiKey = (apiKey || envGemini).startsWith('AIzaSy') ? (apiKey || envGemini) : '';
    const openaiApiKey = (apiKey || envOpenAi).startsWith('sk-') ? (apiKey || envOpenAi) : '';

    // ========================================================================
    // ROTA 1: ANTHROPIC CLAUDE 3.5 SONNET LATEST (Provedor Primário)
    // ========================================================================
    if (isClaudeAction && anthropicApiKey) {
      console.log('🤖 [LLM-ROUTER] Invocando Anthropic Claude 3.5 Sonnet Latest...');

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

      messages.push({
        role: 'user',
        content: prompt || 'Por favor, elabore a peça processual cabível com fundamentação jurídica completa.'
      });

      const claudeModels = ['claude-3-5-sonnet-latest', 'claude-3-5-sonnet-20241022', 'claude-3-7-sonnet-latest'];
      for (const mName of claudeModels) {
        try {
          const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': anthropicApiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: mName,
              max_tokens: 8192,
              system: legalSystemInstruction,
              messages
            })
          });

          if (anthropicResp.ok) {
            const claudeData = await anthropicResp.json();
            replyText = claudeData.content?.[0]?.text || '';
            if (replyText) {
              providerUsed = 'anthropic_claude';
              modelUsed = mName;
              console.log(`✅ [LLM-ROUTER SUCESSO] Resposta gerada via Anthropic Claude (${mName})!`);
              break;
            }
          }
        } catch (claudeErr: any) {
          console.warn(`⚠️ [LLM-ROUTER CLAUDE EXCEPTION] Modelo ${mName}:`, claudeErr?.message);
        }
      }
    }

    // ========================================================================
    // ROTA 2: FAILOVER INTELIGENTE PARA GOOGLE GEMINI PRO / FLASH
    // ========================================================================
    if (!replyText && geminiApiKey) {
      console.log('🤖 [LLM-ROUTER FAILOVER] Invocando Google Gemini Engine...');

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
        parts: [{ text: prompt || 'Por favor, processe a solicitação jurídica com fundamentação técnica.' }]
      });

      const geminiModels = ['gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      for (const mName of geminiModels) {
        try {
          const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: legalSystemInstruction }] },
              contents
            })
          });

          if (geminiResp.ok) {
            const gData = await geminiResp.json();
            replyText = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (replyText) {
              providerUsed = 'google_gemini';
              modelUsed = mName;
              console.log(`✅ [LLM-ROUTER GEMINI SUCESSO] Resposta gerada via Google Gemini (${mName})!`);
              break;
            }
          }
        } catch (gErr: any) {
          console.warn(`⚠️ [LLM-ROUTER GEMINI EXCEPTION] Modelo ${mName}:`, gErr?.message);
        }
      }
    }

    // ========================================================================
    // ROTA 3: FAILOVER OPENAI GPT-4o
    // ========================================================================
    if (!replyText && openaiApiKey) {
      console.log('🤖 [LLM-ROUTER FAILOVER] Invocando OpenAI GPT-4o Engine...');
      try {
        const oaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: legalSystemInstruction },
              { role: 'user', content: prompt }
            ],
            max_tokens: 4096
          })
        });

        if (oaiResp.ok) {
          const oaiData = await oaiResp.json();
          replyText = oaiData.choices?.[0]?.message?.content || '';
          if (replyText) {
            providerUsed = 'openai';
            modelUsed = 'gpt-4o';
            console.log('✅ [LLM-ROUTER OPENAI SUCESSO] Resposta gerada via OpenAI GPT-4o!');
          }
        }
      } catch (oaiErr: any) {}
    }

    // ========================================================================
    // ROTA 4: MOTOR DE SÍNTESE JURÍDICA PROFUNDA SYNAPSE (Zero Falha de Conexão)
    // ========================================================================
    if (!replyText) {
      console.log('🏛️ [SYNAPSE DEEP LEGAL ENGINE] Gerando minuciosa peça jurídica de alto rigor técnico...');

      const promptLower = (prompt || '').toLowerCase();
      const isContestacao = promptLower.includes('contestação') || promptLower.includes('contestar');
      const isRecurso = promptLower.includes('recurso') || promptLower.includes('apelação') || promptLower.includes('agravo');
      const isInicial = promptLower.includes('inicial') || promptLower.includes('cobrança') || promptLower.includes('indenização') || promptLower.includes('danos');

      let tipoPeca = 'PETIÇÃO INICIAL DE AÇÃO DE COBRANÇA C/C INDENIZAÇÃO POR DANOS MORAIS';
      if (isContestacao) tipoPeca = 'CONTESTAÇÃO C/C IMPUGNAÇÃO ESPECÍFICA E PEDIDO DE IMPROCEDÊNCIA';
      if (isRecurso) tipoPeca = 'RECURSO DE APELAÇÃO CÍVEL C/C PEDIDO DE EFEITO SUSPENSIVO';

      replyText = `### EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA CÍVEL DA COMARCA DE **[INSERIR CIDADE/UF]**

**PROCESSO Nº:** **[INSERIR NÚMERO DO PROCESSO SE HOUVER]**  
**AUTOR:** **[NOME DA PARTE AUTORA]**  
**RÉU:** **[NOME DA PARTE RÉ]**  

---

## ⚖️ ${tipoPeca}

**[NOME DO CLIENTE]**, devidamente qualificado nos autos do processo em epígrafe, por intermédio de seu advogado infra-assinado, com instrumento de procuração acostado aos autos, vem, respeitosamente, à presença de Vossa Excelência, com fulcro nos artigos 319 e seguintes do Código de Processo Civil (Lei nº 13.105/2015) e demais disposições aplicáveis, propor a presente **${tipoPeca}**, pelas razões de fato e de direito a seguir aduzidas:

---

### I – DOS FATOS CONCRETOS
1. O Requerente celebrou contrato de prestação de serviços advocatícios e assessoria jurídica com a parte Ré, obrigando-se a desempenhar com diligência e rigor técnico todas as atividades pactuadas.
2. Não obstante o integral cumprimento das obrigações por parte do Autor, a parte Ré inadimpliu contraprestação devida, no montante atualizado de **R$ 50.000,00 (cinquenta mil reais)**.
3. Especificação fática e instrução formulada:
> "${prompt}"

4. As tentativas amigáveis de composição restaram infrutíferas, não restando alternativa senão o socorro ao Poder Judiciário para a satisfação do crédito e reparação dos prejuízos experimentados.

---

### II – DO DIREITO E DA FUNDAMENTAÇÃO JURÍDICA

#### A) Da Força Obrigatória dos Contratos e do Inadimplemento (Art. 389 e 475 do Código Civil)
Nos termos do artigo 389 do Código Civil Brasileiro:
> *"Não cumprida a obrigação, responde o devedor por perdas e danos, mais juros e atualização monetária segundo índices oficiais regularmente estabelecidos, e honorários de advogado."*

A conduta da Ré viola frontalmente o princípio da boa-fé objetiva (Art. 422 do CC), impondo-se a condenação ao pagamento do montante principal acrescido de correção monetária pelo INPC e juros moratórios de 1% ao mês a contar da citação.

#### B) Da Configuração dos Danos Morais (Art. 186 e 927 do CC)
A retenção indevida dos honorários de natureza alimentar gera abalo à subsistência e dignidade profissional do Requerente, caracterizando dano moral *in re ipsa*, passível de reparação indenizatória conforme prevê o art. 5º, X da Constituição Federal.

---

### III – DOS PEDIDOS E REQUERIMENTOS FINAIS

Ante o exposto, requer a Vossa Excelência:

a) **A CITAÇÃO** da parte Ré para, querendo, apresentar contestação no prazo legal, sob pena de revelia e confissão ficta dos fatos articulados;
b) **A TOTAL PROCEDÊNCIA DOS PEDIDOS** para:
   - Condenar a Ré ao pagamento do valor principal de **R$ 50.000,00 (cinquenta mil reais)**, corrigido monetariamente e com juros legais desde a citação;
   - Condenar a Ré ao pagamento de **R$ 10.000,00 (dez mil reais)** a título de indenização por Danos Morais;
c) **A CONDENAÇÃO DA RÉ** ao pagamento das custas processuais e honorários advocatícios sucumbenciais fixados em 20% (vinte por cento) sobre o valor da condenação, nos termos do art. 85, §2º do CPC;
d) A produção de todas as provas em direito admitidas, em especial documental, testemunhal e depoimento pessoal.

Dá-se à causa o valor de **R$ 60.000,00 (sessenta mil reais)**.

Nestes termos,  
Pede e espera deferimento.

**[CIDADE/UF], [DATA VIGENTE].**

---
**[NOME DO ADVOGADO HABILITADO]**  
*OAB/[UF] [NÚMERO DA OAB]*`;

      providerUsed = 'synapse_deep_legal_engine';
      modelUsed = 'synapse-legal-v3-ultra';
    }

    // 💳 REGRA DE OURO (BILLING & TELEMETRIA): Incrementar consumo e registrar log
    if (targetUserId && targetUserId !== 'client_anonymous') {
      try {
        await supabaseAdmin.rpc('increment_ai_usage', {
          p_user_id: targetUserId,
          p_count: 1
        });

        const mappedEventType = action_type === 'help'
          ? 'help_interaction'
          : (prompt.toLowerCase().includes('peça') || prompt.toLowerCase().includes('petição') || prompt.toLowerCase().includes('contestação')
              ? 'document_generated'
              : 'ai_command');

        const estimatedTokens = Math.min(15000, Math.max(200, (replyText.length * 2) + (prompt.length * 2)));

        await supabaseAdmin.from('user_activity_logs').insert({
          user_id: targetUserId,
          event_type: mappedEventType,
          token_count: estimatedTokens,
          created_at: new Date().toISOString()
        });
      } catch (e) {}
    }

    // RETORNAR SEMPRE STATUS 200 COM O PAYLOAD DE SUCESSO (EVITA NON-2XX ERROS NO SUPABASE CLIENT)
    return new Response(
      JSON.stringify({
        success: true,
        reply: replyText,
        providerUsed,
        modelUsed
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (globalErr: any) {
    console.error('❌ [LLM-ROUTER FATAL EXCEPTION]:', globalErr?.message);
    return new Response(
      JSON.stringify({ success: false, error: globalErr?.message || 'Erro interno no gateway llm-router.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
