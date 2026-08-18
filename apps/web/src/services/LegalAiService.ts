// Módulo de Inteligência Artificial Jurídica Resiliente - Synapse Legal AI (Gateway Multi-LLM)
// Roteamento Seguro via Edge Function llm-router (Claude 3.5 Sonnet + Gemini 2.0 Flash)

import { supabase } from '../lib/supabase';

export interface LegalAiMessage {
  role: 'user' | 'model';
  text: string;
}

export interface LegalAiRequestOptions {
  prompt: string;
  actionType?: 'gerar_peca' | 'discutir_processo' | 'help';
  history?: LegalAiMessage[];
  fileUrls?: string[];
  filePaths?: string[];
  systemInstruction?: string;
}

export interface LegalAiResponse {
  success: boolean;
  reply: string;
  providerUsed: 'llm_router' | 'emergency_fallback';
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

export class LegalAiService {
  /**
   * Gera conteúdo jurídico (Contestações, Pareceres, Análises) roteando com segurança para a Edge Function llm-router.
   */
  static async generateLegalContent(options: LegalAiRequestOptions): Promise<LegalAiResponse> {
    const { prompt, actionType = 'gerar_peca', history = [], fileUrls = [], filePaths = [] } = options;
    const targetPaths = filePaths.length > 0 ? filePaths : fileUrls;

    console.log(`⚖️ [LegalAiService] Processando solicitação (${actionType}) via Roteador Seguro llm-router...`);

    try {
      const { data, error } = await supabase.functions.invoke('llm-router', {
        body: {
          action_type: actionType,
          prompt,
          history,
          fileUrls: targetPaths,
          filePaths: targetPaths
        },
      });

      if (!error && data?.reply && data?.success !== false) {
        console.log(`✅ [LegalAiService] Sucesso via llm-router (Provedor: ${data.providerUsed || 'Claude/Gemini'}, Modelo: ${data.modelUsed})!`);
        return {
          success: true,
          reply: data.reply,
          providerUsed: 'llm_router',
          modelUsed: data.modelUsed || 'claude-3-5-sonnet-latest',
        };
      }

      if (data?.error) {
        console.warn('⚠️ [LegalAiService - llm-router Error JSON]:', data.error);
        return {
          success: false,
          reply: `⚠️ ${data.error}`,
          providerUsed: 'llm_router',
          error: data.error
        };
      }

      if (error) {
        console.warn('⚠️ [LegalAiService - llm-router Warn]:', error.message);
        return {
          success: false,
          reply: `⚠️ Ocorreu um erro ao comunicar com a IA: ${error.message}`,
          providerUsed: 'llm_router',
          error: error.message
        };
      }
    } catch (tier1Error: any) {
      console.warn('⚠️ [LegalAiService - llm-router Falha de Conexão]:', tier1Error?.message || tier1Error);
      return {
        success: false,
        reply: `⚠️ Erro de conexão com o servidor de Inteligência Artificial: ${tier1Error?.message || 'Falha de rede.'}`,
        providerUsed: 'llm_router',
        error: tier1Error?.message || 'Falha de conexão'
      };
    }

    return {
      success: false,
      reply: '⚠️ Não foi possível obter resposta da Inteligência Artificial. Por favor, tente novamente.',
      providerUsed: 'llm_router'
    };
  }
}
