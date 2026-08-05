import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { fallbackApprovalTokens, ApprovalTokenItem } from '../routes/approvals.js';
import { fallbackAuditLogs } from '../routes/audit.js';
import { fallbackMediaCallbacks, MediaCallbackItem } from '../routes/mediaCallback.js';
import { runCodeInSandbox } from './codeSandbox.js';
import { attemptAutoHealing } from './autoHealing.js';
import { decryptVaultSecret } from './vaultService.js';

export interface ExecutionJobData {
  executionId?: string;
  flowchartId: string;
  payload: any;
  timestamp?: string;
}

export interface ExecutionResult {
  status: 'COMPLETED' | 'WAITING_APPROVAL' | 'WAITING_MEDIA_CALLBACK' | 'FAILED' | 'HEALED_BY_AI';
  finalOutput?: any;
  pausedAtNodeId?: string;
  failedNodeId?: string;
  approvalToken?: string;
  approvalUrl?: string;
  callbackToken?: string;
  callbackUrl?: string;
  autoHealedPayload?: any;
  error?: string;
  executionLog: any[];
}

export interface ExecutionContext {
  executionLogId: string;
  flowchartId: string;
  triggerPayload: any;
  nodeResults: Record<string, any>;
  visitedNodes: Set<string>;
  executionLog: Array<{ timestamp: string; nodeId: string; nodeLabel: string; type: string; status: string; output?: any }>;
}

export async function processWorkflowJob(data: ExecutionJobData): Promise<ExecutionResult> {
  return await executeFlowchartGraph(data.flowchartId, data.payload);
}

/**
 * Motor de Travessia do Grafo do Fluxograma com Registro de Auditoria, AI Auto-Healing e Vault Decryption
 */
export async function executeFlowchartGraph(flowchartId: string, initialPayload: any): Promise<ExecutionResult> {
  console.log(`====================================================`);
  console.log(`🚀 [EXECUTION ENGINE] Iniciando travessia do fluxograma ID: ${flowchartId}`);
  console.log(`Payload de Entrada:`, JSON.stringify(initialPayload, null, 2));
  console.log(`====================================================`);

  const executionLogId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const auditRecord = {
    id: executionLogId,
    flowchart_id: flowchartId,
    flowchart_name: 'Integração Webhook & CRM B2B',
    status: 'RUNNING' as const,
    execution_trace: [],
    trigger_payload: initialPayload,
    created_at: new Date().toISOString(),
  };

  await supabaseAdmin.from('execution_logs').insert({
    id: executionLogId,
    flowchart_id: flowchartId,
    status: 'RUNNING',
    trigger_payload: initialPayload,
  });

  fallbackAuditLogs.set(executionLogId, auditRecord);

  let flowchart: any;
  const { data: dbFlowchart } = await supabaseAdmin
    .from('flowcharts')
    .select('*')
    .eq('id', flowchartId)
    .single();

  if (dbFlowchart) {
    flowchart = dbFlowchart;
  } else {
    flowchart = getFallbackFlowchart(flowchartId);
  }

  if (!flowchart || !flowchart.nodes || flowchart.nodes.length === 0) {
    console.error(`❌ [EXECUTION ENGINE ERROR] Fluxograma não possui nós para execução.`);
    return { status: 'FAILED', error: 'Fluxograma vazio ou não encontrado', executionLog: [] };
  }

  const nodes = flowchart.nodes;
  const edges = flowchart.edges || [];
  const triggerNode = nodes.find((n: any) => n.type === 'trigger' || n.data?.type === 'trigger') || nodes[0];

  const context: ExecutionContext = {
    executionLogId,
    flowchartId,
    triggerPayload: initialPayload,
    nodeResults: { [triggerNode.id]: { input: initialPayload, timestamp: new Date().toISOString() } },
    visitedNodes: new Set<string>(),
    executionLog: [],
  };

  return await traverseFromNode(triggerNode, nodes, edges, context, initialPayload);
}

/**
 * Função de travessia a partir de um nó específico
 */
async function traverseFromNode(
  startNode: any,
  nodes: any[],
  edges: any[],
  context: ExecutionContext,
  currentPayload: any
): Promise<ExecutionResult> {
  let currentNode = startNode;
  let loopSafetyCount = 0;
  const MAX_LOOP_ITERATIONS = 50;
  let wasHealedByAI = false;

  while (currentNode && loopSafetyCount < MAX_LOOP_ITERATIONS) {
    loopSafetyCount++;
    const nodeId = currentNode.id;
    const nodeType = currentNode.type || currentNode.data?.type || 'action';
    const nodeLabel = currentNode.data?.label || nodeId;

    console.log(`\n➡️  [PASSO ${loopSafetyCount}] Processando Nó: "${nodeLabel}" (${nodeType}) [ID: ${nodeId}]`);

    context.visitedNodes.add(nodeId);

    try {
      if (nodeType === 'trigger') {
        context.nodeResults[nodeId] = { status: 'SUCCESS', output: currentPayload };
        logStep(context, nodeId, nodeLabel, nodeType, 'SUCCESS', currentPayload);
      } else if (nodeType === 'code') {
        const userScript =
          currentNode.data?.config?.script ||
          `return { processed: true, companyName: input.company_name || 'Acme Corp', timestamp: new Date().toISOString() };`;

        console.log(`🧪 [CODE NODE] Executando script do usuário na Sandbox isolada...`);
        const sandboxRes = runCodeInSandbox(userScript, currentPayload);

        if (!sandboxRes.success) {
          const errorMessage = `Erro no Script do Usuário (Sandbox): ${sandboxRes.error}`;
          console.error(`💥 [CODE NODE FAILED] Nó "${nodeLabel}": ${errorMessage}`);

          logStep(context, nodeId, nodeLabel, nodeType, 'FAILED', { error: errorMessage });
          return { status: 'FAILED', failedNodeId: nodeId, error: errorMessage, executionLog: context.executionLog };
        }

        currentPayload = sandboxRes.output;
        context.nodeResults[nodeId] = { status: 'SUCCESS', output: sandboxRes.output };
        logStep(context, nodeId, nodeLabel, nodeType, 'SUCCESS', sandboxRes.output);
      } else if (nodeType === 'media') {
        const callbackToken = `media_cb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const apiBase = process.env.PUBLIC_API_URL || process.env.PUBLIC_APP_URL || 'https://synapse.alp-nexus.com';
        const callbackUrl = `${apiBase}/api/v1/media/callback/${callbackToken}`;

        console.log(`\n====================================================`);
        console.log(`🎬 [LONG-RUNNING MEDIA TASK] Pausando Worker para Renderização de Mídia`);
        console.log(`📹 Nó de Renderização: "${nodeLabel}"`);
        console.log(`🔑 Token de Callback: ${callbackToken}`);
        console.log(`🌐 URL de Webhook de Retorno Exposta: ${callbackUrl}`);
        console.log(`⚡ Liberando thread principal do backend imediatamente...`);
        console.log(`====================================================\n`);

        const callbackRecord: MediaCallbackItem = {
          token: callbackToken,
          flowchart_id: context.flowchartId,
          flowchart_name: 'Renderização de Vídeo Veo 3 / Pipeline Mobile',
          media_node_id: nodeId,
          status: 'PENDING',
          payload: currentPayload,
          created_at: new Date().toISOString(),
        };

        await supabaseAdmin.from('media_callbacks').insert({
          token: callbackToken,
          flowchart_id: context.flowchartId,
          media_node_id: nodeId,
          status: 'PENDING',
          payload: currentPayload,
        });

        fallbackMediaCallbacks.set(callbackToken, callbackRecord);

        logStep(context, nodeId, nodeLabel, nodeType, 'PAUSED_WAITING_MEDIA_CALLBACK', { callbackToken, callbackUrl });

        return {
          status: 'WAITING_MEDIA_CALLBACK',
          pausedAtNodeId: nodeId,
          callbackToken,
          callbackUrl,
          executionLog: context.executionLog,
        };
      } else if (nodeType === 'action') {
        const config = currentNode.data?.config || {};
        const apiUrl = config.apiEndpoint || 'https://httpbin.org/post';
        const method = config.method || 'POST';
        const vaultSecretId = config.vault_secret_id;

        // Descriptografia efêmera do token em memória apenas no exato milissegundo da chamada HTTP
        let ephemeralAuthToken = '';
        if (vaultSecretId) {
          ephemeralAuthToken = await decryptVaultSecret(vaultSecretId);
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (ephemeralAuthToken) {
          headers['Authorization'] = `Bearer ${ephemeralAuthToken}`;
        }

        console.log(`🌐 [ACTION NODE] Efetuando chamada HTTP ${method} para ${apiUrl}... (Auth Vault: ${vaultSecretId ? 'SIM (Encrypted)' : 'NÃO'})`);

        let responseData: any;
        let isError = false;
        let errorMessage = '';

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(apiUrl, {
            method,
            headers,
            body: method !== 'GET' ? JSON.stringify(currentPayload) : undefined,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            isError = true;
            errorMessage = `HTTP ${res.status} ${res.statusText}: Erro de validação de schema na API externa (${apiUrl})`;
          } else {
            responseData = await res.json().catch(() => ({ status: res.status }));
          }
        } catch (e: any) {
          isError = true;
          errorMessage = e.name === 'AbortError'
            ? `HTTP Timeout (10000ms Excedido) na requisição para ${apiUrl}`
            : `Erro de Conexão na API: ${e.message}`;
        } finally {
          // Descarte imediato do token descriptografado da memória!
          ephemeralAuthToken = '';
        }

        if (isError) {
          console.warn(`⚠️ [ACTION NODE FAILED] Nó "${nodeLabel}" retornou erro: ${errorMessage}`);
          console.log(`🩹 [AI AUTO-HEALING] Interceptando falha e solicitando correção inteligente ao Gemini LLM...`);

          const healingResult = await attemptAutoHealing({
            flowchartId: context.flowchartId,
            nodeId,
            nodeLabel,
            apiUrl,
            method,
            failedPayload: currentPayload,
            errorMessage,
          });

          if (healingResult.healed && healingResult.healedPayload) {
            wasHealedByAI = true;
            console.log(`✨ [AI AUTO-HEALING SUCCESS] Nó "${nodeLabel}" foi curado com sucesso!`);
            console.log(`Payload corrigido aplicado:`, JSON.stringify(healingResult.healedPayload, null, 2));

            currentPayload = healingResult.healedPayload;
            responseData = healingResult.responseData || { status: 'HEALED_SUCCESS', payload: currentPayload };

            logStep(context, nodeId, nodeLabel, nodeType, 'HEALED_BY_AI', {
              explanation: healingResult.explanation,
              healedPayload: healingResult.healedPayload,
              responseData,
            });

            context.nodeResults[nodeId] = { status: 'HEALED_BY_AI', output: responseData };
            isError = false;
          } else {
            console.error(`❌ [AI AUTO-HEALING FAILED] Tentativa de autocura não obteve sucesso. Gravando log de falha...`);
            logStep(context, nodeId, nodeLabel, nodeType, 'FAILED', { error: errorMessage });

            await supabaseAdmin
              .from('execution_logs')
              .update({
                status: 'FAILED',
                failed_node_id: nodeId,
                error_message: errorMessage,
                execution_trace: context.executionLog,
                completed_at: new Date().toISOString(),
              })
              .eq('id', context.executionLogId);

            const auditRecord = fallbackAuditLogs.get(context.executionLogId);
            if (auditRecord) {
              auditRecord.status = 'FAILED';
              auditRecord.failed_node_id = nodeId;
              auditRecord.error_message = errorMessage;
              auditRecord.execution_trace = context.executionLog;
              auditRecord.completed_at = new Date().toISOString();
              fallbackAuditLogs.set(context.executionLogId, auditRecord);
            }

            return {
              status: 'FAILED',
              failedNodeId: nodeId,
              error: errorMessage,
              executionLog: context.executionLog,
            };
          }
        }

        if (!isError) {
          currentPayload = responseData;
          context.nodeResults[nodeId] = { status: wasHealedByAI ? 'HEALED_BY_AI' : 'SUCCESS', output: responseData };
          if (!wasHealedByAI) {
            logStep(context, nodeId, nodeLabel, nodeType, 'SUCCESS', responseData);
          }
        }
      } else if (nodeType === 'decision') {
        const config = currentNode.data?.config || {};
        const field = config.field || 'body.user.role';
        const operator = config.operator || 'equals';
        const expectedValue = config.value || 'Master';

        const evaluatedValue = getNestedValue(currentPayload, field) || 'Master';
        let decisionResult = false;

        if (operator === 'equals') {
          decisionResult = String(evaluatedValue).toLowerCase() === String(expectedValue).toLowerCase();
        } else if (operator === 'greater_than') {
          decisionResult = Number(evaluatedValue) > Number(expectedValue);
        } else if (operator === 'contains') {
          decisionResult = String(evaluatedValue).includes(String(expectedValue));
        }

        console.log(`🤔 [DECISION NODE] Avaliando "${field}" (${evaluatedValue}) ${operator} "${expectedValue}" -> Resultado: ${decisionResult}`);

        context.nodeResults[nodeId] = { status: 'SUCCESS', decisionResult, output: { evaluatedValue, expectedValue, decisionResult } };
        logStep(context, nodeId, nodeLabel, nodeType, 'SUCCESS', { decisionResult });

        const targetHandle = decisionResult ? 'true' : 'false';
        const outgoingEdge = edges.find((e: any) => e.source === nodeId && (e.sourceHandle === targetHandle || e.label?.toLowerCase().includes(decisionResult ? 'sim' : 'não')));

        if (outgoingEdge) {
          currentNode = nodes.find((n: any) => n.id === outgoingEdge.target);
          continue;
        }
      } else if (nodeType === 'approval') {
        const assigneeEmail = currentNode.data?.config?.assignee || 'alan.pereira@alp-nexus.com';
        const approvalToken = `approval_tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const appBase = process.env.PUBLIC_APP_URL || 'https://synapse.alp-nexus.com';
        const approvalUrl = `${appBase}/decide/${approvalToken}`;

        console.log(`\n====================================================`);
        console.log(`📱 [ZERO-FRICTION HITL APPROVAL] Fluxo Pausado no Nó: "${nodeLabel}"`);
        console.log(`👤 Aprovador Designado: ${assigneeEmail}`);
        console.log(`🔑 Token Único: ${approvalToken}`);
        console.log(`🔗 Link Público Zero Fricção (Mobile-First): ${approvalUrl}`);
        console.log(`====================================================\n`);

        const approvalData: ApprovalTokenItem = {
          token: approvalToken,
          flowchart_id: context.flowchartId,
          flowchart_name: 'Fluxograma B2B',
          approval_node_id: nodeId,
          assignee_email: assigneeEmail,
          status: 'PENDING' as const,
          payload: currentPayload,
          created_at: new Date().toISOString(),
        };

        await supabaseAdmin.from('approval_tokens').insert({
          token: approvalToken,
          flowchart_id: context.flowchartId,
          approval_node_id: nodeId,
          assignee_email: assigneeEmail,
          status: 'PENDING',
          payload: currentPayload,
        });

        fallbackApprovalTokens.set(approvalToken, approvalData);

        logStep(context, nodeId, nodeLabel, nodeType, 'PAUSED_WAITING_APPROVAL', { approvalToken, approvalUrl });

        return {
          status: 'WAITING_APPROVAL',
          pausedAtNodeId: nodeId,
          approvalToken,
          approvalUrl,
          executionLog: context.executionLog,
        };
      } else if (nodeType === 'output') {
        const finalStatus = wasHealedByAI ? 'HEALED_BY_AI' : 'COMPLETED';
        context.nodeResults[nodeId] = { status: 'SUCCESS', output: currentPayload };
        logStep(context, nodeId, nodeLabel, nodeType, 'SUCCESS', currentPayload);

        console.log(`\n🏁 [EXECUTION FINISHED] Fluxograma finalizado no nó de Saída com status: ${finalStatus}`);

        await supabaseAdmin
          .from('execution_logs')
          .update({
            status: finalStatus,
            execution_trace: context.executionLog,
            completed_at: new Date().toISOString(),
          })
          .eq('id', context.executionLogId);

        const auditRecord = fallbackAuditLogs.get(context.executionLogId);
        if (auditRecord) {
          auditRecord.status = finalStatus as any;
          auditRecord.execution_trace = context.executionLog;
          auditRecord.completed_at = new Date().toISOString();
          fallbackAuditLogs.set(context.executionLogId, auditRecord);
        }

        return {
          status: finalStatus,
          finalOutput: currentPayload,
          executionLog: context.executionLog,
        };
      }
    } catch (err: any) {
      console.error(`❌ [NODE EXECUTION ERROR] Falha inesperada no nó "${nodeLabel}":`, err.message);
      logStep(context, nodeId, nodeLabel, nodeType, 'ERROR', { error: err.message });
      return { status: 'FAILED', failedNodeId: nodeId, error: err.message, executionLog: context.executionLog };
    }

    const outgoingEdge = edges.find((e: any) => e.source === nodeId);
    if (outgoingEdge) {
      currentNode = nodes.find((n: any) => n.id === outgoingEdge.target);
    } else {
      currentNode = null;
    }
  }

  return {
    status: wasHealedByAI ? 'HEALED_BY_AI' : 'COMPLETED',
    executionLog: context.executionLog,
  };
}

/**
 * Retoma a execução a partir do Webhook de Callback de Mídia
 */
export async function resumeFlowchartExecutionFromMediaCallback(
  flowchartId: string,
  mediaNodeId: string,
  resumedPayload: any
): Promise<ExecutionResult> {
  console.log(`\n▶️  [RESUME MEDIA ENGINE] Retomando fluxograma ID: ${flowchartId} a partir do Nó de Mídia: ${mediaNodeId}`);

  let flowchart: any;
  const { data: dbFlowchart } = await supabaseAdmin
    .from('flowcharts')
    .select('*')
    .eq('id', flowchartId)
    .single();

  if (dbFlowchart) {
    flowchart = dbFlowchart;
  } else {
    flowchart = getFallbackFlowchart(flowchartId);
  }

  const nodes = flowchart.nodes;
  const edges = flowchart.edges || [];

  const context: ExecutionContext = {
    executionLogId: `resume-media-log-${Date.now()}`,
    flowchartId,
    triggerPayload: resumedPayload,
    nodeResults: { [mediaNodeId]: { status: 'SUCCESS', output: resumedPayload } },
    visitedNodes: new Set<string>([mediaNodeId]),
    executionLog: [],
  };

  const nextEdge = edges.find((e: any) => e.source === mediaNodeId);
  if (!nextEdge) {
    return { status: 'COMPLETED', finalOutput: resumedPayload, executionLog: [] };
  }

  const nextNode = nodes.find((n: any) => n.id === nextEdge.target);
  return await traverseFromNode(nextNode, nodes, edges, context, resumedPayload);
}

/**
 * Retoma a execução a partir do nó que falhou (Reprocessamento / Retry)
 */
export async function resumeFlowchartExecutionFromFailedNode(
  flowchartId: string,
  failedNodeId: string,
  payload: any
): Promise<ExecutionResult> {
  console.log(`\n🔄 [RETRY ENGINE] Retomando travessia do fluxograma ID: ${flowchartId} a partir do Nó com falha: ${failedNodeId}`);

  let flowchart: any;
  const { data: dbFlowchart } = await supabaseAdmin
    .from('flowcharts')
    .select('*')
    .eq('id', flowchartId)
    .single();

  if (dbFlowchart) {
    flowchart = dbFlowchart;
  } else {
    flowchart = getFallbackFlowchart(flowchartId);
  }

  const nodes = flowchart.nodes;
  const edges = flowchart.edges || [];

  const targetNode = nodes.find((n: any) => n.id === failedNodeId) || nodes[0];

  const executionLogId = `retry-log-${Date.now()}`;
  const context: ExecutionContext = {
    executionLogId,
    flowchartId,
    triggerPayload: payload,
    nodeResults: {},
    visitedNodes: new Set<string>([failedNodeId]),
    executionLog: [],
  };

  return await traverseFromNode(targetNode, nodes, edges, context, payload);
}

/**
 * Retoma a execução a partir de uma decisão de aprovação
 */
export async function resumeFlowchartExecution(
  flowchartId: string,
  approvalNodeId: string,
  decision: 'APPROVED' | 'REJECTED',
  payload: any
): Promise<ExecutionResult> {
  console.log(`\n▶️  [RESUME ENGINE] Retomando fluxograma ID: ${flowchartId} a partir do Nó de Aprovação: ${approvalNodeId}`);

  let flowchart: any;
  const { data: dbFlowchart } = await supabaseAdmin
    .from('flowcharts')
    .select('*')
    .eq('id', flowchartId)
    .single();

  if (dbFlowchart) {
    flowchart = dbFlowchart;
  } else {
    flowchart = getFallbackFlowchart(flowchartId);
  }

  const nodes = flowchart.nodes;
  const edges = flowchart.edges || [];

  const context: ExecutionContext = {
    executionLogId: `resume-log-${Date.now()}`,
    flowchartId,
    triggerPayload: payload,
    nodeResults: {},
    visitedNodes: new Set<string>([approvalNodeId]),
    executionLog: [],
  };

  const isApproved = decision === 'APPROVED';
  const targetHandle = isApproved ? 'true' : 'false';

  let nextEdge = edges.find(
    (e: any) =>
      e.source === approvalNodeId &&
      (e.sourceHandle === targetHandle ||
        e.label?.toLowerCase().includes(isApproved ? 'sim' : 'não') ||
        e.label?.toLowerCase().includes(isApproved ? 'aprov' : 'rejeit'))
  );

  if (!nextEdge) {
    nextEdge = edges.find((e: any) => e.source === approvalNodeId);
  }

  if (!nextEdge) {
    return { status: 'COMPLETED', finalOutput: { decision }, executionLog: [] };
  }

  const nextNode = nodes.find((n: any) => n.id === nextEdge.target);
  return await traverseFromNode(nextNode, nodes, edges, context, payload);
}

function getNestedValue(obj: any, path: string): any {
  if (!obj) return null;
  const keys = path.replace(/^body\./, '').split('.');
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return null;
    }
  }
  return current;
}

function logStep(context: ExecutionContext, nodeId: string, nodeLabel: string, type: string, status: string, output?: any) {
  context.executionLog.push({
    timestamp: new Date().toISOString(),
    nodeId,
    nodeLabel,
    type,
    status,
    output,
  });
}

function getFallbackFlowchart(id: string) {
  return {
    id,
    name: 'Fluxograma Exemplo',
    nodes: [
      { id: 'node-trigger-1', type: 'trigger', data: { label: 'Gatilho Lead' } },
      { id: 'node-action-1', type: 'action', data: { label: 'Sincronizar CRM External API', config: { apiEndpoint: 'https://httpbin.org/status/500' } } },
      { id: 'node-decision-1', type: 'decision', data: { label: 'Validação' } },
      { id: 'node-output-1', type: 'output', data: { label: 'Resposta Final' } },
    ],
    edges: [
      { id: 'e1', source: 'node-trigger-1', target: 'node-action-1' },
      { id: 'e2', source: 'node-action-1', target: 'node-decision-1' },
      { id: 'e3', source: 'node-decision-1', target: 'node-output-1' },
    ],
  };
}
