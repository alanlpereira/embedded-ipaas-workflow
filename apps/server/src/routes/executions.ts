import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';

const router = Router();

export interface FlowExecutionRecord {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: 'running' | 'waiting_approval' | 'completed' | 'failed';
  current_node_id?: string;
  context_data: Record<string, any>;
  started_at: string;
  completed_at?: string;
}

export interface ExecutionLogItem {
  id: string;
  execution_id: string;
  node_id?: string;
  status: 'info' | 'success' | 'warning' | 'error';
  log_message: string;
  created_at: string;
}

// Memory fallback store
const fallbackExecutions: FlowExecutionRecord[] = [
  {
    id: 'exec-demo-101',
    workflow_id: 'flow-sample-1',
    workflow_name: 'Sincronização CRM & Lead Scoring',
    status: 'completed',
    current_node_id: 'node-end-1',
    context_data: { email: { from: 'vendas@empresa.com', subject: 'Proposta Comercial' } },
    started_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
  },
  {
    id: 'exec-demo-102',
    workflow_id: 'flow-sample-2',
    workflow_name: 'Aprovação de Reembolso Financeiro',
    status: 'waiting_approval',
    current_node_id: 'node-email_approval-1',
    context_data: { approval: { recipients: 'diretoria@empresa.com' }, email: { from: 'analista@empresa.com' } },
    started_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'exec-demo-103',
    workflow_id: 'flow-sample-3',
    workflow_name: 'Webhook Inbound WhatsApp Customer',
    status: 'failed',
    current_node_id: 'node-whatsapp-1',
    context_data: { whatsapp: { destinationNumber: '+5511999998888' }, error: 'Token API WhatsApp Expired' },
    started_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

const fallbackLogs: Record<string, ExecutionLogItem[]> = {
  'exec-demo-101': [
    { id: 'log-1', execution_id: 'exec-demo-101', node_id: 'node-trigger-1', status: 'info', log_message: 'Gatilho recebido com sucesso', created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
    { id: 'log-2', execution_id: 'exec-demo-101', node_id: 'node-action-1', status: 'success', log_message: 'Lead salvo no CRM Supabase', created_at: new Date(Date.now() - 1000 * 60 * 24.5).toISOString() },
    { id: 'log-3', execution_id: 'exec-demo-101', node_id: 'node-end-1', status: 'info', log_message: 'Fluxo concluído', created_at: new Date(Date.now() - 1000 * 60 * 24).toISOString() },
  ],
  'exec-demo-102': [
    { id: 'log-4', execution_id: 'exec-demo-102', node_id: 'node-trigger-2', status: 'info', log_message: 'Solicitação de reembolso recebida', created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    { id: 'log-5', execution_id: 'exec-demo-102', node_id: 'node-email_approval-1', status: 'warning', log_message: 'Aguardando aprovação via e-mail (HITL)', created_at: new Date(Date.now() - 1000 * 60 * 9.8).toISOString() },
  ],
  'exec-demo-103': [
    { id: 'log-6', execution_id: 'exec-demo-103', node_id: 'node-trigger-3', status: 'info', log_message: 'Webhook disparado', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: 'log-7', execution_id: 'exec-demo-103', node_id: 'node-whatsapp-1', status: 'error', log_message: 'Erro ao conectar à API do WhatsApp Cloud', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  ],
};

// GET /api/v1/executions - Listar Histórico de Execuções
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: executions, error } = await supabaseAdmin
      .from('flow_executions')
      .select('*, flowcharts(name)')
      .order('started_at', { ascending: false });

    if (error || !executions || executions.length === 0) {
      return res.json({ executions: fallbackExecutions });
    }

    const formatted = executions.map((item: any) => ({
      ...item,
      workflow_name: item.flowcharts?.name || item.workflow_name || 'Fluxo IPaaS',
    }));

    return res.json({ executions: formatted });
  } catch (err) {
    return res.json({ executions: fallbackExecutions });
  }
});

// GET /api/v1/executions/:id/logs - Obter Logs de uma Execução Específica
router.get('/:id/logs', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data: logs, error } = await supabaseAdmin
      .from('execution_logs')
      .select('*')
      .eq('execution_id', id)
      .order('created_at', { ascending: true });

    if (error || !logs || logs.length === 0) {
      return res.json({ logs: fallbackLogs[id] || [] });
    }

    return res.json({ logs });
  } catch (err) {
    return res.json({ logs: fallbackLogs[id] || [] });
  }
});

// POST /api/v1/executions/trigger-scheduler - Rota de Teste / Disparo Manual do Scheduler
router.post('/trigger-scheduler', async (req: Request, res: Response) => {
  const now = new Date();
  console.log(`⏰ [SERVER SCHEDULER TICKER] Executando verificação de agendamentos às ${now.toISOString()}`);

  try {
    const { data: workflows } = await supabaseAdmin
      .from('flowcharts')
      .select('id, name, nodes, is_published, is_active');

    const list = workflows || [];
    let evaluatedCount = 0;
    let triggeredCount = 0;
    const triggered: any[] = [];

    for (const flow of list) {
      evaluatedCount++;
      if (flow.is_active === false || flow.is_published === false) continue;

      const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
      const scheduleNodes = nodes.filter((n: any) => n.type === 'schedule');

      for (const node of scheduleNodes) {
        const cron = node.data?.cronExpression || node.data?.scheduleConfig?.cronExpression || '0 9 * * *';
        const newExec: FlowExecutionRecord = {
          id: `exec-sched-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          workflow_id: flow.id,
          workflow_name: flow.name,
          status: 'running',
          current_node_id: node.id,
          context_data: { trigger: 'schedule', cron_expression: cron, fired_at: now.toISOString() },
          started_at: now.toISOString(),
        };

        fallbackExecutions.unshift(newExec);
        triggeredCount++;
        triggered.push(newExec);

        try {
          await supabaseAdmin.from('flow_executions').insert([{
            id: newExec.id,
            workflow_id: newExec.workflow_id,
            status: 'running',
            current_node_id: node.id,
            context_data: newExec.context_data,
            started_at: now.toISOString(),
          }]);
        } catch (e) {}
      }
    }

    return res.json({
      success: true,
      evaluated_workflows: evaluatedCount,
      triggered_executions: triggeredCount,
      triggered,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/executions - Registrar Nova Execução
router.post('/', async (req: Request, res: Response) => {
  const { workflow_id, workflow_name, status, current_node_id, context_data } = req.body;

  const newExecution: FlowExecutionRecord = {
    id: `exec-${Date.now()}`,
    workflow_id: workflow_id || 'flow-sample-1',
    workflow_name: workflow_name || 'Fluxo IPaaS',
    status: status || 'running',
    current_node_id: current_node_id || 'node-start',
    context_data: context_data || {},
    started_at: new Date().toISOString(),
  };

  fallbackExecutions.unshift(newExecution);

  try {
    await supabaseAdmin.from('flow_executions').insert([{
      id: newExecution.id,
      workflow_id: newExecution.workflow_id,
      status: newExecution.status,
      current_node_id: newExecution.current_node_id,
      context_data: newExecution.context_data,
      started_at: newExecution.started_at,
    }]);
  } catch (err) {}

  return res.status(201).json({ execution: newExecution });
});

export default router;
