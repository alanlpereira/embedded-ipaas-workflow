import { Router } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { recordFlowchartVersion } from './versions.js';

const router = Router();

// GET /api/flowcharts - Listar fluxos da organização do usuário
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.profile!.organization_id;

    const { data, error } = await supabaseAdmin
      .from('flowcharts')
      .select('*')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ flowcharts: data });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar flowcharts', details: err.message });
  }
});

// GET /api/flowcharts/:id - Obter detalhes de um flowchart por ID
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.profile!.organization_id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('flowcharts')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Flowchart não encontrado' });
    }

    return res.json({ flowchart: data });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar flowchart', details: err.message });
  }
});

// POST /api/flowcharts - Criar novo flowchart (Master e Admin)
router.post('/', requireAuth, requireRole(['Master', 'Admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.profile!.organization_id;
    const userEmail = req.profile!.email || 'alan.pereira@alp-nexus.com';
    const { name, description, nodes, edges, is_published, folder_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'O nome do fluxo é obrigatório.' });
    }

    const { data, error } = await supabaseAdmin
      .from('flowcharts')
      .insert({
        organization_id: orgId,
        folder_id: folder_id || null,
        name,
        description: description || '',
        nodes: nodes || [],
        edges: edges || [],
        is_published: is_published || false,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Gravar versão inicial v1
    await recordFlowchartVersion(data.id, data.nodes, data.edges, userEmail);

    return res.status(201).json({ flowchart: data });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao criar flowchart', details: err.message });
  }
});

// PUT /api/flowcharts/:id - Atualizar JSON do fluxo e gravar versão
router.put('/:id', requireAuth, requireRole(['Master', 'Admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.profile!.organization_id;
    const userEmail = req.profile!.email || 'alan.pereira@alp-nexus.com';
    const { id } = req.params;
    const { name, description, nodes, edges, viewport, is_published, folder_id } = req.body;

    const updatePayload: Record<string, any> = {};
    if (name !== undefined) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;
    if (nodes !== undefined) updatePayload.nodes = nodes;
    if (edges !== undefined) updatePayload.edges = edges;
    if (viewport !== undefined) updatePayload.viewport = viewport;
    if (is_published !== undefined) updatePayload.is_published = is_published;
    if (folder_id !== undefined) updatePayload.folder_id = folder_id;

    const { data, error } = await supabaseAdmin
      .from('flowcharts')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Gravar nova versão no histórico
    const newVersion = await recordFlowchartVersion(id, data.nodes, data.edges, userEmail);

    return res.json({ flowchart: data, version: newVersion });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar flowchart', details: err.message });
  }
});

// PUT /api/flowcharts/:id/move - Mover fluxo para outra pasta/área
router.put('/:id/move', requireAuth, requireRole(['Master', 'Admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.profile!.organization_id;
    const { id } = req.params;
    const { folder_id } = req.body;

    const { data, error } = await supabaseAdmin
      .from('flowcharts')
      .update({ folder_id: folder_id || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ flowchart: data });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao mover fluxo', details: err.message });
  }
});

export const flowchartRouter = router;
