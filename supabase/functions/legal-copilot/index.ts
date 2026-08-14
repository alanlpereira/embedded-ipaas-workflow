// Supabase Edge Function: legal-copilot
// Módulo Legal Copilot: Redação de Peças Processuais e Análise Documental via IA Resiliente (Storage Privado)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// REGRA CRÍTICA 1: Helper de conversão binária iterativo seguro para Base64 (sem exceder limite de pilha)
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
  // REGRA CRÍTICA 2: Tratar cabeçalhos CORS e requisições OPTIONS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // REGRA CRÍTICA 2: Bloco try/catch global intacto
  try {
    const bodyText = await req.text();
    let payload: any = {};
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      payload = {};
    }

    const { prompt, history = [], fileUrls = [], filePaths = [], apiKey } = payload;
    const targetPaths: string[] = (Array.isArray(filePaths) && filePaths.length > 0)
      ? filePaths
      : (Array.isArray(fileUrls) ? fileUrls : []);

    if (!prompt && targetPaths.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Prompt ou caminhos de arquivos são obrigatórios.' }),
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

    // Instanciar cliente Supabase com Service Role Key para acessar o bucket privado
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const systemInstructionText = `Você é um Advogado Sênior e Parecerista do Direito Brasileiro. Sua função é redigir peças processuais, memorandos e petições com base nas instruções e documentos fornecidos. REGRAS: 1. Use linguagem culta, técnica e formal. 2. Estruture as peças com endereçamento, qualificação, dos fatos, do direito e dos pedidos. 3. NUNCA invente números de leis, jurisprudências ou fatos que não estejam no escopo. Se faltar informação, use colchetes [INSERIR AQUI]. 4. Formate a saída em Markdown claro.`;

    const contents: any[] = [];

    // 1. Histórico de mensagens
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

    // 2. Montar partes do prompt do usuário e anexos do bucket privado 'legal_copilot_files'
    const userParts: any[] = [];
    let userPromptText = prompt || 'Por favor, analise os documentos anexados e elabore o parecer ou peça processual cabível.';
    
    // Download seguro de arquivos em memória via Supabase Admin Client (Sem fetch de URLs públicas)
    if (targetPaths.length > 0) {
      userPromptText += `\n\n[DOCUMENTOS ANEXADOS DO STORAGE PRIVADO PARA ANÁLISE]:\n` + targetPaths.map((p: string, i: number) => `• Anexo ${i + 1}: ${p}`).join('\n');
    }

    userParts.push({ text: userPromptText });

    if (targetPaths.length > 0) {
      for (const filePath of targetPaths) {
        try {
          console.log(`📥 [LEGAL COPILOT EDGE] Baixando arquivo do bucket privado legal_copilot_files: ${filePath}...`);
          
          const { data: fileBlob, error: downloadErr } = await supabaseAdmin.storage
            .from('legal_copilot_files')
            .download(filePath);

          if (!downloadErr && fileBlob) {
            const arrayBuffer = await fileBlob.arrayBuffer();
            const base64Data = arrayBufferToBase64(arrayBuffer);
            
            // Determinar o MIME Type adequado
            let mimeType = fileBlob.type || 'application/pdf';
            if (filePath.endsWith('.png')) mimeType = 'image/png';
            if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) mimeType = 'image/jpeg';
            if (filePath.endsWith('.webp')) mimeType = 'image/webp';
            if (filePath.endsWith('.txt')) mimeType = 'text/plain';

            userParts.push({
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            });

            console.log(`✅ [LEGAL COPILOT EDGE] Arquivo privado ${filePath} carregado em memória (${arrayBuffer.byteLength} bytes).`);
          } else {
            console.warn(`⚠️ [LEGAL COPILOT EDGE WARN] Não foi possível baixar ${filePath}:`, downloadErr?.message);
          }
        } catch (fileErr: any) {
          console.warn(`⚠️ Exceção ao processar arquivo privado ${filePath}:`, fileErr?.message);
        }
      }
    }

    contents.push({
      role: 'user',
      parts: userParts
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
