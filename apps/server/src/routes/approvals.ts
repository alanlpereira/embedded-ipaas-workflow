import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { resumeFlowchartExecution } from '../engine/executor.js';

export const approvalRouter = Router();

export interface ApprovalTokenItem {
  token: string;
  flowchart_id: string;
  flowchart_name?: string;
  approval_node_id: string;
  assignee_email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  payload: any;
  created_at: string;
  decided_at?: string;
  decided_by?: string;
}

export const fallbackApprovalTokens = new Map<string, ApprovalTokenItem>();

/**
 * Rótulos legíveis amigáveis para chaves JSON do payload
 */
const friendlyKeyLabels: Record<string, string> = {
  company_name: 'Empresa Solicitante',
  amount_usd: 'Valor Solicitado (USD)',
  user_email: 'E-mail do Requisitante',
  user_name: 'Nome do Requisitante',
  role: 'Perfil de Acesso (Role)',
  department: 'Departamento',
  status: 'Status Inicial',
  timestamp: 'Data e Hora da Solicitação',
  event: 'Evento de Origem',
  endpoint: 'Endpoint Disparado',
};

/**
 * GET /api/approvals/decide/:token
 * Endpoint público acessado pela página Mobile-First /decide/:token
 */
approvalRouter.get('/decide/:token', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;

  const { data: dbData } = await supabaseAdmin
    .from('approval_tokens')
    .select('*')
    .eq('token', token)
    .single();

  const item = dbData || fallbackApprovalTokens.get(token);

  if (!item) {
    res.status(404).json({ error: 'Token de aprovação inválido, expirado ou não encontrado.' });
    return;
  }

  // Transformar chaves do payload em rótulos legíveis amigáveis
  const formattedFields: Array<{ key: string; label: string; value: any }> = [];
  const rawPayload = item.payload || {};

  for (const [key, value] of Object.entries(rawPayload)) {
    if (typeof value !== 'object' || value === null) {
      formattedFields.push({
        key,
        label: friendlyKeyLabels[key] || key.replace(/_/g, ' ').toUpperCase(),
        value,
      });
    }
  }

  res.json({
    token: item.token,
    flowchart_id: item.flowchart_id,
    flowchart_name: item.flowchart_name || 'Integração B2B',
    assignee_email: item.assignee_email,
    status: item.status,
    created_at: item.created_at,
    decided_at: item.decided_at,
    formattedFields,
    rawPayload,
  });
});

/**
 * POST /api/approvals/decide/:token
 * Endpoint público que recebe a decisão do gestor (APPROVED ou REJECTED),
 * invalida o token para evitar cliques duplos, grava log de auditoria e destrava a execução do fluxo.
 */
approvalRouter.post('/decide/:token', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  const { decision, decided_by = 'Gestor Mobile (Zero Fricção)' } = req.body;

  if (decision !== 'APPROVED' && decision !== 'REJECTED') {
    res.status(400).json({ error: 'Decisão inválida. Use "APPROVED" ou "REJECTED".' });
    return;
  }

  console.log(`\n====================================================`);
  console.log(`📱 [HITL MOBILE DECISION RECEBIDA] Token: ${token}`);
  console.log(`Decisão: ${decision}`);
  console.log(`Decidido por: ${decided_by}`);
  console.log(`====================================================\n`);

  const { data: dbData } = await supabaseAdmin
    .from('approval_tokens')
    .select('*')
    .eq('token', token)
    .single();

  const item = dbData || fallbackApprovalTokens.get(token);

  if (!item) {
    res.status(404).json({ error: 'Token de aprovação inválido ou não encontrado.' });
    return;
  }

  // Prevenção estrita contra cliques duplos / reúso de token
  if (item.status !== 'PENDING') {
    res.status(400).json({
      error: 'TOKEN_ALREADY_USED',
      message: `Este token de aprovação já foi utilizado anteriormente com o status: ${item.status}`,
      decided_at: item.decided_at,
    });
    return;
  }

  const decidedAt = new Date().toISOString();

  // Invalidação imediata do token no Supabase
  await supabaseAdmin
    .from('approval_tokens')
    .update({
      status: decision,
      decided_at: decidedAt,
      decided_by,
    })
    .eq('token', token);

  const updatedItem: ApprovalTokenItem = {
    ...item,
    status: decision,
    decided_at: decidedAt,
    decided_by,
  };

  fallbackApprovalTokens.set(token, updatedItem);

  // Registrar atividade de auditoria da decisão no banco de dados
  try {
    await supabaseAdmin.from('organization_activities').insert({
      organization_id: 'org-alp-nexus',
      user_name: decided_by,
      user_email: item.assignee_email,
      action_type: decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      target_resource: `Aprovação HITL (${item.flowchart_id})`,
      details: {
        token,
        decision,
        decided_at: decidedAt,
      },
    });
  } catch (e) {}

  // Destravar a execução do fluxograma e retomar o próximo nó correspondente
  const executionResult = await resumeFlowchartExecution(
    item.flowchart_id,
    item.approval_node_id,
    decision,
    item.payload
  );

  res.json({
    message: `Decisão "${decision}" registrada com sucesso. O fluxograma continuou sua execução!`,
    token: updatedItem,
    executionResult,
  });
});
