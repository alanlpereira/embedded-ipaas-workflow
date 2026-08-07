import React, { useState, useEffect } from 'react';
import { Globe, ShieldCheck, Play, X, Check, Loader2, Code, Zap, FileText, Trash2, Clock, Calendar, CheckSquare, Mail, Copy, Paperclip, Server, Filter } from 'lucide-react';
import { WorkflowNode, HttpNodeConfig, CredentialVaultItem, ScheduleNodeConfig, EmailTriggerConfig } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { generateCronExpression, formatScheduleSummary } from '../utils/cronUtils';

interface NodeConfigModalProps {
  node: WorkflowNode | null;
  onSave: (updatedNode: WorkflowNode) => void;
  onDelete?: (nodeId: string) => void;
  onClose: () => void;
}

export const NodeConfigModal: React.FC<NodeConfigModalProps> = ({ node, onSave, onDelete, onClose }) => {
  const { t, language } = useLanguage();
  if (!node) return null;

  const [label, setLabel] = useState(node.data.label || '');
  const [description, setDescription] = useState(node.data.description || '');
  const [swapOutputs, setSwapOutputs] = useState(Boolean(node.data.swapOutputs));

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

  // Schedule Configuration State
  const initialSchedule: ScheduleNodeConfig = node.data.scheduleConfig || {
    recurrenceType: 'daily',
    time: '09:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    dayOfMonth: 1,
    cronExpression: '0 9 * * 1-5',
  };

  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly'>(initialSchedule.recurrenceType || 'daily');
  const [scheduleTime, setScheduleTime] = useState(initialSchedule.time || '09:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initialSchedule.daysOfWeek || [1, 2, 3, 4, 5]);
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState<number>(initialSchedule.dayOfMonth || 1);

  // Email Trigger Configuration State
  const generatedInboundEmail = `flow-${node.id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 16)}@inbound.synapse.com`;

  const initialEmail: EmailTriggerConfig = node.data.emailConfig || {
    mode: 'synapse_inbound',
    inboundEmail: generatedInboundEmail,
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapUser: '',
    imapPass: '',
    filterSubject: '',
    filterFrom: '',
    onlyWithAttachments: false,
  };

  const [emailMode, setEmailMode] = useState<'synapse_inbound' | 'custom_imap'>(initialEmail.mode || 'synapse_inbound');
  const [inboundEmail, setInboundEmail] = useState(initialEmail.inboundEmail || generatedInboundEmail);
  const [imapHost, setImapHost] = useState(initialEmail.imapHost || 'imap.gmail.com');
  const [imapPort, setImapPort] = useState(initialEmail.imapPort || 993);
  const [imapUser, setImapUser] = useState(initialEmail.imapUser || '');
  const [imapPass, setImapPass] = useState(initialEmail.imapPass || '');
  const [filterSubject, setFilterSubject] = useState(initialEmail.filterSubject || '');
  const [filterFrom, setFilterFrom] = useState(initialEmail.filterFrom || '');
  const [onlyWithAttachments, setOnlyWithAttachments] = useState(Boolean(initialEmail.onlyWithAttachments));
  const [copiedInbound, setCopiedInbound] = useState(false);

  // State para carregamento de credenciais do Cofre
  const [vaultCredentials, setVaultCredentials] = useState<CredentialVaultItem[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const isHttpNode = node.type === 'http' || node.data.type === 'http' || (node.data.label && node.data.label.toLowerCase().includes('http'));
  const isScheduleNode = node.type === 'schedule' || node.data.type === 'schedule' || (node.data.label && node.data.label.toLowerCase().includes('agendamento'));
  const isEmailTriggerNode = node.type === 'email_trigger' || node.data.type === 'email_trigger' || (node.data.label && node.data.label.toLowerCase().includes('e-mail'));

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
    const computedCron = generateCronExpression({
      recurrenceType,
      time: scheduleTime,
      daysOfWeek,
      dayOfMonth: scheduleDayOfMonth,
    });

    const updatedScheduleConfig: ScheduleNodeConfig = {
      recurrenceType,
      time: scheduleTime,
      daysOfWeek,
      dayOfMonth: scheduleDayOfMonth,
      cronExpression: computedCron,
    };

    const updatedEmailConfig: EmailTriggerConfig = {
      mode: emailMode,
      inboundEmail,
      imapHost,
      imapPort,
      imapUser,
      imapPass,
      filterSubject,
      filterFrom,
      onlyWithAttachments,
    };

    const emailOutputs = [
      { key: 'email.from', label: 'Remetente (email.from)', type: 'string' },
      { key: 'email.subject', label: 'Assunto (email.subject)', type: 'string' },
      { key: 'email.body', label: 'Corpo do E-mail (email.body)', type: 'string' },
      { key: 'email.attachments', label: 'Lista de Anexos (email.attachments)', type: 'array' },
    ];

    let finalDescription = description;
    if (isScheduleNode) {
      finalDescription = formatScheduleSummary(updatedScheduleConfig, language);
    } else if (isEmailTriggerNode) {
      if (filterSubject) {
        finalDescription = `Filtro: Assunto contém '${filterSubject}'`;
      } else if (filterFrom) {
        finalDescription = `Filtro: Remetente '${filterFrom}'`;
      } else if (emailMode === 'custom_imap') {
        finalDescription = `IMAP: ${imapHost}`;
      } else {
        finalDescription = `Inbound: ${inboundEmail}`;
      }
    }

    const updated: WorkflowNode = {
      ...node,
      data: {
        ...node.data,
        label,
        description: finalDescription,
        swapOutputs,
        httpConfig: isHttpNode ? {
          method: httpMethod,
          url,
          credential_id: credentialId,
          headers: headersText,
          body: bodyText,
        } : node.data.httpConfig,
        scheduleConfig: isScheduleNode ? updatedScheduleConfig : node.data.scheduleConfig,
        emailConfig: isEmailTriggerNode ? updatedEmailConfig : node.data.emailConfig,
        cronExpression: isScheduleNode ? computedCron : node.data.cronExpression,
        outputs: isEmailTriggerNode ? emailOutputs : node.data.outputs,
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

        {/* Configuração de Posição Sim/Não para Nó de Decisão */}
        {node.data.type === 'decision' && (
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                Inverter Posições das Saídas (Sim / Não)
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {swapOutputs ? 'Esquerda: Não | Direita: Sim' : 'Esquerda: Sim | Direita: Não'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSwapOutputs(!swapOutputs)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: swapOutputs ? 'rgba(0, 242, 254, 0.2)' : 'var(--bg-tertiary)',
                border: swapOutputs ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                color: swapOutputs ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {swapOutputs ? 'Invertido' : 'Padrão'}
            </button>
          </div>
        )}

        {/* Formulário Específico do Gatilho de Agendamento (Schedule Node) */}
        {isScheduleNode && (
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '16px',
            padding: '18px',
            marginBottom: '20px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#a78bfa', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} />
              Configuração do Agendamento Recorrente
            </h3>

            {/* Seletor de Tipo de Recorrência (3 Abas / Botões) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
                Frequência de Recorrência
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {(['daily', 'weekly', 'monthly'] as const).map((type) => {
                  const isSelected = recurrenceType === type;
                  const labels = {
                    daily: language === 'en' ? 'Daily' : 'Diário',
                    weekly: language === 'en' ? 'Weekly' : 'Semanal',
                    monthly: language === 'en' ? 'Monthly' : 'Mensal',
                  };
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setRecurrenceType(type)}
                      style={{
                        padding: '9px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(139, 92, 246, 0.25)' : 'var(--bg-tertiary)',
                        border: isSelected ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seleção de Horário (HH:MM) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700 }}>
                Horário de Execução (HH:MM)
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
            </div>

            {/* Seção Específica para SEMANAL (Checkboxes dos dias da semana: Dom-Sáb) */}
            {recurrenceType === 'weekly' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700 }}>
                  Dias da Semana
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 0, label: 'Dom' },
                    { id: 1, label: 'Seg' },
                    { id: 2, label: 'Ter' },
                    { id: 3, label: 'Qua' },
                    { id: 4, label: 'Qui' },
                    { id: 5, label: 'Sex' },
                    { id: 6, label: 'Sáb' },
                  ].map((day) => {
                    const isChecked = daysOfWeek.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setDaysOfWeek(daysOfWeek.filter((d) => d !== day.id));
                          } else {
                            setDaysOfWeek([...daysOfWeek, day.id].sort());
                          }
                        }}
                        style={{
                          flex: 1,
                          minWidth: '40px',
                          padding: '8px 4px',
                          borderRadius: '8px',
                          background: isChecked ? '#8b5cf6' : 'var(--bg-tertiary)',
                          border: isChecked ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                          color: isChecked ? '#ffffff' : 'var(--text-secondary)',
                          fontWeight: 800,
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seção Específica para MENSAL (Dia do Mês de 1 a 31) */}
            {recurrenceType === 'monthly' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700 }}>
                  Dia do Mês (1 a 31)
                </label>
                <select
                  value={scheduleDayOfMonth}
                  onChange={(e) => setScheduleDayOfMonth(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Dia {day}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Preview da Expressão Cron Gerada */}
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px dashed rgba(139, 92, 246, 0.4)',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Expressão Cron Gerada:
              </span>
              <code style={{ fontSize: '12px', fontWeight: 800, color: '#a78bfa', fontFamily: 'monospace' }}>
                {generateCronExpression({ recurrenceType, time: scheduleTime, daysOfWeek, dayOfMonth: scheduleDayOfMonth })}
              </code>
            </div>
          </div>
        )}

        {/* Formulário Específico do Gatilho de E-mail (Email Trigger Node) */}
        {isEmailTriggerNode && (
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid rgba(2, 132, 199, 0.4)',
            borderRadius: '16px',
            padding: '18px',
            marginBottom: '20px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} />
              Configuração do Gatilho de E-mail
            </h3>

            {/* a) Modo de Recebimento */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
                Modo de Recebimento
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEmailMode('synapse_inbound')}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    background: emailMode === 'synapse_inbound' ? 'rgba(2, 132, 199, 0.25)' : 'var(--bg-tertiary)',
                    border: emailMode === 'synapse_inbound' ? '2px solid #0284c7' : '1px solid var(--border-color)',
                    color: emailMode === 'synapse_inbound' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: emailMode === 'synapse_inbound' ? 800 : 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Mail size={14} />
                  E-mail Único do Fluxo
                </button>
                <button
                  type="button"
                  onClick={() => setEmailMode('custom_imap')}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    background: emailMode === 'custom_imap' ? 'rgba(2, 132, 199, 0.25)' : 'var(--bg-tertiary)',
                    border: emailMode === 'custom_imap' ? '2px solid #0284c7' : '1px solid var(--border-color)',
                    color: emailMode === 'custom_imap' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: emailMode === 'custom_imap' ? 800 : 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Server size={14} />
                  Servidor IMAP / Personalizado
                </button>
              </div>
            </div>

            {/* Painel do Modo: E-mail Único do Fluxo */}
            {emailMode === 'synapse_inbound' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700 }}>
                  Endereço de E-mail Dedicado do Fluxo (Inbound Address)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={inboundEmail}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: '#38bdf8',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none',
                      fontFamily: 'monospace',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inboundEmail);
                      setCopiedInbound(true);
                      setTimeout(() => setCopiedInbound(false), 2000);
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: copiedInbound ? '#10b981' : 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {copiedInbound ? <Check size={14} /> : <Copy size={14} />}
                    {copiedInbound ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Envie ou redirecione qualquer e-mail para este endereço para disparar este fluxo instantaneamente.
                </span>
              </div>
            )}

            {/* Painel do Modo: Servidor IMAP Personalizado */}
            {emailMode === 'custom_imap' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                    Servidor Host IMAP
                  </label>
                  <input
                    type="text"
                    placeholder="imap.gmail.com"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                    Porta SSL/TLS
                  </label>
                  <input
                    type="number"
                    value={imapPort}
                    onChange={(e) => setImapPort(parseInt(e.target.value, 10) || 993)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                    Usuário / E-mail
                  </label>
                  <input
                    type="text"
                    placeholder="suporte@empresa.com"
                    value={imapUser}
                    onChange={(e) => setImapUser(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                    Senha / App Key
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={imapPass}
                    onChange={(e) => setImapPass(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>
            )}

            {/* b) Filtros de Entrada */}
            <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ fontSize: '11px', color: '#38bdf8', marginBottom: '10px', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={14} />
                Filtros de Entrada de E-mail
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                    Assunto contém
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Fatura, Pedido"
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                    Remetente contém
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: @empresa.com"
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              {/* Checkbox Apenas E-mails com Anexo */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={onlyWithAttachments}
                  onChange={(e) => setOnlyWithAttachments(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#0284c7', cursor: 'pointer' }}
                />
                <Paperclip size={14} color="#38bdf8" />
                Disparar apenas para e-mails com anexo
              </label>
            </div>

            {/* 3) Mapeamento de Variáveis de Saída */}
            <div style={{
              background: 'rgba(2, 132, 199, 0.1)',
              border: '1px dashed rgba(2, 132, 199, 0.4)',
              borderRadius: '12px',
              padding: '12px 14px',
            }}>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800, display: 'block', marginBottom: '8px' }}>
                ⚡ Variáveis de Saída Disponibilizadas para o Fluxo (data.outputs):
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <code style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '6px' }}>
                  <strong>email.from</strong> (Remetente)
                </code>
                <code style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '6px' }}>
                  <strong>email.subject</strong> (Assunto)
                </code>
                <code style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '6px' }}>
                  <strong>email.body</strong> (Corpo E-mail)
                </code>
                <code style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '6px' }}>
                  <strong>email.attachments</strong> (Anexos)
                </code>
              </div>
            </div>
          </div>
        )}

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
