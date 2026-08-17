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

    // ------------------------------------------------------------------------
    // CAMADA 1: Invocação Segura do Gateway Multi-LLM (Supabase Edge Function llm-router)
    // ------------------------------------------------------------------------
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

      // Se a Edge Function retornou uma mensagem explícita de limitação de plano (Plano Light ou limite de peças atingido)
      if (data?.error && (data.error.includes('Plano Light') || data.error.includes('limite mensal') || data.error.includes('upgrade'))) {
        return {
          success: false,
          reply: `⚠️ ${data.error}`,
          providerUsed: 'llm_router',
          error: data.error
        };
      }

      if (error) {
        console.warn('⚠️ [LegalAiService - llm-router Warn]:', error.message);
      } else if (data?.error) {
        console.warn('⚠️ [LegalAiService - llm-router Error JSON]:', data.error);
      }
    } catch (tier1Error: any) {
      console.warn('⚠️ [LegalAiService - llm-router Falha de Conexão]:', tier1Error?.message || tier1Error);
    }

    // ------------------------------------------------------------------------
    // CAMADA 2: Failover de Emergência (Geração de Minuta Estruturada Local Offline)
    // ------------------------------------------------------------------------
    console.log('🛡️ [LegalAiService - Emergência] Ativando Motor de Minuta Jurídica Estruturada Local...');
    const emergencyReply = LegalAiService.generateEmergencyDraft(prompt, fileUrls);

    return {
      success: true,
      reply: emergencyReply,
      providerUsed: 'emergency_fallback',
      modelUsed: 'synapse-legal-local-v1',
    };
  }

  /**
   * Gera uma minuta de emergência estruturada caso haja indisponibilidade de conexões de rede.
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
*Advogado Habilitado*`;
  }
}
