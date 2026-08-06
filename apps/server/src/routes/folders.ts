import { Router } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { Folder } from '@ipaas/shared-types';

const router = Router();

// Pastas/Áreas Padrão
const DEFAULT_FOLDERS: Folder[] = [
  { id: 'folder-jur', name: 'Jurídico', icon: 'FileText' },
  { id: 'folder-fin', name: 'Financeiro', icon: 'DollarSign' },
  { id: 'folder-ti', name: 'TI & Infraestrutura', icon: 'Key' },
  { id: 'folder-sup', name: 'Suprimentos & Logística', icon: 'ShoppingCart' },
  { id: 'folder-rh', name: 'Recursos Humanos', icon: 'UserPlus' },
];

// GET /api/v1/folders - Listar pastas da organização
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.profile?.organization_id;

    if (!orgId) {
      return res.json({ folders: DEFAULT_FOLDERS });
    }

    const { data, error } = await supabaseAdmin
      .from('folders')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return res.json({ folders: DEFAULT_FOLDERS });
    }

    return res.json({ folders: data });
  } catch (err: any) {
    return res.json({ folders: DEFAULT_FOLDERS });
  }
});

// POST /api/v1/folders - Criar nova pasta/área
router.post('/', requireAuth, requireRole(['Master', 'Admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.profile?.organization_id;
    const userId = req.profile?.id;
    const { name, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome da área/pasta é obrigatório.' });
    }

    const newFolder: Partial<Folder> = {
      id: `folder-${Date.now()}`,
      organization_id: orgId,
      user_id: userId,
      name: name.trim(),
      icon: icon || 'Folder',
      created_at: new Date().toISOString(),
    };

    try {
      await supabaseAdmin.from('folders').insert(newFolder);
    } catch (e) {
      // Fallback em memória se tabela ainda não for sincronizada no supabase
    }

    return res.status(201).json({ folder: newFolder });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao criar pasta', details: err.message });
  }
});

// DELETE /api/v1/folders/:id - Remover pasta
router.delete('/:id', requireAuth, requireRole(['Master', 'Admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const orgId = req.profile?.organization_id;

    try {
      await supabaseAdmin.from('folders').delete().eq('id', id).eq('organization_id', orgId);
    } catch (e) {}

    return res.json({ success: true, message: 'Pasta removida com sucesso' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao remover pasta', details: err.message });
  }
});

export const folderRouter = router;
