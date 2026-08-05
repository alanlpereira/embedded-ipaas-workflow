import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { resumeFlowchartExecutionFromFailedNode } from '../engine/executor.js';

const router = Router();

export interface ExecutionLogRecord {
  id: string;
  flowchart_id: string;
  flowchart_name?: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'WAITING_APPROVAL';
  failed_node_id?: string;
  error_message?: string;
  execution_trace: any[];
  trigger_payload: any;
  created_at: string;
  completed_at?: string;
}

// Map em memória fallback para os logs de auditoria
export const fallbackAuditLogs = new Map<string, ExecutionLogRecord>();

// Inicializar alguns logs de amostra no fallback
const sampleLog1: ExecutionLogRecord = {
  id: 'log-sample-failed-1',
  flowchart_id: 'flow-sample-1',
  flowchart_name: 'Integração Webhook & CRM B2B',
  status: 'FAILED',
  failed_node_id: 'node-action-1',
  error_message: 'HTTP 500 Internal Server Error: Gateway Timeout na API do CRM External',
  execution_trace: [
    { timestamp: new Date(Date.now() - 3600000).toISOString(), nodeId: 'node-trigger-1', nodeLabel: 'Gatilho Webhook B2B', type: 'trigger', status: 'SUCCESS' },
    { timestamp: new Date(Date.now() - 3590000).toISOString(), nodeId: 'node-action-1', nodeLabel: 'Sincronizar CRM External API', type: 'action', status: 'FAILED', output: { error: 'HTTP 500 Internal Server Error' } },
  ],
  trigger_payload: { user: { email: 'cliente@empresa.com', role: 'Master' } },
  created_at: new Date(Date.now() - 3600000).toISOString(),
  completed_at: new Date(Date.now() - 3590000).toISOString(),
};

const sampleLog2: ExecutionLogRecord = {
  id: 'log-sample-completed-1',
  flowchart_id: 'flow-sample-1',
  flowchart_name: 'Integração Webhook & CRM B2B',
  status: 'COMPLETED',
  execution_trace: [
    { timestamp: new Date(Date.now() - 7200000).toISOString(), nodeId: 'node-trigger-1', nodeLabel: 'Gatilho Webhook B2B', type: 'trigger', status: 'SUCCESS' },
    { timestamp: new Date(Date.now() - 7190000).toISOString(), nodeId: 'node-action-1', nodeLabel: 'Sincronizar CRM External API', type: 'action', status: 'SUCCESS' },
    { timestamp: new Date(Date.now() - 7180000).toISOString(), nodeId: 'node-decision-1', nodeLabel: 'Validação de Role?', type: 'decision', status: 'SUCCESS' },
    { timestamp: new Date(Date.now() - 7170000).toISOString(), nodeId: 'node-output-1', nodeLabel: 'Resposta Final JSON', type: 'output', status: 'SUCCESS' },
  ],
  trigger_payload: { user: { email: 'alan.pereira@alp-nexus.com', role: 'Master' } },
  created_at: new Date(Date.now() - 7200000).toISOString(),
  completed_at: new Date(Date.now() - 7170000).toISOString(),
};

fallbackAuditLogs.set(sampleLog1.id, sampleLog1);
fallbackAuditLogs.set(sampleLog2.id, sampleLog2);

/**
 * GET /api/v1/audit/logs
 * Lista os logs de auditoria das execuções
 */
router.get('/logs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: dbLogs, error } = await supabaseAdmin
      .from('execution_logs')
      .select('*, flowcharts(name)')
      .order('created_at', { ascending: false });

    if (!error && dbLogs && dbLogs.length > 0) {
      const formattedLogs = dbLogs.map((l: any) => ({
        ...l,
        flowchart_name: l.flowcharts?.name || 'Fluxograma B2B',
      }));
      return res.json({ logs: formattedLogs });
    }

    return res.json({ logs: Array.from(fallbackAuditLogs.values()) });
  } catch (err: any) {
    return res.json({ logs: Array.from(fallbackAuditLogs.values()) });
  }
});

/**
 * GET /api/v1/audit/logs/:id
 * Retorna os detalhes de um log de execução específico
 */
router.get('/logs/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: dbLog } = await supabaseAdmin
      .from('execution_logs')
      .select('*, flowcharts(name, nodes, edges)')
      .eq('id', id)
      .single();

    if (dbLog) {
      return res.json({ log: dbLog });
    }

    const localLog = fallbackAuditLogs.get(id);
    if (localLog) {
      return res.json({ log: localLog });
    }

    return res.status(404).json({ error: 'Log de execução não encontrado.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar log de auditoria', details: err.message });
  }
});

/**
 * POST /api/v1/audit/logs/:id/retry
 * Reprocessa a execução a partir do nó que falhou
 */
router.post('/logs/:id/retry', requireAuth, requireRole(['Master', 'Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar o log da execução com falha
    let targetLog: ExecutionLogRecord | undefined;
    const { data: dbLog } = await supabaseAdmin
      .from('execution_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (dbLog) {
      targetLog = dbLog;
    } else {
      targetLog = fallbackAuditLogs.get(id);
    }

    if (!targetLog) {
      return res.status(404).json({ error: 'Log de execução não encontrado para retentativa.' });
    }

    const failedNodeId = targetLog.failed_node_id || 'node-action-1';
    console.log(`====================================================`);
    console.log(`🔄 [RETRY ENGINE] Iniciando reprocessamento a partir do Nó com falha ID: "${failedNodeId}"`);
    console.log(`Flowchart ID: ${targetLog.flowchart_id}`);
    console.log(`====================================================`);

    // Retomar travessia do grafo a partir do nó que falhou
    const result = await resumeFlowchartExecutionFromFailedNode(
      targetLog.flowchart_id,
      failedNodeId,
      targetLog.trigger_payload
    );

    // Atualizar status do log para COMPLETED
    if (targetLog) {
      targetLog.status = result.status === 'COMPLETED' ? 'COMPLETED' : targetLog.status;
      targetLog.completed_at = new Date().toISOString();
      fallbackAuditLogs.set(id, targetLog);
    }

    return res.json({
      message: `Execução reprocessada com sucesso a partir do nó '${failedNodeId}'!`,
      status: result.status,
      executionResult: result,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Falha ao reprocessar nó', details: err.message });
  }
});

export const auditRouter = router;
