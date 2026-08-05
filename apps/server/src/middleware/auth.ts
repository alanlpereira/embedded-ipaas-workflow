import { Request, Response, NextFunction } from 'express';
import { Profile, UserRole } from '@ipaas/shared-types';

export interface AuthenticatedRequest extends Request {
  user?: any;
  profile?: Profile;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Para fins de dev/sandbox local, define perfil fallback se não fornecido
    req.profile = {
      id: 'usr-dev-master',
      organization_id: 'org-alp-nexus',
      email: 'master@alp-nexus.com',
      full_name: 'Master Admin (Dev)',
      role: 'Master',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    req.profile = {
      id: 'usr-auth-token',
      organization_id: 'org-alp-nexus',
      email: 'user@alp-nexus.com',
      full_name: 'Autenticado via Token',
      role: token === 'master-token' ? 'Master' : 'Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    next();
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao validar autenticação', details: err.message });
  }
}

export function requireRole(roles: Array<UserRole>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.profile) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    if (!roles.includes(req.profile.role)) {
      return res.status(403).json({
        error: `Acesso negado. Apenas perfis com permissão [${roles.join(', ')}] podem realizar esta operação.`,
      });
    }

    next();
  };
}
