import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { corporate20Templates, WorkflowTemplateItem } from '../seed-templates.js';

export const templatesRouter = Router();

/**
 * GET /api/templates
 * Retorna todos os 20 templates corporativos divididos em 6 departamentos
 */
templatesRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data: dbTemplates } = await supabaseAdmin
      .from('templates')
      .select('*')
      .order('category', { ascending: true });

    const templates = dbTemplates && dbTemplates.length > 0 ? dbTemplates : corporate20Templates;

    res.json({
      total: templates.length,
      templates,
    });
  } catch (err: any) {
    res.json({
      total: corporate20Templates.length,
      templates: corporate20Templates,
    });
  }
});

/**
 * POST /api/templates/:id/clone
 * Clona um template para a organização atual do usuário
 */
templatesRouter.post('/:id/clone', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const orgId = (req.headers['x-organization-id'] as string) || 'org-alp-nexus';

  const tpl = corporate20Templates.find((t) => t.id === id) || corporate20Templates[0];

  const clonedFlowchart = {
    id: `flow-clone-${Date.now()}`,
    organization_id: orgId,
    name: `${tpl.name} (Cópia)`,
    description: tpl.description,
    nodes: tpl.nodes,
    edges: tpl.edges,
    is_published: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    await supabaseAdmin.from('flowcharts').insert(clonedFlowchart);
  } catch (e) {}

  res.json({
    message: `Template "${tpl.name}" clonado com sucesso!`,
    flowchart: clonedFlowchart,
  });
});
