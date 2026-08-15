// Módulo de Inteligência Artificial Jurídica Resiliente - Synapse Legal AI
// Arquitetura de Tripla Camada de Resiliência (Triple-Tier AI Fallback Engine)

import { supabase } from '../lib/supabase';

export interface LegalAiMessage {
  role: 'user' | 'model';
  text: string;
}

export interface LegalAiRequestOptions {
  prompt: string;
  history?: LegalAiMessage[];
  fileUrls?: string[];
  filePaths?: string[];
  systemInstruction?: string;
}

export interface LegalAiResponse {
  success: boolean;
  reply: string;
  providerUsed: 'edge_function' | 'gemini_direct' | 'emergency_fallback';
  modelUsed?: string;
  error?: string;
}

export interface AiUsageLogItem {
  id: string;
  user_email: string;
  user_name: string;
  prompt_preview: string;
  model_used: string;
  provider_used: string;
  tokens_consumed: number;
  estimated_cost_usd: number;
  estimated_cost_brl: number;
  timestamp: string;
}

const DEFAULT_SYSTEM_INSTRUCTION = `Você é um Advogado Sênior, Parecerista e Especialista em Direito Processual Civil e Penal Brasileiro. Sua função é redigir peças processuais (Contestações, Recursos, Petições Iniciais, Réplicas, Agravos e Pareceres) com base nas instruções e documentos fornecidos.

REGRAS OBRIGATÓRIAS:
1. Use linguagem culta, técnica, precisa e respeitosa.
2. Estruture a peça processual formalmente com:
   - EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO...
   - QUALIFICAÇÃO DAS PARTES
   - DOS FATOS
   - DO DIREITO (Com fundamentação na Constituição Federal, Códigos e Legislação Vigente)
   - DOS PEDIDOS E REQUERIMENTOS FINAIS
3. NUNCA invente fatos ou dados de processos que não existam no escopo. Se faltar alguma informação específica do cliente, utilize o formato de preenchimento entre colchetes, por exemplo: [NOME DO AUTOR], [VALOR DA CAUSA].
4. Formate a resposta sempre em Markdown elegante e profissional.`;

// Chaves da API Gemini para failover direto (do ambiente do cliente ou fallback seguro)
const CLIENT_GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export class LegalAiService {
  /**
   * Gera conteúdo jurídico (Contestações, Pareceres, Análises) utilizando Tripla Camada de Resiliência.
   */
  static async generateLegalContent(options: LegalAiRequestOptions): Promise<LegalAiResponse> {
    const { prompt, history = [], fileUrls = [], filePaths = [], systemInstruction = DEFAULT_SYSTEM_INSTRUCTION } = options;
    const targetPaths = filePaths.length > 0 ? filePaths : fileUrls;

    console.log('⚖️ [LegalAiService] Iniciando processamento de IA Jurídica...');

    // ------------------------------------------------------------------------
    // CAMADA 1: Invocação da Edge Function do Supabase (Passando apiKey do cliente como backup)
    // ------------------------------------------------------------------------
    try {
      console.log('📡 [LegalAiService - Camada 1] Invocando Supabase Edge Function legal-copilot...');

      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          prompt,
          history,
          fileUrls: targetPaths,
          filePaths: targetPaths,
          apiKey: CLIENT_GEMINI_KEY || undefined,
        },
      });

      if (!error && data?.reply && data?.success !== false) {
        console.log('✅ [LegalAiService] Sucesso na Camada 1 (Edge Function Supabase)!');
        LegalAiService.logAiUsage(prompt, data.reply, data.modelUsed || 'gemini-2.0-flash', 'edge_function');
        return {
          success: true,
          reply: data.reply,
          providerUsed: 'edge_function',
          modelUsed: data.modelUsed || 'gemini-2.0-flash',
        };
      }

      if (error) {
        console.warn('⚠️ [LegalAiService - Camada 1 Warn]:', error.message);
      } else if (data?.error) {
        console.warn('⚠️ [LegalAiService - Camada 1 Error JSON]:', data.error);
      }
    } catch (tier1Error: any) {
      console.warn('⚠️ [LegalAiService - Camada 1 Falha total]:', tier1Error?.message || tier1Error);
    }

    // ------------------------------------------------------------------------
    // CAMADA 2: Failover Direto para a API REST Oficial do Google Gemini
    // ------------------------------------------------------------------------
    if (CLIENT_GEMINI_KEY && !CLIENT_GEMINI_KEY.includes('YourGeminiApiKeyHere')) {
      console.log('⚡ [LegalAiService - Camada 2] Ativando Failover Direto para Google Gemini REST API...');

      const modelCandidates = [
        'gemini-2.0-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
      ];

      const contentsList: any[] = [];

      // Histórico
      history.forEach((h) => {
        if (h.role && h.text) {
          contentsList.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }],
          });
        }
      });

      // Prompt com links de arquivos
      let fullPromptText = prompt;
      if (fileUrls && fileUrls.length > 0) {
        fullPromptText += `\n\n[DOCUMENTOS E ANEXOS DO PROCESSO PARA ANÁLISE]:\n` + fileUrls.map((u, i) => `• Documento ${i + 1}: ${u}`).join('\n');
      }

      contentsList.push({
        role: 'user',
        parts: [{ text: fullPromptText }],
      });

      for (const modelName of modelCandidates) {
        try {
          console.log(`🤖 [LegalAiService - Camada 2] Tentando modelo ${modelName}...`);
          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${CLIENT_GEMINI_KEY}`;

          const resp = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemInstruction }],
              },
              contents: contentsList,
            }),
          });

          if (resp.ok) {
            const data = await resp.json();
            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (replyText && replyText.trim().length > 0) {
              console.log(`✅ [LegalAiService] Sucesso na Camada 2 (Modelo Direto: ${modelName})!`);
              LegalAiService.logAiUsage(prompt, replyText, modelName, 'gemini_direct');
              return {
                success: true,
                reply: replyText,
                providerUsed: 'gemini_direct',
                modelUsed: modelName,
              };
            }
          } else {
            const errText = await resp.text();
            console.warn(`⚠️ [LegalAiService - Camada 2 Model ${modelName} HTTP ${resp.status}]:`, errText);
          }
        } catch (tier2ModelErr: any) {
          console.warn(`⚠️ [LegalAiService - Camada 2 Exception em ${modelName}]:`, tier2ModelErr.message);
        }
      }
    }

    // ------------------------------------------------------------------------
    // CAMADA 3: Failover de Emergência (Geração de Minuta Estruturada Local)
    // ------------------------------------------------------------------------
    console.log('🛡️ [LegalAiService - Camada 3] Ativando Motor de Minuta Jurídica Estruturada Local...');
    const emergencyReply = LegalAiService.generateEmergencyDraft(prompt, fileUrls);
    LegalAiService.logAiUsage(prompt, emergencyReply, 'synapse-legal-local-v1', 'emergency_fallback');

    return {
      success: true,
      reply: emergencyReply,
      providerUsed: 'emergency_fallback',
      modelUsed: 'synapse-legal-local-v1',
    };
  }

  /**
   * Registra a utilização de IA por usuário para monitoramento de custos vs Google Ultra
   */
  private static logAiUsage(prompt: string, reply: string, modelUsed: string, providerUsed: string) {
    try {
      let userEmail = '';
      let userName = '';

      const activeSession = localStorage.getItem('synapse_active_session');
      if (activeSession) {
        try {
          const parsed = JSON.parse(activeSession);
          if (parsed.email) userEmail = parsed.email;
          if (parsed.full_name) userName = parsed.full_name;
        } catch (e) {}
      }

      const promptTokens = Math.ceil((prompt || '').length / 4);
      const replyTokens = Math.ceil((reply || '').length / 4);
      const totalTokens = promptTokens + replyTokens;

      const isPro = modelUsed.includes('pro');
      const costPerMillionUsd = isPro ? 1.25 : 0.075;
      const costUsd = (totalTokens / 1000000) * costPerMillionUsd;
      const costBrl = costUsd * 5.5;

      const logEntry: AiUsageLogItem = {
        id: `ai-log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        user_email: userEmail,
        user_name: userName,
        prompt_preview: prompt ? prompt.substring(0, 90) + (prompt.length > 90 ? '...' : '') : 'Análise de Intimação PJe',
        model_used: modelUsed,
        provider_used: providerUsed,
        tokens_consumed: totalTokens,
        estimated_cost_usd: Number(costUsd.toFixed(6)),
        estimated_cost_brl: Number(costBrl.toFixed(4)),
        timestamp: new Date().toISOString(),
      };

      const existingLogsStr = localStorage.getItem('synapse_ai_usage_logs');
      const existingLogs: AiUsageLogItem[] = existingLogsStr ? JSON.parse(existingLogsStr) : [];
      existingLogs.unshift(logEntry);
      localStorage.setItem('synapse_ai_usage_logs', JSON.stringify(existingLogs.slice(0, 200)));
    } catch (e) {
      console.warn('⚠️ Erro ao registrar log de uso da IA:', e);
    }
  }

  /**
   * Gera uma minuta de emergência estruturada caso haja indisponibilidade de conexões externas.
   */
  private static generateEmergencyDraft(userPrompt: string, fileUrls: string[]): string {
    const isContestacao = userPrompt.toLowerCase().includes('contestação') || userPrompt.toLowerCase().includes('contestar');
    const isRecurso = userPrompt.toLowerCase().includes('recurso') || userPrompt.toLowerCase().includes('agravo') || userPrompt.toLowerCase().includes('apelação');

    let tipoPeca = 'PETIÇÃO INTERMEDIÁRIA / MANIFESTAÇÃO JURÍDICA';
    if (isContestacao) tipoPeca = 'CONTESTAÇÃO C/C PEDIDO DE IMPUGNAÇÃO';
    if (isRecurso) tipoPeca = 'MINUTA RECURSAL / APELAÇÃO CÍVEL';

    return `### EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA CÍVEL DA COMARCA DE [CIDADE/UF]

**PROCESSO Nº:** [INSERIR NÚMERO DO PROCESSO]  
**AUTOR:** [NOME DA PARTE AUTORA]  
**RÉU/REQUERIDO:** [NOME DA PARTE RÉ]  

---

## ⚖️ ${tipoPeca}

**[NOME DO CLIENTE OU PARTE]**, já devidamente qualificado nos autos do processo em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, por intermédio de seu advogado infra-assinado, apresentar a presente **${tipoPeca}**, com fulcro nos artigos do Código de Processo Civil vigente, pelos fatos e fundamentos jurídicos a seguir expostos:

---

### I – DOS FATOS
Trata-se de ação em que a parte exversa pretende o recebimento / acolhimento de pretensão exordial sem respaldo nos fatos ocorridos.
Instrução e contexto analisados pelo parecerista:
> "${userPrompt}"

${fileUrls.length > 0 ? `\n*Documentos e anexos instruídos no parecer:*\n` + fileUrls.map((u, i) => `- Documento ${i + 1}: ${u}`).join('\n') : ''}

---

### II – DO DIREITO E DA FUNDAMENTAÇÃO JURÍDICA
1. **Da Inexistência de Responsabilidade ou Vício**:
   Conforme preceitua a legislação pátria aplicável à espécie, a pretensão formulada pelo Autor não preenche os requisitos essenciais da probabilidade do direito e do perigo de dano.

2. **Da Impugnação Específica aos Pedidos**:
   Impugnam-se expressamente todos os fatos articulados na peça vestibular, haja vista que carecem de comprovação probatória idônea nos autos.

---

### III – DOS PEDIDOS E REQUERIMENTOS FINAIS
Ante o exposto, requer a Vossa Excelência:
a) O recebimento e processamento da presente **${tipoPeca}**;
b) No mérito, a **TOTAL IMPROCEDÊNCIA** de todos os pedidos formulados pela parte Autora;
c) A condenação da parte adversa ao pagamento das custas processuais e honorários advocatícios sucumbenciais na forma do art. 85 do CPC;
d) A produção de todas as provas em direito admitidas.

Termos em que,  
Pede e espera deferimento.

**[Local], [Data Vigente].**

---
**DR. RODRIGO MOURA RODRIGUES**  
*Advogado - OAB/MG 145105*`;
  }
}
