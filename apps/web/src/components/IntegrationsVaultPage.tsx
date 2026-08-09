import React, { useState, useEffect } from 'react';
import { KeyRound, Plus, ShieldCheck, Trash2, Lock, Eye, EyeOff, Check, MessageSquare, Mail, Slack, Cpu, AlertCircle } from 'lucide-react';
import { Profile, CredentialVaultItem } from '@ipaas/shared-types';
import { getApiUrl } from '../lib/api';

interface IntegrationsVaultPageProps {
  currentProfile: Profile | null;
}

const serviceIcons: Record<string, React.ElementType> = {
  whatsapp: MessageSquare,
  sendgrid: Mail,
  slack: Slack,
  custom_bearer: Lock,
  api_key: KeyRound,
};

export const IntegrationsVaultPage: React.FC<IntegrationsVaultPageProps> = ({ currentProfile }) => {
  const [credentials, setCredentials] = useState<CredentialVaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState<'whatsapp' | 'sendgrid' | 'slack' | 'custom_bearer' | 'api_key'>('whatsapp');
  const [secretValue, setSecretValue] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/vault/credentials'));
      const data = await res.json();
      if (data.credentials && Array.isArray(data.credentials)) {
        setCredentials(data.credentials);
      }
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !secretValue) return;

    try {
      const res = await fetch(getApiUrl('/api/v1/vault/credentials'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          service_type: serviceType,
          secret_value: secretValue,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Credencial salva com sucesso!');
        setName('');
        setSecretValue('');
        setShowAddModal(false);
        fetchCredentials();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (e) {}
  };

  const handleDeleteCredential = async (id: string) => {
    if (!confirm('Deseja realmente remover esta credencial do Cofre de Segurança?')) return;

    try {
      await fetch(`/api/v1/vault/credentials/${id}`, { method: 'DELETE' });
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {}
  };

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '32px', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', color: '#0a0c10' }}>
            <Lock size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Cofre de Credenciais & Integrações
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Gerencie com segurança criptografada os Tokens de API, Webhooks e Chaves de Acesso
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
            color: '#0a0c10',
            fontWeight: 800,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0, 242, 254, 0.3)',
          }}
        >
          <Plus size={16} />
          Nova Credencial
        </button>
      </div>

      {/* Alerta de Sucesso */}
      {successMsg && (
        <div style={{
          marginBottom: '24px',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid #22c55e',
          borderRadius: '12px',
          padding: '12px 16px',
          color: '#4ade80',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <ShieldCheck size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid de Credenciais */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
      }}>
        {credentials.map((cred) => {
          const Icon = serviceIcons[cred.service_type] || KeyRound;

          return (
            <div
              key={cred.id}
              style={{
                background: 'var(--bg-glass)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{
                    padding: '10px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--accent-cyan)',
                  }}>
                    <Icon size={20} />
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--accent-cyan)',
                    background: 'rgba(0, 242, 254, 0.1)',
                    border: '1px solid rgba(0, 242, 254, 0.2)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                  }}>
                    {cred.service_type}
                  </span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {cred.name}
                </h3>
                
                {/* Valor Mascarado */}
                <div style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  color: 'var(--accent-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}>
                  <span>{cred.masked_value}</span>
                  <ShieldCheck size={16} color="#22c55e" />
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-color)',
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ID: {cred.id}
                </span>

                <button
                  onClick={() => handleDeleteCredential(cred.id)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para Adicionar Nova Credencial */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '28px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px' }}>
              Cadastrar Nova Credencial no Cofre
            </h2>

            <form onSubmit={handleAddCredential}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Nome de Identificação (Ex: Token WhatsApp Produção)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome descritivo da credencial"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Tipo de Serviço / Provedor
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  <option value="whatsapp">WhatsApp Business API</option>
                  <option value="sendgrid">SendGrid Mailer</option>
                  <option value="slack">Slack Webhook Bot</option>
                  <option value="custom_bearer">Bearer Token Customizado</option>
                  <option value="api_key">Chave de API Geral (Header/Query)</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Valor da Chave / Secret Token (Será mascarado)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={secretValue}
                    onChange={(e) => setSecretValue(e.target.value)}
                    placeholder="Cole aqui seu Token secreto"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 14px',
                      borderRadius: '10px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                    color: '#0a0c10',
                    fontWeight: 800,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Salvar no Cofre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
