import { Router, Request, Response } from 'express';
import { workflowQueue } from '../engine/queue.js';

const router = Router();

/**
 * POST /api/v1/webhooks/incoming/:flowchartId
 * Endpoint público de Webhook para disparar o nós de "Gatilho/Input"
 */
router.post('/incoming/:flowchartId', async (req: Request, res: Response) => {
  try {
    const { flowchartId } = req.params;
    const payload = req.body || {};

    if (!flowchartId) {
      return res.status(400).json({ error: 'O parâmetro flowchartId é obrigatório.' });
    }

    console.log(`\n🔔 [WEBHOOK RECEIVEO] Requisição HTTP POST recebida para o Flowchart ID "${flowchartId}"`);

    // Enfileirar execução assíncrona
    const job = await workflowQueue.addJob(flowchartId, payload);

    return res.status(202).json({
      message: 'Webhook recebido com sucesso. Execução do fluxo iniciada em segundo plano.',
      executionId: job.executionId,
      flowchartId: job.flowchartId,
      status: 'ACCEPTED',
      timestamp: job.timestamp,
    });
  } catch (err: any) {
    console.error('❌ Erro no endpoint de Webhook:', err.message);
    return res.status(500).json({ error: 'Erro interno ao processar o webhook.', details: err.message });
  }
});

/**
 * GET /api/v1/webhooks/executions/:executionId
 * Consulta o status e logs detalhados de uma execução
 */
router.get('/executions/:executionId', (req: Request, res: Response) => {
  const { executionId } = req.params;
  const result = workflowQueue.getExecutionResult(executionId);

  if (!result) {
    return res.status(404).json({
      status: 'PENDING_OR_NOT_FOUND',
      message: 'A execução ainda está em andamento na fila ou não foi encontrada.',
    });
  }

  return res.json({ execution: result });
});

export const webhookRouter = router;
