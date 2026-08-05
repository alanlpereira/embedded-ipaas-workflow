import { Router, Request, Response } from 'express';
import { encryptVaultSecret } from '../engine/vaultService.js';

export const vaultRouter = Router();

/**
 * POST /api/v1/vault/secrets
 * Encripta um Token de Autorização ou Chave de API no Vault e retorna o secretId
 */
vaultRouter.post('/secrets', async (req: Request, res: Response): Promise<void> => {
  const { secretText } = req.body;

  if (!secretText || typeof secretText !== 'string') {
    res.status(400).json({ error: 'O texto do segredo é obrigatório.' });
    return;
  }

  try {
    const vaultSecretId = await encryptVaultSecret(secretText);
    res.json({
      message: 'Token de autorização criptografado com sucesso no Supabase Vault (pgsodium).',
      vault_secret_id: vaultSecretId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao encriptar segredo no Vault.' });
  }
});
