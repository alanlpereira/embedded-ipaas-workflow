import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { resumeFlowchartExecutionFromMediaCallback } from '../engine/executor.js';

export const mediaCallbackRouter = Router();

export interface MediaCallbackItem {
  token: string;
  flowchart_id: string;
  flowchart_name?: string;
  media_node_id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  payload: any;
  video_url?: string;
  render_time_sec?: number;
  created_at: string;
  completed_at?: string;
}

export const fallbackMediaCallbacks = new Map<string, MediaCallbackItem>();

/**
 * GET /api/v1/media/callback/:token
 * Retorna os detalhes do trabalho de renderização de mídia por token
 */
mediaCallbackRouter.get('/callback/:token', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;

  const { data: dbData } = await supabaseAdmin
    .from('media_callbacks')
    .select('*')
    .eq('token', token)
    .single();

  const item = dbData || fallbackMediaCallbacks.get(token);

  if (!item) {
    res.status(404).json({ error: 'Token de callback de mídia inválido ou expirado.' });
    return;
  }

  res.json({ callback: item });
});

/**
 * POST /api/v1/media/callback/:token
 * Endpoint de Webhook chamado pela plataforma de mídia/vídeo externa (ex: Veo 3 / Mobile Render Pipeline)
 * quando a renderização é finalizada.
 */
mediaCallbackRouter.post('/callback/:token', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  const { video_url, render_time_sec, status = 'COMPLETED', error } = req.body;

  console.log(`\n====================================================`);
  console.log(`🎬 [MEDIA CALLBACK WEBHOOK RECEBIDO] Token: ${token}`);
  console.log(`Status do Render: ${status}`);
  console.log(`URL do Vídeo Gerado: ${video_url || 'N/A'}`);
  console.log(`Tempo de Renderização: ${render_time_sec || 0}s`);
  console.log(`====================================================\n`);

  const { data: dbData } = await supabaseAdmin
    .from('media_callbacks')
    .select('*')
    .eq('token', token)
    .single();

  const item = dbData || fallbackMediaCallbacks.get(token);

  if (!item) {
    res.status(404).json({ error: 'Token de callback de mídia inválido ou não encontrado.' });
    return;
  }

  if (item.status !== 'PENDING') {
    res.status(400).json({ error: `Trabalho de mídia já processado anteriormente com status: ${item.status}` });
    return;
  }

  const isCompleted = status === 'COMPLETED' && !!video_url;
  const newStatus = isCompleted ? 'COMPLETED' : 'FAILED';
  const completedAt = new Date().toISOString();

  await supabaseAdmin
    .from('media_callbacks')
    .update({
      status: newStatus,
      video_url: video_url || null,
      render_time_sec: render_time_sec || 0,
      completed_at: completedAt,
    })
    .eq('token', token);

  const updatedItem: MediaCallbackItem = {
    ...item,
    status: newStatus,
    video_url: video_url || undefined,
    render_time_sec: render_time_sec || 0,
    completed_at: completedAt,
  };
  fallbackMediaCallbacks.set(token, updatedItem);

  if (!isCompleted) {
    res.status(400).json({
      message: 'Renderização de mídia falhou no provedor externo',
      error: error || 'Sem vídeo gerado',
    });
    return;
  }

  // Payload enriquecido com os dados do vídeo retornado para os nós subsequentes
  const resumedPayload = {
    ...item.payload,
    media: {
      video_url,
      render_time_sec: render_time_sec || 14.2,
      rendered_at: completedAt,
      engine: 'Google Veo 3 / Mobile Pipeline',
    },
  };

  // Retomar a travessia assíncrona do grafo a partir do nó de mídia
  const executionResult = await resumeFlowchartExecutionFromMediaCallback(
    item.flowchart_id,
    item.media_node_id,
    resumedPayload
  );

  res.json({
    message: 'Webhook de mídia processado com sucesso. Execução do fluxo retomada!',
    callback: updatedItem,
    executionResult,
  });
});
