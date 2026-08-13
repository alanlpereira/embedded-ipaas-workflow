// Supabase Edge Function: legal-copilot
// Módulo Legal Copilot: Redação de Peças Processuais e Análise Documental via IA Resiliente

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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

    const { prompt, history = [], fileUrls = [], apiKey } = payload;

    if (!prompt && fileUrls.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Prompt ou arquivos são obrigatórios.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = apiKey || Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey || geminiApiKey.includes('YourGeminiApiKeyHere')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Chave GEMINI_API_KEY não configurada no servidor Supabase Edge.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemInstructionText = `Você é um Advogado Sênior e Parecerista do Direito Brasileiro. Sua função é redigir peças processuais, memorandos e petições com base nas instruções e documentos fornecidos. REGRAS: 1. Use linguagem culta, técnica e formal. 2. Estruture as peças com endereçamento, qualificação, dos fatos, do direito e dos pedidos. 3. NUNCA invente números de leis, jurisprudências ou fatos que não estejam no escopo. Se faltar informação, use colchetes [INSERIR AQUI]. 4. Formate a saída em Markdown claro.`;

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

    let userPromptText = prompt || 'Por favor, analise os documentos anexados e elabore o parecer ou peça processual cabível.';
    if (Array.isArray(fileUrls) && fileUrls.length > 0) {
      userPromptText += `\n\n[DOCUMENTOS ANEXADOS PARA ANÁLISE]:\n` + fileUrls.map((url: string, i: number) => `• Documento ${i + 1}: ${url}`).join('\n');
    }

    contents.push({
      role: 'user',
      parts: [{ text: userPromptText }]
    });

    const modelCandidates = [
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    let replyText = '';
    let lastError = '';
    let usedModelName = '';

    for (const modelName of modelCandidates) {
      console.log(`🤖 [LEGAL COPILOT EDGE] Invocando modelo ${modelName}...`);
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

      try {
        const resp = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemInstructionText }]
            },
            contents
          })
        });

        if (resp.ok) {
          const data = await resp.json();
          replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (replyText) {
            usedModelName = modelName;
            console.log(`✅ [LEGAL COPILOT EDGE SUCESSO] Resposta gerada com modelo ${modelName}!`);
            break;
          }
        } else {
          lastError = await resp.text();
          console.warn(`⚠️ [LEGAL COPILOT EDGE WARN] Modelo ${modelName} HTTP ${resp.status}:`, lastError);
        }
      } catch (err: any) {
        lastError = err.message;
        console.warn(`⚠️ [LEGAL COPILOT EDGE EXCEPTION] Modelo ${modelName}:`, err);
      }
    }

    if (!replyText) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível obter resposta de nenhum dos modelos Gemini.', detail: lastError }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, reply: replyText, modelUsed: usedModelName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('❌ [LEGAL COPILOT EDGE EXCEPTION]:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erro interno no servidor Legal Copilot.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
