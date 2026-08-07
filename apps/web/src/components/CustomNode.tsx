import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, Play, GitFork, UserCheck, Send, AlertTriangle, Code2, Video, Globe, ArrowLeftRight } from 'lucide-react';
import { NodeType, WorkflowNodeData } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';

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

      {/* Output Handles Específicos para Nó de Decisão com suporte a inversão de posições */}
      {isDecision ? (() => {
        const isSwapped = Boolean(nodeData.swapOutputs);
        const leftLabel = isSwapped ? (language === 'en' ? 'No' : 'Não') : (language === 'en' ? 'Yes' : 'Sim');
        const leftId = isSwapped ? 'false' : 'true';
        const leftColor = isSwapped ? '#ef4444' : '#10b981';

        const rightLabel = isSwapped ? (language === 'en' ? 'Yes' : 'Sim') : (language === 'en' ? 'No' : 'Não');
        const rightId = isSwapped ? 'true' : 'false';
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
        nodeType !== 'output' && (
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
