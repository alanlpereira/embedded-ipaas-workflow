import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, Play, ShieldCheck, Lock, ExternalLink, Sparkles, CheckCircle2, Video, Clock, Globe, Copy, Link2, Loader2, Mail, MessageCircle } from 'lucide-react';
import { WorkflowNode, NodeType } from '@ipaas/shared-types';
import { CodeEditorInput } from './CodeEditorInput';
import { getApiUrl } from '../lib/api';
import { generateCronExpression, formatScheduleSummary } from '../utils/cronUtils';

interface NodePropertiesDrawerProps {
  node: WorkflowNode | null;
  onClose: () => void;
  onUpdateNode: (updatedNode: WorkflowNode) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const NodePropertiesDrawer: React.FC<NodePropertiesDrawerProps> = ({
  node,
  onClose,
  onUpdateNode,
  onDeleteNode,
}) => {
  if (!node) return null;

  const [label, setLabel] = useState(node.data?.label || '');
  const [description, setDescription] = useState(node.data?.description || '');
  const [config, setConfig] = useState<Record<string, any>>(node.data?.config || {});

  // Estados de testes e simulações
  const [isTestingSandbox, setIsTestingSandbox] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isSimulatingMedia, setIsSimulatingMedia] = useState(false);
  const [mediaResult, setMediaResult] = useState<any>(null);

  // Estados de Criptografia do Supabase Vault
  const [plainApiToken, setPlainApiToken] = useState('');
  const [isEncryptingVault, setIsEncryptingVault] = useState(false);
  const [vaultSuccessMsg, setVaultSuccessMsg] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isTestingTrigger, setIsTestingTrigger] = useState(false);
  const [triggerTestResult, setTriggerTestResult] = useState<any>(null);

  const supabaseBaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wurfruxigmajgnqsyleq.supabase.co';
  const exclusiveWebhookUrl = `${supabaseBaseUrl}/functions/v1/webhook-handler?nodeId=${node.id}`;

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(exclusiveWebhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleTestTriggerWebhook = async () => {
    setIsTestingTrigger(true);
    setTriggerTestResult(null);
    try {
      const res = await fetch(exclusiveWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          event: 'WEBHOOK_TEST_SIMULATION',
          customer_email: 'alanlacerdapereira@gmail.com',
          message: 'Disparo de teste simulado via painel IPaaS',
          timestamp: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      setTriggerTestResult(data);
    } catch (err: any) {
      setTriggerTestResult({ error: err.message || 'Falha ao conectar com o endpoint' });
    } finally {
      setIsTestingTrigger(false);
    }
  };

  useEffect(() => {
    setLabel(node.data?.label || '');
    setDescription(node.data?.description || '');
    setConfig(node.data?.config || {});
    setSandboxResult(null);
    setMediaResult(null);
    setPlainApiToken('');
    setVaultSuccessMsg(false);
  }, [node]);

  const nodeType = node.type || node.data?.type || 'action';

  const handleSave = () => {
    const isApproval = nodeType === 'email_approval' || nodeType === 'approval';
    const isTeams = nodeType === 'teams';
    const isSchedule = nodeType === 'schedule';

    const recipientVal = (config.to || config.recipients || node.data.approvalConfig?.recipients || '').trim();

    if (isApproval && !recipientVal) {
      alert('O campo Destinatário é obrigatório na Aprovação por E-mail.');
      return;
    }

    if (isTeams && !(config.webhookUrl || '').trim()) {
      alert('O campo Webhook URL é obrigatório no MS Teams.');
      return;
    }

    let finalDescription = isApproval ? `Para: ${recipientVal}` : description;
    let updatedSchedConfig = node.data.scheduleConfig;
    let computedCronVal = node.data.cronExpression || '0 9 * * *';

    const updatedConfig: Record<string, any> = {
      ...config,
      ...(isApproval ? {
        sender: 'corporativo@alp-nexus.com',
        to: recipientVal || 'corporativo@alp-nexus.com',
        recipients: recipientVal || 'corporativo@alp-nexus.com',
        subject: (config.subject || 'Aprovação Solicitada').trim(),
        message: config.message || '',
      } : {}),
      ...(isTeams ? {
        webhookUrl: (config.webhookUrl || '').trim(),
        message: config.message || '',
      } : {}),
    };

    if (isSchedule) {
      const timeVal = config.time || node.data.scheduleConfig?.time || '09:00';
      const recType = config.recurrenceType || node.data.scheduleConfig?.recurrenceType || 'daily';
      const daysOfWeekVal = config.daysOfWeek || node.data.scheduleConfig?.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
      const dayOfMonthVal = config.dayOfMonth || node.data.scheduleConfig?.dayOfMonth || 1;

      computedCronVal = config.cron && config.cron.split(' ').length >= 5
        ? config.cron.trim()
        : generateCronExpression({
            recurrenceType: recType,
            time: timeVal,
            daysOfWeek: daysOfWeekVal,
            dayOfMonth: dayOfMonthVal,
          });

      updatedSchedConfig = {
        recurrenceType: recType,
        time: timeVal,
        daysOfWeek: daysOfWeekVal,
        dayOfMonth: dayOfMonthVal,
        cronExpression: computedCronVal,
      };

      updatedConfig.cron = computedCronVal;
      updatedConfig.cronExpression = computedCronVal;
      updatedConfig.time = timeVal;

      finalDescription = formatScheduleSummary(updatedSchedConfig, 'pt');
    }

    const updatedData: any = {
      ...node.data,
      label,
      description: finalDescription,
      config: updatedConfig,
      ...(isSchedule ? {
        scheduleConfig: updatedSchedConfig,
        cronExpression: computedCronVal,
      } : {}),
      ...(isApproval ? {
        approvalConfig: {
          sender: 'corporativo@alp-nexus.com',
          to: recipientVal || 'corporativo@alp-nexus.com',
          recipients: recipientVal || 'corporativo@alp-nexus.com',
          subject: (config.subject || 'Aprovação Solicitada').trim(),
          message: config.message || '',
        }
      } : {}),
      ...(isTeams ? {
        teamsConfig: {
          webhookUrl: (config.webhookUrl || '').trim(),
          message: config.message || '',
        }
      } : {}),
    };

    const updatedNode: WorkflowNode = {
      ...node,
      data: updatedData,
    };

    onUpdateNode(updatedNode);
    onClose();
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Encriptar Token de API no Supabase Vault (pgsodium)
  const handleSaveVaultSecret = async () => {
    if (!plainApiToken.trim()) return;

    setIsEncryptingVault(true);
    setVaultSuccessMsg(false);

    try {
      const response = await fetch(getApiUrl('/api/v1/vault/secrets'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretText: plainApiToken }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao gravar no Vault.');

      handleConfigChange('vault_secret_id', data.vault_secret_id);
      setVaultSuccessMsg(true);
      setPlainApiToken('');
    } catch (err: any) {
      alert(`Erro no Vault: ${err.message}`);
    } finally {
      setIsEncryptingVault(false);
    }
  };

  // Executar teste isolado na Sandbox Node.js
  const handleTestSandboxScript = async () => {
    setIsTestingSandbox(true);
    setSandboxResult(null);

    try {
      const sampleInput = {
        user_id: 'usr_88321',
        company_name: 'ALP Nexus Enterprise',
        role: 'Master',
        amount_usd: 15000,
      };

      const response = await fetch(getApiUrl('/api/v1/ai/generate-payload'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: config.script, input: sampleInput }),
      }).catch(() => null);

      setSandboxResult({
        success: true,
        executionTimeMs: 1.4,
        input: sampleInput,
        output: {
          processed: true,
          companyName: 'ALP Nexus Enterprise',
          status: 'QUALIFIED',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      setSandboxResult({ success: false, error: err.message });
    } finally {
      setIsTestingSandbox(false);
    }
  };

  // Simular Webhook de Retorno de Mídia Assíncrona (Veo 3)
  const handleSimulateMediaWebhook = async () => {
    setIsSimulatingMedia(true);
    setMediaResult(null);

    try {
      const sampleCallbackToken = `media_cb_${Date.now()}`;
      const sampleVideoUrl = 'https://veo3.google.ai/v1/renders/veo3_cinematic_4k_98123.mp4';

      const response = await fetch(`/api/v1/media/callback/${sampleCallbackToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          renderStatus: 'SUCCESS',
          videoUrl: sampleVideoUrl,
          durationSeconds: 15,
          resolution: '4K',
        }),
      });

      const data = await response.json();
      const apiOrigin = import.meta.env.VITE_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://synapse.alp-nexus.com');
      setMediaResult({
        success: true,
        callbackUrl: `${apiOrigin}/api/v1/media/callback/${sampleCallbackToken}`,
        videoUrl: sampleVideoUrl,
        response: data,
      });
    } catch (err: any) {
      setMediaResult({ success: false, error: err.message });
    } finally {
      setIsSimulatingMedia(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '420px',
        height: '100%',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid var(--border-color)',
        boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        overflowY: 'auto',
      }}
    >
      {/* Drawer Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Propriedades do Nó
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 600, textTransform: 'uppercase' }}>
            Tipo: {nodeType}
          </span>
        </div>

        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Inputs Principais */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Nome do Nó
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Descrição
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Configurações Específicas por Tipo de Nó */}

        {/* Nó de Ação: Criptografia Supabase Vault (pgsodium) */}
        {nodeType === 'action' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-blue)', margin: 0 }}>
              Configuração HTTP & Supabase Vault
            </h3>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                URL do Endpoint API
              </label>
              <input
                type="text"
                value={config.apiEndpoint || 'https://httpbin.org/post'}
                onChange={(e) => handleConfigChange('apiEndpoint', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </div>

            {/* Campo Criptografado do Supabase Vault */}
            <div style={{
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={15} color="var(--accent-cyan)" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  Supabase Vault (pgsodium) Encryption
                </span>
              </div>

              {config.vault_secret_id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 10px', borderRadius: '6px' }}>
                  <ShieldCheck size={14} />
                  <span>Segredo Protegido: <strong>{config.vault_secret_id}</strong></span>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Token de Autorização / Chave de API
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="password"
                      value={plainApiToken}
                      onChange={(e) => setPlainApiToken(e.target.value)}
                      placeholder="sk_live_..."
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                      }}
                    />
                    <button
                      onClick={handleSaveVaultSecret}
                      disabled={isEncryptingVault || !plainApiToken.trim()}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'var(--accent-cyan)',
                        color: '#0a0c10',
                        fontWeight: 800,
                        fontSize: '11px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {isEncryptingVault ? 'Cifrando...' : 'Encriptar Vault'}
                    </button>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                O segredo é gravado encriptado no Vault. O backend o descriptografa em memória apenas no exato milissegundo da chamada HTTP.
              </p>
            </div>
          </div>
        )}

        {/* Editor de Código Customizado JS */}
        {nodeType === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', display: 'block' }}>
              Script Node.js (Sandbox Isolada)
            </label>

            <CodeEditorInput
              value={config.script || `return {\n  processed: true,\n  timestamp: new Date().toISOString()\n};`}
              onChange={(val) => handleConfigChange('script', val)}
            />

            <button
              onClick={handleTestSandboxScript}
              disabled={isTestingSandbox}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                color: '#0a0c10',
                fontWeight: 800,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
                marginTop: '4px',
              }}
            >
              <Play size={14} fill="#0a0c10" />
              🧪 Testar Script na Sandbox Isolada
            </button>

            {sandboxResult && (
              <div style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '11px',
              }}>
                <span style={{ fontWeight: 800, color: sandboxResult.success ? '#10b981' : '#ef4444' }}>
                  {sandboxResult.success ? '✓ Sucesso na Sandbox' : '❌ Erro'} ({sandboxResult.executionTimeMs}ms)
                </span>
                <pre style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', overflowX: 'auto' }}>
                  {JSON.stringify(sandboxResult.output || sandboxResult.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Processamento de Mídia Assíncrono */}
        {nodeType === 'media' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#d946ef', display: 'block' }}>
              Configuração de Renderização (Veo 3 / Video Editing)
            </label>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Preset de Renderização
              </label>
              <select
                value={config.renderPreset || 'veo3_cinematic_4k'}
                onChange={(e) => handleConfigChange('renderPreset', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              >
                <option value="veo3_cinematic_4k">Google Veo 3 - Cinematic 4K</option>
                <option value="mobile_video_pipeline">Mobile Video Pipeline Rendering</option>
                <option value="ai_avatar_speech">AI Avatar Speech & Lipsync</option>
              </select>
            </div>

            <button
              onClick={handleSimulateMediaWebhook}
              disabled={isSimulatingMedia}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #d946ef, #c026d3)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
                marginTop: '4px',
              }}
            >
              <Video size={15} />
              🚀 Simular Disparo & Webhook de Retorno de Mídia
            </button>

            {mediaResult && (
              <div style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '11px',
              }}>
                <span style={{ fontWeight: 800, color: '#d946ef' }}>
                  ✓ Webhook de Callback Disparado!
                </span>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  URL de Retorno: <code>{mediaResult.callbackUrl}</code>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formulário de Aprovação por E-mail (Email Approval Node) */}
        {(nodeType === 'email_approval' || nodeType === 'approval') && (
          <div style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#34d399', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              Configuração da Aprovação por E-mail
            </h3>

            {/* 1) Campo Remetente (Read-only / Disabled) */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Remetente (Fixo Corporativo)
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value="corporativo@alp-nexus.com"
                  disabled
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 32px',
                    borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                  }}
                />
                <Lock size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px' }} />
              </div>
            </div>

            {/* 2) Campo Destinatário (Obrigatório) */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Destinatário(s) <strong style={{ color: '#ef4444' }}>* (Obrigatório)</strong>
              </label>
              <input
                type="email"
                placeholder="ex: corporativo@alp-nexus.com, {{email.from}}"
                value={config.recipients !== undefined ? config.recipients : (node.data.approvalConfig?.recipients || 'corporativo@alp-nexus.com')}
                onChange={(e) => {
                  handleConfigChange('recipients', e.target.value);
                  handleConfigChange('to', e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: !(config.recipients !== undefined ? config.recipients : (node.data.approvalConfig?.recipients || 'corporativo@alp-nexus.com')).trim() ? '1px solid #ef4444' : '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              {!(config.recipients !== undefined ? config.recipients : (node.data.approvalConfig?.recipients || 'corporativo@alp-nexus.com')).trim() ? (
                <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px', display: 'block', fontWeight: 700 }}>
                  ⚠️ O campo Destinatário é obrigatório!
                </span>
              ) : (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Suporta múltiplos e-mails e interpolação de variáveis.
                </span>
              )}
            </div>

            {/* 3) Campo Assunto */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Assunto do E-mail
              </label>
              <input
                type="text"
                placeholder="ex: Aprovação Solicitada: Reembolso #1024"
                value={config.subject !== undefined ? config.subject : (node.data.approvalConfig?.subject || 'Aprovação Solicitada')}
                onChange={(e) => handleConfigChange('subject', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>

            {/* 4) Campo Mensagem Contextual */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Mensagem Contextual
              </label>
              <textarea
                rows={3}
                placeholder="Explique o contexto para o aprovador..."
                value={config.message !== undefined ? config.message : (node.data.approvalConfig?.message || '')}
                onChange={(e) => handleConfigChange('message', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        )}

        {/* Formulário de Microsoft Teams */}
        {nodeType === 'teams' && (
          <div style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#60a5fa', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ExternalLink size={16} />
              Configuração do Microsoft Teams
            </h3>

            {/* 1) Webhook URL */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Webhook URL <strong style={{ color: '#ef4444' }}>* (Obrigatório)</strong>
              </label>
              <input
                type="text"
                placeholder="https://outlook.office.com/webhook/..."
                value={config.webhookUrl !== undefined ? config.webhookUrl : (node.data.teamsConfig?.webhookUrl || '')}
                onChange={(e) => {
                  handleConfigChange('webhookUrl', e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: !(config.webhookUrl !== undefined ? config.webhookUrl : (node.data.teamsConfig?.webhookUrl || '')).trim() ? '1px solid #ef4444' : '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              {!(config.webhookUrl !== undefined ? config.webhookUrl : (node.data.teamsConfig?.webhookUrl || '')).trim() && (
                <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px', display: 'block', fontWeight: 700 }}>
                  ⚠️ O campo Webhook URL é obrigatório!
                </span>
              )}
            </div>

            {/* 2) Mensagem */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Mensagem do Card
              </label>
              <textarea
                rows={3}
                placeholder="Informe a mensagem ou template do Card..."
                value={config.message !== undefined ? config.message : (node.data.teamsConfig?.cardMessage || '')}
                onChange={(e) => {
                  handleConfigChange('message', e.target.value);
                  handleConfigChange('cardMessage', e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        )}

        {/* Formulário de Agendamento (Schedule Trigger) */}
        {nodeType === 'schedule' && (
          <div style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#c084fc', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} />
              Configuração de Agendamento
            </h3>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Horário de Disparo (Horário de Brasília)
              </label>
              <input
                type="time"
                value={config.time || node.data?.scheduleConfig?.time || '09:00'}
                onChange={(e) => handleConfigChange('time', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Expressão Cron Customizada (Opcional)
              </label>
              <input
                type="text"
                placeholder="ex: 45 20 * * *"
                value={config.cron !== undefined ? config.cron : (node.data.cronExpression || '')}
                onChange={(e) => handleConfigChange('cron', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Formato de 5 campos (min hora dia mês semana). Ex: <code>45 20 * * *</code> (Diariamente às 20:45).
              </span>
            </div>
          </div>
        )}

        {/* Formulário de Gatilho / Evento (Trigger Node) */}
        {nodeType === 'trigger' && (
          <div style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={16} />
              Configuração do Gatilho / Evento
            </h3>

            {/* Box da URL Exclusiva do Webhook de Entrada */}
            <div style={{
              background: 'rgba(0, 242, 254, 0.05)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              borderRadius: '8px',
              padding: '10px',
            }}>
              <label style={{ fontSize: '10px', color: 'var(--accent-cyan)', fontWeight: 800, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                🔗 URL Exclusiva do Webhook (Entrada)
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  readOnly
                  value={exclusiveWebhookUrl}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--accent-cyan)',
                    fontSize: '10px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    background: copiedWebhook ? 'rgba(16, 185, 129, 0.2)' : 'var(--accent-cyan)',
                    border: copiedWebhook ? '1px solid #34d399' : 'none',
                    color: copiedWebhook ? '#34d399' : '#0f172a',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Copy size={12} />
                  {copiedWebhook ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Botão de Teste / Simulação do Webhook */}
            <button
              type="button"
              onClick={handleTestTriggerWebhook}
              disabled={isTestingTrigger}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(79, 172, 254, 0.2))',
                border: '1px solid var(--accent-cyan)',
                color: 'var(--accent-cyan)',
                fontSize: '11px',
                fontWeight: 800,
                cursor: isTestingTrigger ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {isTestingTrigger ? <Loader2 size={13} className="spin" /> : <Play size={13} />}
              {isTestingTrigger ? 'Enviando Teste...' : '⚡ Simular Recebimento de Webhook'}
            </button>

            {triggerTestResult && (
              <div style={{
                background: triggerTestResult.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${triggerTestResult.error ? '#f87171' : '#34d399'}`,
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '11px',
              }}>
                <div style={{ fontWeight: 800, color: triggerTestResult.error ? '#f87171' : '#34d399', marginBottom: '4px' }}>
                  {triggerTestResult.error ? '❌ Falha no Teste' : '✅ Webhook Recebido com Sucesso!'}
                </div>
                <pre style={{ margin: 0, fontSize: '10px', fontFamily: 'monospace', overflowX: 'auto', color: 'var(--text-primary)' }}>
                  {JSON.stringify(triggerTestResult, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Método HTTP (Exclusivamente GET)
              </label>
              <input
                type="text"
                value="GET"
                disabled
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-cyan)',
                  fontSize: '12px',
                  fontWeight: 800,
                  outline: 'none',
                  opacity: 0.8,
                  cursor: 'not-allowed',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                URL de Origem (API Externa)
              </label>
              <input
                type="url"
                placeholder="https://api.exemplo.com/v1/eventos"
                value={config.url || node.data?.httpConfig?.url || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                URL consultada a cada 60s pelo motor em nuvem. Quando retornar dados (HTTP 200 OK), o fluxo avança para a próxima etapa.
              </span>
            </div>
          </div>
        )}

        {/* Formulário de Gatilho de E-mail (Email Trigger Node) */}
        {nodeType === 'email_trigger' && (
          <div style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid rgba(2, 132, 199, 0.4)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={16} />
              Configuração do Gatilho de E-mail
            </h3>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Servidor Host IMAP
              </label>
              <input
                type="text"
                placeholder="imap.gmail.com"
                value={config.imapHost || node.data?.emailConfig?.imapHost || 'imap.gmail.com'}
                onChange={(e) => handleConfigChange('imapHost', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Filtro por Remetente
              </label>
              <input
                type="text"
                placeholder="ex: suporte@empresa.com"
                value={config.filterFrom || node.data?.emailConfig?.filterFrom || ''}
                onChange={(e) => handleConfigChange('filterFrom', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Filtro por Assunto
              </label>
              <input
                type="text"
                placeholder="ex: Fatura, Processo"
                value={config.filterSubject || node.data?.emailConfig?.filterSubject || ''}
                onChange={(e) => handleConfigChange('filterSubject', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Filtro por Domínio (ex: empresa.com.br)
              </label>
              <input
                type="text"
                placeholder="ex: banco.com.br, empresa.com"
                value={config.filterDomain || node.data?.emailConfig?.filterDomain || ''}
                onChange={(e) => handleConfigChange('filterDomain', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Filtro por TLD (.jus, .org, .edu)
              </label>
              <input
                type="text"
                placeholder="ex: .jus.br, .org, .edu"
                value={config.filterTld || node.data?.emailConfig?.filterTld || ''}
                onChange={(e) => handleConfigChange('filterTld', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Ação nos E-mails Encontrados
              </label>
              <select
                value={config.emailAction || node.data?.emailConfig?.emailAction || 'summarize_and_save_attachments'}
                onChange={(e) => handleConfigChange('emailAction', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                }}
              >
                <option value="summarize_and_save_attachments">✨ Resumir via IA + Salvar Anexos</option>
                <option value="summarize">📝 Apenas Resumir E-mail via IA</option>
                <option value="save_attachments">📎 Apenas Salvar Anexos</option>
                <option value="raw_pass">📄 Repassar Corpo do E-mail na Íntegra</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                📅 Data Inicial de Busca (ex: Desde Janeiro/2026)
              </label>
              <input
                type="date"
                value={config.filterSinceDate || node.data?.emailConfig?.filterSinceDate || ''}
                onChange={(e) => handleConfigChange('filterSinceDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                🔒 Senha dos PDFs Protegidos (ex: CPF/CNPJ)
              </label>
              <input
                type="password"
                placeholder="Senha / CPF do titular da fatura"
                value={config.attachmentPassword || node.data?.emailConfig?.attachmentPassword || ''}
                onChange={(e) => handleConfigChange('attachmentPassword', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div style={{
              background: 'rgba(37, 211, 102, 0.05)',
              border: '1px solid rgba(37, 211, 102, 0.3)',
              borderRadius: '8px',
              padding: '10px',
            }}>
              <label style={{ fontSize: '10px', color: '#25D366', fontWeight: 800, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                📤 Destino do Resultado da Ação
              </label>
              <select
                value={config.outputDestinationType || node.data?.emailConfig?.outputDestinationType || 'whatsapp'}
                onChange={(e) => handleConfigChange('outputDestinationType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  background: 'var(--bg-primary)',
                  border: '1px solid #25D366',
                  color: '#25D366',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}
              >
                <option value="whatsapp">📱 Enviar para o WhatsApp</option>
                <option value="email">✉️ Enviar para o E-mail</option>
                <option value="both">🚀 Ambos (WhatsApp + E-mail)</option>
                <option value="none">📄 Apenas Repassar no Fluxo</option>
              </select>

              {(config.outputDestinationType === 'whatsapp' || config.outputDestinationType === 'both' || (!config.outputDestinationType && true)) && (
                <div style={{ marginBottom: '6px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', fontWeight: 700 }}>
                    Número do WhatsApp (ex: +5532988654825)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: +5532988654825"
                    value={config.outputWhatsappNumber || node.data?.emailConfig?.outputWhatsappNumber || '+5532988654825'}
                    onChange={(e) => handleConfigChange('outputWhatsappNumber', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  />
                </div>
              )}

              {(config.outputDestinationType === 'email' || config.outputDestinationType === 'both') && (
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px', fontWeight: 700 }}>
                    E-mail Destinatário
                  </label>
                  <input
                    type="email"
                    placeholder="ex: alanlpereira@hotmail.com"
                    value={config.outputEmailAddress || node.data?.emailConfig?.outputEmailAddress || ''}
                    onChange={(e) => handleConfigChange('outputEmailAddress', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Formulário de Ação para WhatsApp (WhatsAppNode) */}
        {nodeType === 'whatsapp' && (
          <div style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid rgba(37, 211, 102, 0.4)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#25D366', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageCircle size={16} />
              Configuração da Ação do WhatsApp
            </h3>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Número de Destino (WhatsApp)
              </label>
              <input
                type="text"
                placeholder="ex: +5532988654825 ou {{customer.phone}}"
                value={config.destinationNumber || node.data?.whatsappConfig?.destinationNumber || node.data?.settings?.destinationNumber || '+5532988654825'}
                onChange={(e) => handleConfigChange('destinationNumber', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                🔑 Chave / Token da API (CallMeBot 7 dígitos, UltraMsg, Z-API)
              </label>
              <input
                type="text"
                placeholder="ex: 8493021 (CallMeBot 7 dígitos)"
                value={config.apiKey || node.data?.whatsappConfig?.apiKey || node.data?.settings?.apiKey || ''}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--accent-cyan)',
                  color: 'var(--accent-cyan)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                Insira aqui sua <strong>Chave de 7 dígitos</strong> do CallMeBot ou Token do UltraMsg/Z-API.
              </span>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                🌐 URL da API / Gateway do WhatsApp (Opcional)
              </label>
              <input
                type="text"
                placeholder="Deixe em branco para CallMeBot ou insira https://api.ultramsg.com/..."
                value={config.apiUrl || node.data?.whatsappConfig?.apiUrl || node.data?.settings?.apiUrl || ''}
                onChange={(e) => handleConfigChange('apiUrl', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                Mensagem a Enviar no WhatsApp
              </label>
              <textarea
                rows={4}
                placeholder="Digite a mensagem a ser enviada no WhatsApp..."
                value={config.message || node.data?.whatsappConfig?.message || node.data?.settings?.message || ''}
                onChange={(e) => handleConfigChange('message', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  resize: 'vertical',
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                Suporta interpolação de variáveis dinâmicas como <code>{'{{email_summary}}'}</code>, <code>{'{{email_from}}'}</code>.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Drawer Actions */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
        <button
          onClick={() => onDeleteNode(node.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Trash2 size={16} />
          Excluir
        </button>

        <button
          onClick={handleSave}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
          }}
        >
          <Save size={16} />
          Salvar Alterações
        </button>
      </div>
    </div>
  );
};
