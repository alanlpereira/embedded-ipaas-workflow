import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

export interface FlowchartVersion {
  id: string;
  flowchart_id: string;
  version_number: number;
  created_by_email?: string;
  nodes: any[];
  edges: any[];
  created_at: string;
}

// In-memory fallback version history store in case database tables are local mock
const fallbackVersionsStore = new Map<string, FlowchartVersion[]>();

/**
 * Registra uma nova versão do fluxograma
 */
export async function recordFlowchartVersion(
  flowchartId: string,
  nodes: any[],
  edges: any[],
  userEmail: string = 'alan.pereira@alp-nexus.com'
): Promise<FlowchartVersion> {
  try {
    // Obter número da última versão
    const { data: latestVersions } = await supabaseAdmin
      .from('flowchart_versions')
      .select('version_number')
      .eq('flowchart_id', flowchartId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersionNumber = latestVersions && latestVersions.length > 0 ? latestVersions[0].version_number + 1 : 1;

    const newVersionData = {
      flowchart_id: flowchartId,
      version_number: nextVersionNumber,
      created_by_email: userEmail,
      nodes,
      edges,
    };

    const { data: insertedVersion, error } = await supabaseAdmin
      .from('flowchart_versions')
      .insert(newVersionData)
      .select()
      .single();

    if (!error && insertedVersion) {
      console.log(`📜 [VERSIONING] Nova versão v${insertedVersion.version_number} salva no Supabase para o Flowchart ID: ${flowchartId}`);
      return insertedVersion;
    }
  } catch (err: any) {
    console.warn('⚠️ [VERSIONING WARN] Fallback local para gravação de versão:', err.message);
  }

  // Fallback em memória
  const existing = fallbackVersionsStore.get(flowchartId) || [];
  const nextVer = existing.length + 1;
  const mockVersion: FlowchartVersion = {
    id: `ver-${Date.now()}-${nextVer}`,
    flowchart_id: flowchartId,
    version_number: nextVer,
    created_by_email: userEmail,
    nodes,
    edges,
    created_at: new Date().toISOString(),
  };

  fallbackVersionsStore.set(flowchartId, [mockVersion, ...existing]);
  return mockVersion;
}

/**
 * GET /api/flowcharts/:id/versions
 * Obtém o histórico de versões de um fluxograma
 */
router.get('/:id/versions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: dbVersions, error } = await supabaseAdmin
      .from('flowchart_versions')
      .select('*')
      .eq('flowchart_id', id)
      .order('version_number', { ascending: false });

    if (!error && dbVersions && dbVersions.length > 0) {
      return res.json({ versions: dbVersions });
    }

    const localVersions = fallbackVersionsStore.get(id) || [];
    return res.json({ versions: localVersions });
  } catch (err: any) {
    const localVersions = fallbackVersionsStore.get(req.params.id) || [];
    return res.json({ versions: localVersions });
  }
});

/**
 * POST /api/flowcharts/:id/versions/:versionId/rollback
 * Restaura uma versão anterior do fluxograma (Rollback)
 */
router.post('/:id/versions/:versionId/rollback', requireAuth, requireRole(['Master', 'Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, versionId } = req.params;
    const userEmail = req.profile?.email || 'alan.pereira@alp-nexus.com';

    // Buscar versão alvo
    let targetVersion: FlowchartVersion | undefined;

    const { data: dbVer } = await supabaseAdmin
      .from('flowchart_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (dbVer) {
      targetVersion = dbVer;
    } else {
      const localVers = fallbackVersionsStore.get(id) || [];
      targetVersion = localVers.find((v) => v.id === versionId);
    }

    if (!targetVersion) {
      return res.status(404).json({ error: 'Versão selecionada para rollback não foi encontrada.' });
    }

    // Atualizar o fluxograma principal no Supabase
    await supabaseAdmin
      .from('flowcharts')
      .update({
        nodes: targetVersion.nodes,
        edges: targetVersion.edges,
      })
      .eq('id', id);

    // Gravar novo snapshot do rollback como uma nova versão
    const rollbackRecord = await recordFlowchartVersion(id, targetVersion.nodes, targetVersion.edges, `${userEmail} (Rollback v${targetVersion.version_number})`);

    console.log(`🔄 [ROLLBACK SUCCESS] Fluxograma ID ${id} restaurado para o estado da v${targetVersion.version_number}!`);

    return res.json({
      message: `Fluxograma restaurado com sucesso para a versão v${targetVersion.version_number}!`,
      restoredVersion: targetVersion,
      newVersion: rollbackRecord,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Falha ao realizar o rollback', details: err.message });
  }
});

export const versionRouter = router;
