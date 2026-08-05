/**
 * Módulo de integração com a API do Gemini (Google AI Studio)
 * com Suporte a Structured Outputs (JSON Schema).
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export interface GeneratedFlowchartResponse {
  nodes: Array<{
    id: string;
    type: 'trigger' | 'action' | 'decision' | 'approval' | 'output';
    position: { x: number; y: number };
    data: {
      label: string;
      type: 'trigger' | 'action' | 'decision' | 'approval' | 'output';
      description?: string;
      config?: Record<string, any>;
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    label?: string;
    animated?: boolean;
  }>;
}

export async function generateFlowchartWithAI(prompt: string): Promise<GeneratedFlowchartResponse> {
  console.log(`🤖 [GEMINI AI] Processando solicitação de geração de fluxo: "${prompt}"`);

  // 1. Se houver chave API do Gemini configurada, chama o Google AI Studio com Structured Outputs
  if (GEMINI_API_KEY && !GEMINI_API_KEY.includes('your-gemini-api-key')) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Você é um arquiteto especialista em motores de workflow B2B (Embedded iPaaS).
Crie um fluxograma funcional baseado no prompt do usuário: "${prompt}".
As opções válidas de tipos de nós (node types) são: "trigger", "action", "decision", "approval", "output".
Sua resposta DEVE SER ESTRITAMENTE um JSON válido seguindo a estrutura exata:
{
  "nodes": [
    {
      "id": "node-1",
      "type": "trigger",
      "position": { "x": 250, "y": 80 },
      "data": { "label": "Nome do Nó", "type": "trigger", "description": "Descrição curta" }
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "node-1", "target": "node-2", "animated": true }
  ]
}`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );

      const jsonResult: any = await response.json();
      const rawText = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawText) {
        const parsed = JSON.parse(rawText);
        console.log(`✨ [GEMINI AI SUCCESS] Fluxograma com ${parsed.nodes?.length} nós gerado via Gemini API!`);
        return parsed;
      }
    } catch (err: any) {
      console.warn('⚠️ [GEMINI API WARN] Falha na chamada da API Gemini, recorrendo ao Gerador Estruturado Local:', err.message);
    }
  }

  // 2. Fallback Inteligente Estruturado baseado na análise de linguagem natural
  return generateSmartFallbackFlowchart(prompt);
}

/**
 * Gerador de fallback inteligente baseado no prompt
 */
function generateSmartFallbackFlowchart(userPrompt: string): GeneratedFlowchartResponse {
  const p = userPrompt.toLowerCase();
  const timestamp = Date.now();

  const nodes: GeneratedFlowchartResponse['nodes'] = [];
  const edges: GeneratedFlowchartResponse['edges'] = [];

  let currentY = 80;

  // Nó 1: Trigger
  nodes.push({
    id: `node-trigger-${timestamp}`,
    type: 'trigger',
    position: { x: 250, y: currentY },
    data: {
      label: p.includes('webhook') ? 'Trigger Webhook HTTP' : 'Gatilho de Evento B2B',
      type: 'trigger',
      description: 'Recebe o payload inicial de entrada da requisição',
      config: { event: 'incoming.event', endpoint: '/api/v1/trigger' },
    },
  });

  currentY += 150;
  let prevNodeId = `node-trigger-${timestamp}`;

  // Se o prompt mencionar "decisão" ou "valida"
  if (p.includes('decis') || p.includes('valida') || p.includes('se') || p.includes('condic')) {
    const decisionId = `node-decision-${timestamp}`;
    nodes.push({
      id: decisionId,
      type: 'decision',
      position: { x: 275, y: currentY },
      data: {
        label: 'Validar Regra B2B',
        type: 'decision',
        description: 'Verifica se o payload satisfaz os requisitos',
        config: { field: 'body.user.role', operator: 'equals', value: 'Master' },
      },
    });

    edges.push({
      id: `edge-${prevNodeId}-${decisionId}`,
      source: prevNodeId,
      target: decisionId,
      animated: true,
    });

    prevNodeId = decisionId;
    currentY += 160;
  }

  // Se o prompt mencionar "aprovação" ou "aprova"
  if (p.includes('aprova') || p.includes('gestor')) {
    const approvalId = `node-approval-${timestamp}`;
    nodes.push({
      id: approvalId,
      type: 'approval',
      position: { x: 100, y: currentY },
      data: {
        label: 'Aprovação do Gestor',
        type: 'approval',
        description: 'Solicita confirmação humana de segurança',
        config: { assignee: 'alan.pereira@alp-nexus.com', timeoutHours: 24 },
      },
    });

    edges.push({
      id: `edge-${prevNodeId}-${approvalId}`,
      source: prevNodeId,
      target: approvalId,
      sourceHandle: 'false',
      label: 'Não (Aprovação)',
      animated: true,
    });
  }

  // Nó de Ação / Requisição HTTP
  const actionId = `node-action-${timestamp}`;
  nodes.push({
    id: actionId,
    type: 'action',
    position: { x: 400, y: currentY },
    data: {
      label: 'Disparar Requisição API',
      type: 'action',
      description: 'Chama o endpoint REST externo com o resultado',
      config: { apiEndpoint: 'https://httpbin.org/post', method: 'POST' },
    },
  });

  edges.push({
    id: `edge-${prevNodeId}-${actionId}`,
    source: prevNodeId,
    target: actionId,
    sourceHandle: prevNodeId.includes('decision') ? 'true' : undefined,
    label: prevNodeId.includes('decision') ? 'Sim' : undefined,
    animated: true,
  });

  currentY += 160;

  // Nó de Saída / Output Final
  const outputId = `node-output-${timestamp}`;
  nodes.push({
    id: outputId,
    type: 'output',
    position: { x: 300, y: currentY },
    data: {
      label: 'Resposta Final JSON',
      type: 'output',
      description: 'Retorna HTTP 200 OK com payload processado',
      config: { format: 'JSON', statusCode: 200 },
    },
  });

  edges.push({
    id: `edge-${actionId}-${outputId}`,
    source: actionId,
    target: outputId,
    animated: true,
  });

  console.log(`✨ [SMART AI GENERATOR] Fluxograma com ${nodes.length} nós estruturado com sucesso!`);
  return { nodes, edges };
}

/**
 * Gerador de Payload JSON para o nó de Ação usando Gemini
 */
export async function generateActionPayloadWithAI(nodeLabel: string, contextPrompt?: string): Promise<Record<string, any>> {
  if (GEMINI_API_KEY && !GEMINI_API_KEY.includes('your-gemini-api-key')) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Gere um JSON de payload HTTP realista para uma requisição de API com a finalidade: "${nodeLabel}".
Retorne ESTRITAMENTE um JSON válido sem marcações markdown extra.`,
                  },
                ],
              },
            ],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      const jsonResult: any = await response.json();
      const rawText = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        return JSON.parse(rawText);
      }
    } catch (err: any) {
      console.warn('Falha Gemini payload:', err.message);
    }
  }

  // Default fallback payload JSON
  return {
    event: 'b2b.workflow.executed',
    source: nodeLabel || 'ActionNode',
    timestamp: new Date().toISOString(),
    user: {
      id: 'usr_master_2026',
      email: 'alan.pereira@alp-nexus.com',
      role: 'Master',
    },
    metadata: {
      environment: 'production',
      processedBy: 'NexusFlow Engine v1.0',
    },
  };
}
