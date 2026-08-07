import React, { useState, useEffect } from 'react';
import { Globe, ShieldCheck, Play, X, Check, Loader2, Code, Zap, FileText, Trash2 } from 'lucide-react';
import { WorkflowNode, HttpNodeConfig, CredentialVaultItem } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';

interface NodeConfigModalProps {
  node: WorkflowNode | null;
  onSave: (updatedNode: WorkflowNode) => void;
  onDelete?: (nodeId: string) => void;
  onClose: () => void;
}

export const NodeConfigModal: React.FC<NodeConfigModalProps> = ({ node, onSave, onDelete, onClose }) => {
  const { t } = useLanguage();
  if (!node) return null;

  const [label, setLabel] = useState(node.data.label || '');
  const [description, setDescription] = useState(node.data.description || '');

  // HTTP Configuration State
  const initialHttp: HttpNodeConfig = node.data.httpConfig || {
    method: 'POST',
    url: 'https://api.sendgrid.com/v3/mail/send',
    credential_id: '',
    headers: JSON.stringify({ 'Content-Type': 'application/json' }, null, 2),
    body: JSON.stringify({ to: 'cliente@empresa.com', subject: 'Notificação Synapse' }, null, 2),
  };

  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>(initialHttp.method || 'POST');
  const [url, setUrl] = useState(initialHttp.url || '');
  const [credentialId, setCredentialId] = useState(initialHttp.credential_id || '');
  const [headersText, setHeadersText] = useState(typeof initialHttp.headers === 'string' ? initialHttp.headers : JSON.stringify(initialHttp.headers || {}, null, 2));
  const [bodyText, setBodyText] = useState(typeof initialHttp.body === 'string' ? initialHttp.body : JSON.stringify(initialHttp.body || {}, null, 2));

  // State para carregamento de credenciais do Cofre
  const [vaultCredentials, setVaultCredentials] = useState<CredentialVaultItem[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const isHttpNode = node.type === 'http' || node.data.type === 'http' || (node.data.label && node.data.label.toLowerCase().includes('http'));

  useEffect(() => {
    fetch('/api/v1/vault/credentials')
      .then((res) => res.json())
      .then((data) => {
        if (data.credentials && Array.isArray(data.credentials)) {
          setVaultCredentials(data.credentials);
        }
      })
      .catch(() => {});
  }, []);

  const handleTestHttp = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/v1/vault/execute-http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: httpMethod,
          url,
          credential_id: credentialId,
          headers: headersText,
          body: bodyText,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message || 'Falha ao conectar com o serviço remoto' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const updated: WorkflowNode = {
      ...node,
      data: {
        ...node.data,
        label,
        description,
        httpConfig: isHttpNode ? {
          method: httpMethod,
          url,
          credential_id: credentialId,
          headers: headersText,
          body: bodyText,
        } : node.data.httpConfig,
      },
    };

    onSave(updated);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '620px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '24px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
      }}>
        {/* Header do Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'rgba(0, 242, 254, 0.15)',
              color: 'var(--accent-cyan)',
            }}>
              <Globe size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Configuração do Nó: {node.data.label}
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Tipo: {node.type || node.data.type} (ID: {node.id})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Campos Básicos */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
            Rótulo / Nome do Nó
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
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

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
            Descrição Curta do Passo
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o objetivo deste nó no fluxo"
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

        {/* Formulário Específico de Requisição HTTP / Webhook */}
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={16} />
            Parâmetros da Requisição HTTP / Webhook Externa
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                Método
              </label>
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-cyan)',
                  fontWeight: 800,
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                URL de Destino
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.exemplo.com/v1/webhook"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>

          {/* Seleção da Credencial do Cofre */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
              Credencial do Cofre (Injetada no Authorization Header)
            </label>
            <select
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none',
              }}
            >
              <option value="">Nenhuma (Requisição Pública)</option>
              {vaultCredentials.map((cred) => (
                <option key={cred.id} value={cred.id}>
                  🔑 {cred.name} [{cred.masked_value}]
                </option>
              ))}
            </select>
          </div>

          {/* Headers Customizados */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
              Headers Customizados (JSON)
            </label>
            <textarea
              rows={2}
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '11px',
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Body Payload JSON */}
          {['POST', 'PUT', 'PATCH'].includes(httpMethod) && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                Corpo da Requisição (JSON Body Payload)
              </label>
              <textarea
                rows={3}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          )}

          {/* Botão para Testar Requisição HTTP Real */}
          <button
            type="button"
            onClick={handleTestHttp}
            disabled={isTesting}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '9px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '12px',
              border: 'none',
              cursor: isTesting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
            }}
          >
            {isTesting ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Executando Requisição HTTP Real...
              </>
            ) : (
              <>
                <Play size={14} />
                Testar Requisição HTTP Real Agora
              </>
            )}
          </button>
        </div>

        {/* Resultado do Teste HTTP */}
        {testResult && (
          <div style={{
            background: 'var(--bg-primary)',
            border: testResult.error || !testResult.ok ? '1px solid #ef4444' : '1px solid #22c55e',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '20px',
            fontSize: '11px',
            fontFamily: 'monospace',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <strong style={{ color: testResult.error || !testResult.ok ? '#ef4444' : '#22c55e' }}>
                Status: {testResult.status || 'Erro'} ({testResult.execution_time_ms || 0} ms)
              </strong>
              <span style={{ color: 'var(--text-muted)' }}>{testResult.url}</span>
            </div>
            <pre style={{ margin: 0, overflowX: 'auto', color: 'var(--text-secondary)', maxHeight: '120px' }}>
              {JSON.stringify(testResult.response_data || testResult, null, 2)}
            </pre>
          </div>
        )}

        {/* Footer do Modal */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end' }}>
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                if (onDelete && node) {
                  onDelete(node.id);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#f87171',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                marginRight: 'auto',
              }}
            >
              <Trash2 size={15} />
              {t.nodeConfig.deleteBtn}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {t.nodeConfig.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
              color: '#0a0c10',
              fontWeight: 800,
              fontSize: '12px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t.nodeConfig.saveBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
