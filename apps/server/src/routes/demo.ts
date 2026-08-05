import { Router, Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../lib/supabaseAdmin';
import { requireAuth, requireRole } from '../middleware/auth';

export const demoRouter = Router();

// Store fallback em memória caso a tabela demo_tokens ainda não exista no Supabase
const fallbackDemoTokens = new Map<string, {
  organization_id: string;
  admin_id: string;
  admin_email: string;
  expires_at: string;
}>();

/**
 * POST /api/v1/master/demo-link
 * Apenas usuários Master podem gerar um link mágico de demo (validade de 7 dias)
 */
demoRouter.post('/master/demo-link', requireAuth, requireRole(['Master']), async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;

    if (!organization_id) {
      return res.status(400).json({ error: 'organization_id é obrigatório.' });
    }

    // 1. Obter o usuário Admin da organização
    let adminProfile: any = null;

    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', organization_id)
      .limit(1);

    if (!profileErr && profiles && profiles.length > 0) {
      adminProfile = profiles[0];
    } else {
      // Fallback mock perfil
      adminProfile = {
        id: `admin-${organization_id}`,
        organization_id,
        email: `admin@${organization_id}.com`,
        full_name: 'Admin da Organização',
        role: 'Admin',
      };
    }

    // 2. Gerar token único e definir expiração para 7 dias (168 horas)
    const demoToken = `demo_tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // 3. Tentar gravar na tabela 'demo_tokens' do Supabase
    const { error: dbErr } = await supabase
      .from('demo_tokens')
      .insert({
        token: demoToken,
        organization_id,
        admin_id: adminProfile.id,
        admin_email: adminProfile.email,
        expires_at: expiresAt,
      });

    // Se falhar no banco (ex: migração pendente), grava na memória fallback
    if (dbErr) {
      fallbackDemoTokens.set(demoToken, {
        organization_id,
        admin_id: adminProfile.id,
        admin_email: adminProfile.email,
        expires_at: expiresAt,
      });
    }

    // 4. Montar a URL dinâmica do Link Mágico sem fixar 'localhost'
    const publicAppUrl = process.env.PUBLIC_APP_URL || process.env.VITE_PUBLIC_APP_URL;
    const requestOrigin = req.headers.origin || (req.headers.referer ? req.headers.referer.replace(/\/$/, '') : null);
    const baseUrl = publicAppUrl || requestOrigin || 'https://synapse.alp-nexus.com';

    const demoUrl = `${baseUrl}/demo?token=${demoToken}`;

    return res.status(201).json({
      success: true,
      token: demoToken,
      demoUrl,
      expiresAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerar link de demo mágica.', details: err.message });
  }
});

/**
 * GET /api/v1/demo/verify?token=XYZ
 * Rota pública para validar o token e autenticar silenciosamente o usuário no Supabase
 */
demoRouter.get('/demo/verify', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token não fornecido.' });
    }

    let tokenData: any = null;

    // 1. Tentar consultar no Supabase
    const { data: dbData, error: dbErr } = await supabase
      .from('demo_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (!dbErr && dbData) {
      tokenData = dbData;
    } else {
      // Consultar fallback em memória
      tokenData = fallbackDemoTokens.get(token);
    }

    if (!tokenData) {
      return res.status(404).json({ valid: false, error: 'Link de demo mágica inválido ou inexistente.' });
    }

    // 2. Verificar se o token expirou (7 dias)
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(410).json({ valid: false, error: 'Link de demo mágica expirou. Solicite um novo link.' });
    }

    // 3. Obter ou montar o perfil do usuário Admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', tokenData.admin_id)
      .single();

    const resultProfile = profile || {
      id: tokenData.admin_id || `admin-${tokenData.organization_id}`,
      organization_id: tokenData.organization_id,
      email: tokenData.admin_email || `admin@${tokenData.organization_id}.com`,
      full_name: 'Admin da Organização',
      role: 'Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return res.json({
      valid: true,
      profile: resultProfile,
    });
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: 'Erro ao verificar token de demo.', details: err.message });
  }
});
