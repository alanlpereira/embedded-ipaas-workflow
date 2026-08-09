import React, { useState, useEffect } from 'react';
import { Globe, ShieldCheck, Play, X, Check, Loader2, Code, Zap, FileText, Trash2, Clock, Calendar, CheckSquare, Mail, Copy, Paperclip, Server, Filter, CheckCircle, ThumbsUp, ThumbsDown, Send, StopCircle, CircleDot, MessageCircle, MessageSquare, Lock } from 'lucide-react';
import { WorkflowNode, WorkflowNodeData, HttpNodeConfig, CredentialVaultItem, ScheduleNodeConfig, EmailTriggerConfig, EmailApprovalConfig, JumpNodeConfig, WhatsAppNodeConfig, TeamsNodeConfig } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { generateCronExpression, formatScheduleSummary } from '../utils/cronUtils';
import { getApiUrl } from '../lib/api';

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

  // Email Approval Action Configuration State
  const initialApproval: EmailApprovalConfig = node.data.approvalConfig || {
    recipients: 'corporativo@alp-nexus.com',
    subject: 'Aprovação Solicitada: Reembolso de Despesas #1024',
    message: 'Olá,\n\nUm novo processo requer sua aprovação. Por favor, revise os detalhes abaixo e clique em um dos botões para prosseguir com o fluxo.',
  };

  const [approvalRecipients, setApprovalRecipients] = useState(initialApproval.recipients || 'corporativo@alp-nexus.com');
  const [approvalSubject, setApprovalSubject] = useState(initialApproval.subject || 'Aprovação Solicitada');
  const [approvalMessage, setApprovalMessage] = useState(initialApproval.message || '');

  // Jump Connector Node Configuration State
  const initialJump: JumpNodeConfig = node.data.jumpConfig || { jumpId: '1' };
  const [jumpId, setJumpId] = useState(initialJump.jumpId || '1');

  // WhatsApp Action Configuration State
  const initialWhatsApp: WhatsAppNodeConfig = node.data.whatsappConfig || node.data.settings?.whatsappConfig || {
    destinationNumber: '+5511999998888',
    message: 'Olá {{email.from}}, seu pedido foi processado com sucesso!',
  };
  const [whatsappDestination, setWhatsappDestination] = useState(node.data.settings?.destinationNumber || initialWhatsApp.destinationNumber || '+5511999998888');
  const [whatsappMessage, setWhatsappMessage] = useState(node.data.settings?.message || initialWhatsApp.message || '');

  // MS Teams Action Configuration State
  const initialTeams: TeamsNodeConfig = node.data.teamsConfig || node.data.settings?.teamsConfig || {
    webhookUrl: 'https://outlook.office.com/webhook/v2/...',
    cardMessage: '🔔 Alerta de Fluxo Synapse\n\nUm evento foi disparado pelo usuário {{email.from}}.',
  };
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState(node.data.settings?.webhookUrl || initialTeams.webhookUrl || '');
  const [teamsCardMessage, setTeamsCardMessage] = useState(node.data.settings?.cardMessage || initialTeams.cardMessage || '');

  // State para carregamento de credenciais do Cofre
  const [vaultCredentials, setVaultCredentials] = useState<CredentialVaultItem[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const isHttpNode = node.type === 'http' || node.data.type === 'http' || (node.data.label && node.data.label.toLowerCase().includes('http'));
  const isScheduleNode = node.type === 'schedule' || node.data.type === 'schedule' || (node.data.label && node.data.label.toLowerCase().includes('agendamento'));
  const isEmailTriggerNode = node.type === 'email_trigger' || node.data.type === 'email_trigger' || (node.data.label && node.data.label.toLowerCase().includes('gatilho de e-mail'));
  const isEmailApprovalNode = node.type === 'email_approval' || node.data.type === 'email_approval' || (node.data.label && node.data.label.toLowerCase().includes('aprovação por e-mail'));
  const isJumpNode = node.type === 'jump' || node.data.type === 'jump' || (node.data.label && node.data.label.toLowerCase().includes('salto'));
  const isEndNode = node.type === 'end' || node.data.type === 'end' || (node.data.label && node.data.label.toLowerCase().includes('fim'));
  const isWhatsAppNode = node.type === 'whatsapp' || node.data.type === 'whatsapp' || (node.data.label && node.data.label.toLowerCase().includes('whatsapp'));
  const isTeamsNode = node.type === 'teams' || node.data.type === 'teams' || (node.data.label && node.data.label.toLowerCase().includes('teams'));

  useEffect(() => {
    fetch(getApiUrl('/api/v1/vault/credentials'))
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
      const res = await fetch(getApiUrl('/api/v1/vault/execute-http'), {
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

    if (isEmailApprovalNode && !approvalRecipients.trim()) {
      alert('O campo Destinatário é obrigatório na Aprovação por E-mail.');
      return;
    }

    if (isTeamsNode && !teamsWebhookUrl.trim()) {
      alert('O campo Webhook URL é obrigatório no MS Teams.');
      return;
    }

    const emailApprovalConfig = {
      sender: 'corporativo@alp-nexus.com',
      to: approvalRecipients.trim(),
      recipients: approvalRecipients.trim(),
      subject: approvalSubject.trim(),
      message: approvalMessage,
    };

    const teamsConfigClean = {
      webhookUrl: teamsWebhookUrl.trim(),
      message: teamsCardMessage,
      cardMessage: teamsCardMessage,
    };

    const scheduleConfigClean = {
      cron: computedCron,
      recurrenceType,
      time: scheduleTime,
      daysOfWeek,
      dayOfMonth: scheduleDayOfMonth,
    };

    const approvalOutputs = [
      { key: 'approval.status', label: 'Status (approval.status)', type: 'string' },
      { key: 'approval.responder_email', label: 'E-mail Aprovador (approval.responder_email)', type: 'string' },
      { key: 'approval.timestamp', label: 'Data/Hora (approval.timestamp)', type: 'string' },
    ];

    const updatedWhatsAppConfig: WhatsAppNodeConfig = {
      destinationNumber: whatsappDestination,
      message: whatsappMessage,
    };

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
    } else if (isEmailApprovalNode) {
      finalDescription = `Para: ${approvalRecipients.trim() || 'corporativo@alp-nexus.com'}`;
    } else if (isJumpNode) {
      finalDescription = `Salto / Recomeço #${jumpId}`;
    } else if (isEndNode) {
      finalDescription = 'Encerramento definitivo do fluxo';
    } else if (isWhatsAppNode) {
      finalDescription = `Para: ${whatsappDestination || '+55...'}`;
    } else if (isTeamsNode) {
      finalDescription = teamsWebhookUrl ? `Teams Webhook: ${teamsWebhookUrl.slice(0, 24)}...` : 'Canal MS Teams';
    }

    const updatedSettings = {
      ...(node.data.settings || {}),
      ...(isWhatsAppNode ? { destinationNumber: whatsappDestination, message: whatsappMessage } : {}),
      ...(isTeamsNode ? teamsConfigClean : {}),
    };

    const newConfig = {
      ...(node.data.config || {}),
      ...(isEmailApprovalNode ? emailApprovalConfig : {}),
      ...(isTeamsNode ? teamsConfigClean : {}),
      ...(isScheduleNode ? scheduleConfigClean : {}),
    };

    const updatedData: WorkflowNodeData = {
      ...node.data,
      label,
      description: finalDescription,
      swapOutputs,
      settings: updatedSettings,
      config: newConfig,
      approvalConfig: isEmailApprovalNode ? emailApprovalConfig : node.data.approvalConfig,
      httpConfig: isHttpNode ? {
        method: httpMethod,
        url,
        credential_id: credentialId,
        headers: headersText,
        body: bodyText,
      } : node.data.httpConfig,
      scheduleConfig: isScheduleNode ? updatedScheduleConfig : node.data.scheduleConfig,
      emailConfig: isEmailTriggerNode ? updatedEmailConfig : node.data.emailConfig,
      jumpConfig: isJumpNode ? { jumpId } : node.data.jumpConfig,
      whatsappConfig: isWhatsAppNode ? updatedWhatsAppConfig : node.data.whatsappConfig,
      teamsConfig: isTeamsNode ? teamsConfigClean : node.data.teamsConfig,
      cronExpression: isScheduleNode ? computedCron : node.data.cronExpression,
      outputs: isEmailApprovalNode
        ? approvalOutputs
        : isEmailTriggerNode
        ? emailOutputs
        : node.data.outputs,
    };

    const updated: WorkflowNode = {
      ...node,
      data: updatedData,
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

        {/* Formulário Específico da Ação de Aprovação por E-mail (Email Approval Node) */}
        {isEmailApprovalNode && (
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '16px',
            padding: '18px',
            marginBottom: '20px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#34d399', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} />
              Configuração da Aprovação por E-mail
            </h3>

            {/* 1) Campo Remetente (Read-only / Travado) */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
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
                    padding: '9px 11px 9px 36px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                  }}
                />
                <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '11px' }} />
              </div>
            </div>

            {/* 2) Campo Destinatário (Obrigatório) */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                <span>Destinatário(s) da Aprovação <strong style={{ color: '#ef4444' }}>* (Obrigatório)</strong></span>
              </label>
              <input
                type="email"
                placeholder="ex: diretoria@empresa.com, {{email.from}}"
                value={approvalRecipients}
                onChange={(e) => setApprovalRecipients(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: !approvalRecipients.trim() ? '1px solid #ef4444' : '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              {!approvalRecipients.trim() ? (
                <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'block', fontWeight: 700 }}>
                  ⚠️ O campo Destinatário é obrigatório! Informe um e-mail válido ou variável.
                </span>
              ) : (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Aceita múltiplos e-mails separados por vírgula e interpolação de variáveis como <code>{'{{email.from}}'}</code>.
                </span>
              )}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                Assunto do E-mail de Aprovação
              </label>
              <input
                type="text"
                placeholder="ex: Aprovação Solicitada: Reembolso #1024"
                value={approvalSubject}
                onChange={(e) => setApprovalSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                Mensagem Contextual
              </label>
              <textarea
                rows={3}
                placeholder="Explique o contexto do pedido de aprovação..."
                value={approvalMessage}
                onChange={(e) => setApprovalMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* 4) Preview do E-mail */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#34d399', marginBottom: '8px', fontWeight: 800, textTransform: 'uppercase' }}>
                Preview Interativo do E-mail Enviado ao Aprovador
              </label>
              <div style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}>
                <div style={{ borderBottom: '1px solid #334155', marginBottom: '12px', paddingBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                    <strong>Para:</strong> <span style={{ color: '#38bdf8' }}>{approvalRecipients || 'diretoria@empresa.com'}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 800 }}>
                    {approvalSubject || 'Solicitação de Aprovação'}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
                  {approvalMessage || 'Mensagem de contextualização...'}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <div style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#10b981',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '12px',
                    textAlign: 'center',
                    cursor: 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                  }}>
                    <ThumbsUp size={14} />
                    APROVAR
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '12px',
                    textAlign: 'center',
                    cursor: 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                  }}>
                    <ThumbsDown size={14} />
                    REJEITAR
                  </div>
                </div>
              </div>
            </div>

            {/* 5) Mapeamento de Variáveis de Saída */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px dashed rgba(16, 185, 129, 0.4)',
              borderRadius: '12px',
              padding: '12px 14px',
            }}>
              <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 800, display: 'block', marginBottom: '8px' }}>
                ⚡ Variáveis de Saída Disponibilizadas para o Fluxo (data.outputs):
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                <code style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '4px 6px', borderRadius: '6px' }}>
                  <strong>approval.status</strong> ('approved'/'rejected')
                </code>
                <code style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '4px 6px', borderRadius: '6px' }}>
                  <strong>approval.responder_email</strong>
                </code>
                <code style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '4px 6px', borderRadius: '6px' }}>
                  <strong>approval.timestamp</strong>
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Formulário do Conector de Salto Numérico (Jump Node) */}
        {isJumpNode && (
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            borderRadius: '16px',
            padding: '18px',
            marginBottom: '20px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#fef08a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CircleDot size={18} color="#eab308" />
              Configuração do Conector de Salto Numérico
            </h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                Número ou Identificador do Salto (Ex: 1, 2, 3 ou A)
              </label>
              <input
                type="text"
                placeholder="ex: 1"
                value={jumpId}
                onChange={(e) => setJumpId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: '#fef08a',
                  fontSize: '14px',
                  fontWeight: 900,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'block', lineHeight: '1.4' }}>
                💡 <strong>Como funciona:</strong> Se um fluxo atinge esta caixa circular com o número <strong>{jumpId}</strong>, ele é direcionado para recomeçar em qualquer outra caixa circular que possua este mesmo número <strong>{jumpId}</strong> no mapa do fluxo.
              </span>
            </div>
          </div>
        )}

        {/* Formulário de Ação para WhatsApp (WhatsAppNode) */}
        {isWhatsAppNode && (
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid rgba(37, 211, 102, 0.4)',
            borderRadius: '16px',
            padding: '18px',
            marginBottom: '20px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#25D366', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={18} />
              Configuração da Ação do WhatsApp
            </h3>
            <p style={{ fontSize: '11px', color: '#86efac', marginBottom: '14px', fontWeight: 600 }}>
              ⚠️ Requer configuração de Token da API Oficial na aba de Configurações da Conta.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                Número de Destino (com Código do País ou Variável)
              </label>
              <input
                type="text"
                placeholder="ex: +5511999998888 ou {{customer.phone}}"
                value={whatsappDestination}
                onChange={(e) => setWhatsappDestination(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Suporta números estáticos no formato internacional E.164 ou interpolação de variáveis ex: <code>{'{{customer.phone}}'}</code>.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                Mensagem do WhatsApp
              </label>
              <textarea
                rows={4}
                placeholder="Digite a mensagem a ser enviada no WhatsApp..."
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Aceita interpolação de variáveis dinâmicas do fluxo como <code>{'{{email.from}}'}</code>, <code>{'{{email.subject}}'}</code>, etc.
              </span>
            </div>
          </div>
        )}

        {/* Formulário de Ação para MS Teams (TeamsNode) */}
        {isTeamsNode && (
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid rgba(98, 100, 167, 0.4)',
            borderRadius: '16px',
            padding: '18px',
            marginBottom: '20px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#a5b4fc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="#6264A7" />
              Configuração da Ação para MS Teams
            </h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                Webhook URL do Canal MS Teams
              </label>
              <input
                type="text"
                placeholder="https://outlook.office.com/webhook/v2/..."
                value={teamsWebhookUrl}
                onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Cole a URL do Conector de Webhook do canal no Microsoft Teams.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                Mensagem do Cartão
              </label>
              <textarea
                rows={4}
                placeholder="Digite o conteúdo da mensagem do cartão..."
                value={teamsCardMessage}
                onChange={(e) => setTeamsCardMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
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
