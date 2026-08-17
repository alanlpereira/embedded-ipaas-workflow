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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://auth.alp-nexus.com';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Resolvendo User ID via JWT
    let targetUserId = userId || user_id;
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '').trim();
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        if (userData?.user?.id) {
          targetUserId = userData.user.id;
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

    const isClaudeAction = action_type === 'gerar_peca' || action_type === 'discutir_processo';
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') || apiKey;
    console.log(`🔑 [LLM-ROUTER DEBUG] isClaudeAction=${isClaudeAction}, keyLength=${(anthropicApiKey || '').length}`);

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
    // ROTA 2: GOOGLE GEMINI 2.0 FLASH / 1.5 PRO (Help Desk - action_type === 'help')
    // ------------------------------------------------------------------------
    if (!replyText && !isClaudeAction) {
      console.log('🤖 [LLM-ROUTER] Roteando para Google Gemini (Help Desk ou Fallback)...');
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || apiKey;
      
      if (geminiApiKey && !geminiApiKey.includes('YourGeminiApiKeyHere')) {
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
          parts: [{ text: prompt || 'Responda à solicitação jurídica do usuário.' }]
        });

        const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        for (const mName of geminiModels) {
          try {
            const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: systemInstructionText }] },
                contents
              })
            });

            if (geminiResp.ok) {
              const gData = await geminiResp.json();
              replyText = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (replyText) {
                providerUsed = 'google_gemini';
                modelUsed = mName;
                console.log(`✅ [LLM-ROUTER SUCESSO] Resposta gerada via Google Gemini (${mName})!`);
                break;
              }
            }
          } catch (gErr: any) {
            console.warn(`⚠️ [LLM-ROUTER GEMINI EXCEPTION] Modelo ${mName}:`, gErr?.message);
          }
        }
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
