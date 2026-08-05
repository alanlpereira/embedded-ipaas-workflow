import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

export interface AgencyOrganization {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  logo_url?: string;
  custom_domain?: string;
  created_at: string;
}

// Fallback in-memory organizations list in case remote database is mock
export const fallbackOrganizations = new Map<string, AgencyOrganization>([
  [
    'org-alp-nexus',
    {
      id: 'org-alp-nexus',
      name: 'NexusFlow HQ (Organização Master)',
      slug: 'alp-nexus',
      primary_color: '#00f2fe',
      custom_domain: 'flow.alp-nexus.com',
      created_at: new Date('2026-08-01').toISOString(),
    },
  ],
  [
    'org-client-acme',
    {
      id: 'org-client-acme',
      name: 'Acme Corporation B2B',
      slug: 'acme-corp',
      primary_color: '#10b981',
      logo_url: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/box.svg',
      custom_domain: 'workflow.acme.com',
      created_at: new Date('2026-08-03').toISOString(),
    },
  ],
  [
    'org-client-stark',
    {
      id: 'org-client-stark',
      name: 'Stark Industries Inc',
      slug: 'stark-industries',
      primary_color: '#f59e0b',
      logo_url: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield.svg',
      custom_domain: 'ipaas.stark.com',
      created_at: new Date('2026-08-04').toISOString(),
    },
  ],
]);

/**
 * GET /api/v1/agency/organizations
 * Lista todas as sub-organizações atreladas à agência (Exclusivo Master)
 */
router.get('/organizations', requireAuth, requireRole(['Master']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: dbOrgs, error } = await supabaseAdmin.from('organizations').select('*');

    if (!error && dbOrgs && dbOrgs.length > 0) {
      return res.json({ organizations: dbOrgs });
    }

    return res.json({ organizations: Array.from(fallbackOrganizations.values()) });
  } catch (err: any) {
    return res.json({ organizations: Array.from(fallbackOrganizations.values()) });
  }
});

/**
 * POST /api/v1/agency/organizations
 * Cadastra uma nova sub-organização de cliente (Exclusivo Master)
 */
router.post('/organizations', requireAuth, requireRole(['Master']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, primary_color, logo_url, custom_domain } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'O nome da sub-organização é obrigatório.' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newOrgId = `org-client-${Date.now()}`;

    const newOrgData = {
      id: newOrgId,
      name,
      slug,
      primary_color: primary_color || '#00f2fe',
      logo_url: logo_url || '',
      custom_domain: custom_domain || '',
      created_at: new Date().toISOString(),
    };

    const { data: createdOrg, error } = await supabaseAdmin
      .from('organizations')
      .insert(newOrgData)
      .select()
      .single();

    if (!error && createdOrg) {
      fallbackOrganizations.set(createdOrg.id, createdOrg);
      console.log(`🏢 [AGENCY] Nova sub-organização "${createdOrg.name}" criada no Supabase!`);
      return res.status(201).json({ organization: createdOrg });
    }

    fallbackOrganizations.set(newOrgId, newOrgData);
    return res.status(201).json({ organization: newOrgData });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao criar sub-organização', details: err.message });
  }
});

/**
 * PUT /api/v1/agency/organizations/:id
 * Atualiza o branding e configurações de uma sub-organização
 */
router.put('/organizations/:id', requireAuth, requireRole(['Master']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, primary_color, logo_url, custom_domain } = req.body;

    const updatePayload: Record<string, any> = {};
    if (name !== undefined) updatePayload.name = name;
    if (primary_color !== undefined) updatePayload.primary_color = primary_color;
    if (logo_url !== undefined) updatePayload.logo_url = logo_url;
    if (custom_domain !== undefined) updatePayload.custom_domain = custom_domain;

    const { data: updatedOrg, error } = await supabaseAdmin
      .from('organizations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (!error && updatedOrg) {
      fallbackOrganizations.set(id, updatedOrg);
      return res.json({ organization: updatedOrg });
    }

    const localOrg = fallbackOrganizations.get(id);
    if (localOrg) {
      const merged = { ...localOrg, ...updatePayload };
      fallbackOrganizations.set(id, merged);
      return res.json({ organization: merged });
    }

    return res.status(404).json({ error: 'Sub-organização não encontrada.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar branding', details: err.message });
  }
});

/**
 * POST /api/v1/agency/impersonate
 * Alterna dinamicamente a organização ativa do usuário Master sem necessidade de logout
 */
router.post('/impersonate', requireAuth, requireRole(['Master']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetOrganizationId } = req.body;

    if (!targetOrganizationId) {
      return res.status(400).json({ error: 'ID da organização alvo é obrigatório.' });
    }

    let targetOrg = fallbackOrganizations.get(targetOrganizationId);
    const { data: dbOrg } = await supabaseAdmin.from('organizations').select('*').eq('id', targetOrganizationId).single();

    if (dbOrg) {
      targetOrg = dbOrg;
    }

    if (!targetOrg) {
      return res.status(404).json({ error: 'Organização selecionada para alternar não foi encontrada.' });
    }

    console.log(`👤🎭 [IMPERSONATION] Usuário Master alternou contexto para a organização "${targetOrg.name}" (${targetOrg.id})`);

    return res.json({
      message: `Contexto alterado com sucesso para "${targetOrg.name}"!`,
      organization: targetOrg,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Falha ao alternar organização', details: err.message });
  }
});

export const agencyRouter = router;
