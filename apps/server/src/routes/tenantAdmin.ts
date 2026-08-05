import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { fallbackOrganizations } from './agency.js';

const router = Router();

export interface ActivityFeedItem {
  id: string;
  organization_id: string;
  user_email: string;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
}

export const fallbackTenantProfiles = new Map<string, any>([
  [
    'prof-1',
    {
      id: 'prof-1',
      organization_id: 'org-alp-nexus',
      full_name: 'Alan Pereira',
      email: 'alan.pereira@alp-nexus.com',
      role: 'Master',
      created_at: new Date().toISOString(),
    },
  ],
  [
    'prof-2',
    {
      id: 'prof-2',
      organization_id: 'org-alp-nexus',
      full_name: 'Carlos Santos',
      email: 'carlos.admin@empresa.com',
      role: 'Admin',
      created_at: new Date().toISOString(),
    },
  ],
  [
    'prof-3',
    {
      id: 'prof-3',
      organization_id: 'org-alp-nexus',
      full_name: 'Mariana Lima',
      email: 'mariana.viewer@empresa.com',
      role: 'Viewer',
      created_at: new Date().toISOString(),
    },
  ],
]);

export const fallbackActivities: ActivityFeedItem[] = [
  {
    id: 'act-1',
    organization_id: 'org-alp-nexus',
    user_email: 'alan.pereira@alp-nexus.com',
    user_name: 'Alan Pereira (Master)',
    action: 'CREATED_FLOW',
    details: 'Criou o fluxograma "Integração Webhook & CRM B2B"',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'act-2',
    organization_id: 'org-alp-nexus',
    user_email: 'alan.pereira@alp-nexus.com',
    user_name: 'Alan Pereira (Master)',
    action: 'EXECUTED_FLOW',
    details: 'Executou o fluxo de Webhook com sucesso (Status: COMPLETED)',
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'act-3',
    organization_id: 'org-alp-nexus',
    user_email: 'alan.pereira@alp-nexus.com',
    user_name: 'Alan Pereira (Master)',
    action: 'MEMBER_ADDED',
    details: 'Convidou o usuário "suporte@alp-nexus.com" como Admin',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

/**
 * GET /api/v1/tenant/dashboard
 * Retorna estatísticas do plano, feed de atividades e membros da organização ativa
 */
router.get('/dashboard', requireAuth, requireRole(['Admin', 'Master']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user?.organization_id || 'org-alp-nexus';

    // Buscar dados da organização
    let orgData: any;
    const { data: dbOrg } = await supabaseAdmin.from('organizations').select('*').eq('id', orgId).single();

    if (dbOrg) {
      orgData = dbOrg;
    } else {
      orgData = fallbackOrganizations.get(orgId) || fallbackOrganizations.get('org-alp-nexus');
    }

    const aiTokensLimit = orgData.ai_tokens_limit || 500000;
    const customOverride = orgData.custom_token_override || 0;
    const totalAllowedTokens = aiTokensLimit + customOverride;
    const aiTokensUsed = orgData.ai_tokens_used || 420000;

    const isTokenLimitExceeded = aiTokensUsed >= totalAllowedTokens;

    // Buscar membros da equipe
    let teamMembers: any[] = [];
    const { data: dbProfiles } = await supabaseAdmin.from('profiles').select('*').eq('organization_id', orgId);

    if (dbProfiles && dbProfiles.length > 0) {
      teamMembers = dbProfiles;
    } else {
      teamMembers = Array.from(fallbackTenantProfiles.values()).filter((p: any) => p.organization_id === orgId);
    }

    // Buscar feed de atividades da empresa
    let activities: ActivityFeedItem[] = [];
    const { data: dbActivities } = await supabaseAdmin
      .from('organization_activities')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (dbActivities && dbActivities.length > 0) {
      activities = dbActivities;
    } else {
      activities = fallbackActivities.filter((a) => a.organization_id === orgId);
    }

    return res.json({
      organization: orgData,
      planUsage: {
        aiTokensUsed,
        aiTokensLimit,
        customOverride,
        totalAllowedTokens,
        usagePercentage: Math.min(100, Math.round((aiTokensUsed / totalAllowedTokens) * 100)),
        isTokenLimitExceeded,
        monthlyExecutionsUsed: 3240,
        monthlyExecutionsLimit: 10000,
      },
      teamMembers,
      activities,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao carregar Dashboard do Tenant', details: err.message });
  }
});

/**
 * POST /api/v1/tenant/team/members
 * Permite ao Admin convidar novos membros para a sua organização
 */
router.post('/team/members', requireAuth, requireRole(['Admin', 'Master']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.user?.organization_id || 'org-alp-nexus';
    const { full_name, email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'E-mail e Role são obrigatórios.' });
    }

    const newMemberId = `prof-${Date.now()}`;
    const newMember = {
      id: newMemberId,
      organization_id: orgId,
      full_name: full_name || email.split('@')[0],
      email,
      role: role || 'Viewer',
      created_at: new Date().toISOString(),
    };

    await supabaseAdmin.from('profiles').insert(newMember);
    fallbackTenantProfiles.set(newMemberId, newMember);

    // Registrar evento de atividade
    const newActivity = {
      id: `act-${Date.now()}`,
      organization_id: orgId,
      user_email: req.user?.email || 'admin@tenant.com',
      user_name: req.user?.full_name || 'Admin',
      action: 'MEMBER_ADDED',
      details: `Convidou o usuário "${email}" com a permissão ${role}`,
      created_at: new Date().toISOString(),
    };

    await supabaseAdmin.from('organization_activities').insert(newActivity);
    fallbackActivities.unshift(newActivity);

    console.log(`👤 [TENANT ADMIN] Novo membro "${email}" (${role}) adicionado à org ${orgId}`);

    return res.status(201).json({
      message: 'Membro adicionado com sucesso!',
      member: newMember,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao adicionar membro', details: err.message });
  }
});

/**
 * DELETE /api/v1/tenant/team/members/:id
 * Remove um membro da organização
 */
router.delete('/team/members/:id', requireAuth, requireRole(['Admin', 'Master']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await supabaseAdmin.from('profiles').delete().eq('id', id);
    fallbackTenantProfiles.delete(id);

    return res.json({ message: 'Membro removido da equipe com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao remover membro', details: err.message });
  }
});

export const tenantAdminRouter = router;
