import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, Play, GitFork, UserCheck, Send, AlertTriangle, Code2, Video, Globe, ArrowLeftRight, Clock, Mail, CheckCircle, StopCircle, CircleDot, MessageCircle, MessageSquare } from 'lucide-react';
import { NodeType, WorkflowNodeData } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { formatScheduleSummary } from '../utils/cronUtils';

interface NodeColorConfig {
  bg: string;
  border: string;
  headerBg: string;
  iconColor: string;
  Icon: React.ElementType;
}

const nodeTypeConfigs: Record<NodeType, NodeColorConfig> = {
  trigger: {
    bg: 'rgba(16, 185, 129, 0.05)',
    border: '#10b981',
    headerBg: 'rgba(16, 185, 129, 0.15)',
    iconColor: '#10b981',
    Icon: Zap,
  },
  action: {
    bg: 'rgba(59, 130, 246, 0.05)',
    border: '#3b82f6',
    headerBg: 'rgba(59, 130, 246, 0.15)',
    iconColor: '#3b82f6',
    Icon: Play,
  },
  decision: {
    bg: 'rgba(245, 158, 11, 0.05)',
    border: '#f59e0b',
    headerBg: 'rgba(245, 158, 11, 0.15)',
    iconColor: '#f59e0b',
    Icon: GitFork,
  },
  approval: {
    bg: 'rgba(249, 115, 22, 0.05)',
    border: '#f97316',
    headerBg: 'rgba(249, 115, 22, 0.15)',
    iconColor: '#f97316',
    Icon: UserCheck,
  },
  output: {
    bg: 'rgba(168, 85, 247, 0.05)',
    border: '#a855f7',
    headerBg: 'rgba(168, 85, 247, 0.15)',
    iconColor: '#a855f7',
    Icon: Send,
  },
  code: {
    bg: 'rgba(6, 182, 212, 0.05)',
    border: '#06b6d4',
    headerBg: 'rgba(6, 182, 212, 0.15)',
    iconColor: '#06b6d4',
    Icon: Code2,
  },
  media: {
    bg: 'rgba(217, 70, 239, 0.05)',
    border: '#d946ef',
    headerBg: 'rgba(217, 70, 239, 0.15)',
    iconColor: '#d946ef',
    Icon: Video,
  },
  http: {
    bg: 'rgba(0, 242, 254, 0.05)',
    border: '#00f2fe',
    headerBg: 'rgba(0, 242, 254, 0.15)',
    iconColor: '#00f2fe',
    Icon: Globe,
  },
  schedule: {
    bg: 'rgba(139, 92, 246, 0.05)',
    border: '#8b5cf6',
    headerBg: 'rgba(139, 92, 246, 0.15)',
    iconColor: '#8b5cf6',
    Icon: Clock,
  },
  email_trigger: {
    bg: 'rgba(2, 132, 199, 0.05)',
    border: '#0284c7',
    headerBg: 'rgba(2, 132, 199, 0.15)',
    iconColor: '#0284c7',
    Icon: Mail,
  },
  email_approval: {
    bg: 'rgba(16, 185, 129, 0.05)',
    border: '#10b981',
    headerBg: 'rgba(16, 185, 129, 0.15)',
    iconColor: '#10b981',
    Icon: CheckCircle,
  },
  whatsapp: {
    bg: 'rgba(37, 211, 102, 0.05)',
    border: '#25D366',
    headerBg: 'rgba(37, 211, 102, 0.15)',
    iconColor: '#25D366',
    Icon: MessageCircle,
  },
  teams: {
    bg: 'rgba(98, 100, 167, 0.05)',
    border: '#6264A7',
    headerBg: 'rgba(98, 100, 167, 0.18)',
    iconColor: '#6264A7',
    Icon: MessageSquare,
  },
  jump: {
    bg: 'rgba(234, 179, 8, 0.08)',
    border: '#eab308',
    headerBg: 'rgba(234, 179, 8, 0.2)',
    iconColor: '#eab308',
    Icon: CircleDot,
  },
  end: {
    bg: 'rgba(239, 68, 68, 0.08)',
    border: '#ef4444',
    headerBg: 'rgba(239, 68, 68, 0.2)',
    iconColor: '#ef4444',
    Icon: StopCircle,
  },
};

export const CustomNode: React.FC<NodeProps<any>> = memo(({ id, data, selected }) => {
  const { language } = useLanguage();
  const nodeData = data as WorkflowNodeData;
  const nodeType = nodeData.type || 'action';
  const config = nodeTypeConfigs[nodeType] || nodeTypeConfigs.action;
  const Icon = config.Icon;

  const isDecision = nodeType === 'decision';
  const isDebugFailed = data.isDebugFailed;
  const errorMessage = data.errorMessage;

  return (
    <div
      style={{
        width: isDecision ? '200px' : '220px',
        padding: '12px',
        borderRadius: isDecision ? '16px' : '12px',
        background: isDebugFailed ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        border: isDebugFailed
          ? '2px solid #ef4444'
          : selected
          ? `2px solid ${config.border}`
          : '1px solid var(--border-color)',
        boxShadow: isDebugFailed
          ? '0 0 20px rgba(239, 68, 68, 0.6)'
          : selected
          ? `0 0 20px ${config.border}40`
          : '0 8px 32px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
      }}
    >
      {/* Tooltip Flutuante de Erro em Modo Debug */}
      {isDebugFailed && (
        <div
          style={{
            position: 'absolute',
            bottom: '108%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ef4444',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.5)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AlertTriangle size={14} color="#ffffff" />
          <span>{errorMessage || 'HTTP 500 Error'}</span>
        </div>
      )}

      {/* Handles de Entrada e Saída com Hitbox Expandido */}
      {nodeType !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: isDebugFailed ? '#ef4444' : config.border,
            width: '16px',
            height: '16px',
            border: '2px solid var(--bg-primary)',
            borderRadius: '50%',
            cursor: 'crosshair',
          }}
        />
      )}

      {/* Header do Nó */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: isDebugFailed ? 'rgba(239, 68, 68, 0.2)' : config.headerBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={16} color={isDebugFailed ? '#ef4444' : config.iconColor} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nodeData.label}
          </span>
          <span
            style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {nodeType}
          </span>
        </div>
      </div>

      {/* Descrição do Nó */}
      {nodeData.description && (
        <p
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            lineHeight: '1.3',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {nodeData.description}
        </p>
      )}

      {/* Badge de Agendamento Cron */}
      {nodeType === 'schedule' && (
        <div style={{
          marginTop: '6px',
          padding: '4px 8px',
          borderRadius: '6px',
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          color: '#a78bfa',
          fontSize: '10px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <Clock size={12} />
          <span>{nodeData.config?.cron ? `Cron: ${nodeData.config.cron}` : formatScheduleSummary(nodeData.scheduleConfig, language)}</span>
        </div>
      )}

      {/* Badge de Gatilho de E-mail */}
      {nodeType === 'email_trigger' && (() => {
        const emailCfg = nodeData.emailConfig;
        let badgeText = 'Inbound: flow-auto@inbound.synapse.com';
        if (emailCfg) {
          if (emailCfg.filterSubject) {
            badgeText = `Filtro: Assunto contém '${emailCfg.filterSubject}'`;
          } else if (emailCfg.filterFrom) {
            badgeText = `Filtro: Remetente '${emailCfg.filterFrom}'`;
          } else if (emailCfg.mode === 'custom_imap') {
            badgeText = `IMAP: ${emailCfg.imapHost || 'Servidor'}`;
          } else if (emailCfg.inboundEmail) {
            badgeText = `Inbound: ${emailCfg.inboundEmail}`;
          }
        }
        return (
          <div style={{
            marginTop: '6px',
            padding: '4px 8px',
            borderRadius: '6px',
            background: 'rgba(2, 132, 199, 0.15)',
            border: '1px solid rgba(2, 132, 199, 0.4)',
            color: '#38bdf8',
            fontSize: '10px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            <Mail size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{badgeText}</span>
          </div>
        );
      })()}

      {/* Badge de Aprovação por E-mail */}
      {(nodeType === 'email_approval' || nodeType === 'approval') && (() => {
        const appCfg: any = nodeData.config || nodeData.approvalConfig || {};
        const sender = appCfg.sender || 'corporativo@alp-nexus.com';
        const recipients = appCfg.to || appCfg.recipients || 'corporativo@alp-nexus.com';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
            <div style={{
              padding: '3px 7px',
              borderRadius: '5px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              fontSize: '9px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              <span>De: <strong>{sender}</strong></span>
            </div>

            <div style={{
              padding: '3px 7px',
              borderRadius: '5px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: '9.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              <CheckCircle size={11} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Para: <strong>{recipients}</strong></span>
            </div>
          </div>
        );
      })()}

      {/* Badge de WhatsApp */}
      {nodeType === 'whatsapp' && (() => {
        const dest = nodeData.whatsappConfig?.destinationNumber || nodeData.settings?.destinationNumber || '+5511999998888';
        return (
          <div style={{
            marginTop: '6px',
            padding: '4px 8px',
            borderRadius: '6px',
            background: 'rgba(37, 211, 102, 0.15)',
            border: '1px solid rgba(37, 211, 102, 0.4)',
            color: '#25D366',
            fontSize: '10px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            <MessageCircle size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Para: {dest}</span>
          </div>
        );
      })()}

      {/* Badge de MS Teams */}
      {nodeType === 'teams' && (() => {
        const url = nodeData.config?.webhookUrl || nodeData.teamsConfig?.webhookUrl || nodeData.settings?.webhookUrl || '';
        const shortUrl = url ? url.replace('https://', '').slice(0, 22) + '...' : 'Canal Webhook MS Teams';
        return (
          <div style={{
            marginTop: '6px',
            padding: '4px 8px',
            borderRadius: '6px',
            background: 'rgba(98, 100, 167, 0.15)',
            border: '1px solid rgba(98, 100, 167, 0.4)',
            color: '#a5b4fc',
            fontSize: '10px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            <MessageSquare size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortUrl}</span>
          </div>
        );
      })()}

      {/* Badge do Conector de Salto Numérico */}
      {nodeType === 'jump' && (() => {
        const jumpId = nodeData.jumpConfig?.jumpId || '1';
        return (
          <div style={{
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #eab308, #ca8a04)',
              color: '#000000',
              fontWeight: 900,
              fontSize: '17px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(234, 179, 8, 0.5)',
              border: '2px solid #ffffff',
            }}>
              {jumpId}
            </div>
            <span style={{ fontSize: '11px', color: '#fef08a', fontWeight: 800 }}>
              Salto #{jumpId}
            </span>
          </div>
        );
      })()}

      {/* Output Handles Específicos para Nó de Decisão / Aprovação com suporte a inversão de posições */}
      {(isDecision || nodeType === 'email_approval') ? (() => {
        const isSwapped = Boolean(nodeData.swapOutputs);
        const isEmailApp = nodeType === 'email_approval';

        const posLabelName = isEmailApp
          ? (language === 'en' ? 'Approved' : 'Aprovado')
          : (language === 'en' ? 'Yes' : 'Sim');
        const negLabelName = isEmailApp
          ? (language === 'en' ? 'Rejected' : 'Rejeitado')
          : (language === 'en' ? 'No' : 'Não');

        const leftLabel = isSwapped ? negLabelName : posLabelName;
        const leftId = isSwapped ? (isEmailApp ? 'rejected' : 'false') : (isEmailApp ? 'approved' : 'true');
        const leftColor = isSwapped ? '#ef4444' : '#10b981';

        const rightLabel = isSwapped ? posLabelName : negLabelName;
        const rightId = isSwapped ? (isEmailApp ? 'approved' : 'true') : (isEmailApp ? 'rejected' : 'false');
        const rightColor = isSwapped ? '#10b981' : '#ef4444';

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', padding: '0 4px' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ fontSize: '10px', color: leftColor, fontWeight: 800 }}>
                {leftLabel}
              </span>
              <Handle
                type="source"
                position={Position.Bottom}
                id={leftId}
                style={{
                  left: '12px',
                  background: leftColor,
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--bg-primary)',
                  borderRadius: '50%',
                }}
              />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if ((data as any).onToggleSwapOutputs) {
                  (data as any).onToggleSwapOutputs(id);
                } else {
                  nodeData.swapOutputs = !isSwapped;
                }
              }}
              title={language === 'en' ? 'Swap Yes/No outputs' : 'Inverter posições Sim/Não'}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '2px 5px',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeftRight size={11} />
            </button>

            <div style={{ position: 'relative' }}>
              <span style={{ fontSize: '10px', color: rightColor, fontWeight: 800 }}>
                {rightLabel}
              </span>
              <Handle
                type="source"
                position={Position.Bottom}
                id={rightId}
                style={{
                  right: '12px',
                  background: rightColor,
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--bg-primary)',
                  borderRadius: '50%',
                }}
              />
            </div>
          </div>
        );
      })() : (
        nodeType !== 'output' && nodeType !== 'end' && (
          <Handle
            type="source"
            position={Position.Bottom}
            style={{
              background: isDebugFailed ? '#ef4444' : config.border,
              width: '16px',
              height: '16px',
              border: '2px solid var(--bg-primary)',
              borderRadius: '50%',
            }}
          />
        )
      )}
    </div>
  );
});

export default CustomNode;
