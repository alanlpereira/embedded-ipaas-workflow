import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { CredentialVaultItem, HttpNodeConfig } from '@ipaas/shared-types';

export const vaultRouter = Router();

// In-memory fallback de credenciais caso Supabase DB esteja offline
let mockCredentialsMemory: CredentialVaultItem[] = [
  {
    id: 'cred-wa-01',
    organization_id: 'org-alp-nexus',
    name: 'WhatsApp Business API Key',
    service_type: 'whatsapp',
    masked_value: 'EAAG...98xZ',
    secret_value: 'EAAG8971293812938192389182398xZ',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cred-sg-01',
    organization_id: 'org-alp-nexus',
    name: 'SendGrid Mailer API Token',
    service_type: 'sendgrid',
    masked_value: 'SG.28a...k99a',
    secret_value: 'SG.28a91283918239182391823912k99a',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cred-sl-01',
    organization_id: 'org-alp-nexus',
    name: 'Slack Webhook Bot Token',
    service_type: 'slack',
    masked_value: 'xoxb-...4812',
    secret_value: 'xoxb-9182391823-12938192381-4812',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * Função utilitária para mascarar chaves de API com segurança
 */
function maskSecret(secret: string): string {
  if (!secret || secret.length < 6) return '******';
  const start = secret.slice(0, 4);
  const end = secret.slice(-4);
  return `${start}...${end}`;
}

/**
 * GET /api/v1/vault/credentials
 * Lista as credenciais do Cofre mascaradas
 */
vaultRouter.get('/credentials', async (req: Request, res: Response): Promise<void> => {
  const orgId = (req.headers['x-organization-id'] as string) || 'org-alp-nexus';

  try {
    const { data, error } = await supabaseAdmin
      .from('credentials')
      .select('id, organization_id, name, service_type, masked_value, created_at, updated_at')
      .eq('organization_id', orgId);

    if (!error && data && data.length > 0) {
      res.json({ credentials: data });
      return;
    }
  } catch (e) {}

  // Fallback em memória
  const filtered = mockCredentialsMemory.map(({ secret_value, ...rest }) => rest);
  res.json({ credentials: filtered });
});

/**
 * POST /api/v1/vault/credentials
 * Salva uma nova credencial no Cofre (com valor mascarado no frontend)
 */
vaultRouter.post('/credentials', async (req: Request, res: Response): Promise<void> => {
  const orgId = (req.headers['x-organization-id'] as string) || 'org-alp-nexus';
  const { name, service_type, secret_value } = req.body;

  if (!name || !secret_value) {
    res.status(400).json({ error: 'Os campos name e secret_value são obrigatórios.' });
    return;
  }

  const masked = maskSecret(secret_value);
  const newCredential: CredentialVaultItem = {
    id: `cred-${Date.now()}`,
    organization_id: orgId,
    name,
    service_type: service_type || 'custom_bearer',
    masked_value: masked,
    secret_value,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    await supabaseAdmin.from('credentials').insert(newCredential);
  } catch (e) {}

  mockCredentialsMemory.unshift(newCredential);

  const { secret_value: _, ...responseItem } = newCredential;
  res.status(201).json({
    message: 'Credencial salva com sucesso no Cofre de Credenciais!',
    credential: responseItem,
  });
});

/**
 * DELETE /api/v1/vault/credentials/:id
 * Remove uma credencial do Cofre
 */
vaultRouter.delete('/credentials/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    await supabaseAdmin.from('credentials').delete().eq('id', id);
  } catch (e) {}

  mockCredentialsMemory = mockCredentialsMemory.filter((c) => c.id !== id);

  res.json({ message: 'Credencial removida com sucesso do Cofre.' });
});

/**
 * POST /api/v1/vault/execute-http
 * Executa uma requisição HTTP/Webhook real configurada em um Nó do fluxo
 */
vaultRouter.post('/execute-http', async (req: Request, res: Response): Promise<void> => {
  const httpConfig: HttpNodeConfig = req.body;

  if (!httpConfig || !httpConfig.url) {
    res.status(400).json({ error: 'URL de destino é obrigatória para executar o Nó HTTP.' });
    return;
  }

  const startTime = Date.now();
  let headersObj: Record<string, string> = {
    'User-Agent': 'Synapse-iPaaS-Workflow-Engine/1.0',
  };

  // Se houver uma credencial do Cofre selecionada, injetar no Header Authorization
  if (httpConfig.credential_id) {
    const foundCred = mockCredentialsMemory.find((c) => c.id === httpConfig.credential_id);
    const token = foundCred?.secret_value || 'mock-secret-token';
    headersObj['Authorization'] = `Bearer ${token}`;
  }

  // Parsear Headers customizados se existirem
  if (httpConfig.headers) {
    if (typeof httpConfig.headers === 'string') {
      try {
        const parsed = JSON.parse(httpConfig.headers);
        headersObj = { ...headersObj, ...parsed };
      } catch (e) {}
    } else if (typeof httpConfig.headers === 'object') {
      headersObj = { ...headersObj, ...httpConfig.headers };
    }
  }

  try {
    const fetchOptions: RequestInit = {
      method: httpConfig.method || 'GET',
      headers: headersObj,
    };

    if (['POST', 'PUT', 'PATCH'].includes(httpConfig.method) && httpConfig.body) {
      headersObj['Content-Type'] = headersObj['Content-Type'] || 'application/json';
      fetchOptions.body = typeof httpConfig.body === 'string' ? httpConfig.body : JSON.stringify(httpConfig.body);
    }

    console.log(`🌐 [HTTP ENGINE] Disparando requisição real: ${fetchOptions.method} -> ${httpConfig.url}`);

    const response = await fetch(httpConfig.url, fetchOptions);
    const executionTimeMs = Date.now() - startTime;

    let responseData: any;
    const responseText = await response.text();

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    res.json({
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      execution_time_ms: executionTimeMs,
      url: httpConfig.url,
      method: httpConfig.method,
      headers_sent: headersObj,
      response_data: responseData,
    });
  } catch (err: any) {
    const executionTimeMs = Date.now() - startTime;
    res.status(502).json({
      error: `Falha na requisição HTTP/Webhook: ${err.message || 'Erro de conexão ou timeout'}`,
      execution_time_ms: executionTimeMs,
      url: httpConfig.url,
    });
  }
});
