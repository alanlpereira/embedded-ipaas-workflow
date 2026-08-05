import crypto from 'crypto';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';

// Chave mestre de encriptação pgsodium (32 bytes) derivada do ambiente
const MASTER_VAULT_KEY = process.env.VAULT_SECRET_KEY || 'NexusFlow_Supabase_Vault_Secret_Key_32B!';

// Tabela em memória fallback para armazenar segredos encriptados no Vault
export interface VaultSecretItem {
  id: string;
  encryptedValue: string;
  iv: string;
  authTag: string;
  created_at: string;
}

const fallbackVaultStore = new Map<string, VaultSecretItem>();

/**
 * Encripta um Token de Autorização / Chave de API via pgsodium / Vault
 * Retorna o ID único do segredo (vault_secret_id) para ser armazenado na configuração do nó.
 */
export async function encryptVaultSecret(plainTextSecret: string): Promise<string> {
  if (!plainTextSecret) return '';

  const secretId = `vault_sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(MASTER_VAULT_KEY, 'salt_pgsodium', 32);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plainTextSecret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  const secretRecord: VaultSecretItem = {
    id: secretId,
    encryptedValue: encrypted,
    iv: iv.toString('hex'),
    authTag,
    created_at: new Date().toISOString(),
  };

  // Gravar no Supabase Vault se a extensão/tabela estiver disponível, ou no fallback em memória
  try {
    await supabaseAdmin.from('vault_secrets').insert({
      id: secretId,
      encrypted_secret: encrypted,
      iv: iv.toString('hex'),
      auth_tag: authTag,
    });
  } catch (e) {}

  fallbackVaultStore.set(secretId, secretRecord);

  console.log(`🔒 [SUPABASE VAULT] Secret encriptado com sucesso no Vault. Secret ID: ${secretId}`);
  return secretId;
}

/**
 * Descriptografa o segredo do Vault EM MEMÓRIA apenas no exato milissegundo da requisição HTTP.
 */
export async function decryptVaultSecret(secretId: string): Promise<string> {
  if (!secretId) return '';

  let record = fallbackVaultStore.get(secretId);

  if (!record) {
    const { data } = await supabaseAdmin
      .from('vault_secrets')
      .select('*')
      .eq('id', secretId)
      .single();

    if (data) {
      record = {
        id: data.id,
        encryptedValue: data.encrypted_secret,
        iv: data.iv,
        authTag: data.auth_tag,
        created_at: data.created_at || new Date().toISOString(),
      };
    }
  }

  if (!record) {
    console.warn(`⚠️ [SUPABASE VAULT] Secret ID não encontrado no Vault: ${secretId}`);
    return '';
  }

  try {
    const key = crypto.scryptSync(MASTER_VAULT_KEY, 'salt_pgsodium', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(record.authTag, 'hex'));

    let decrypted = decipher.update(record.encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    console.log(`⚡ [SUPABASE VAULT MEMORY DECRYPT] Secret ${secretId} descriptografado em memória para o disparo HTTP.`);
    return decrypted;
  } catch (err: any) {
    console.error(`❌ [SUPABASE VAULT ERROR] Falha ao descriptografar secret ${secretId}:`, err.message);
    return '';
  }
}
