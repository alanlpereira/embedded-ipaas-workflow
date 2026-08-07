import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, Play, GitFork, UserCheck, Send, AlertTriangle, Code2, Video, Globe, Clock, Mail, CheckCircle, StopCircle, CircleDot } from 'lucide-react';
import { NodeType, WorkflowNodeData } from '@ipaas/shared-types';

interface NodeColorConfig {
  color: string;
  gradient: string;
  icon: React.ReactNode;
  badge: string;
}

const nodeConfigs: Record<NodeType, NodeColorConfig> = {
  trigger: {
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    icon: <Zap size={16} color="#ffffff" />,
    badge: 'INPUT',
  },
  schedule: {
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    icon: <Clock size={16} color="#ffffff" />,
    badge: 'CRON SCHEDULE',
  },
  email_trigger: {
    color: '#0284c7',
    gradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
    icon: <Mail size={16} color="#ffffff" />,
    badge: 'EMAIL TRIGGER',
  },
  email_approval: {
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    icon: <CheckCircle size={16} color="#ffffff" />,
    badge: 'EMAIL APPROVAL',
  },
  http: {
    color: '#00f2fe',
    gradient: 'linear-gradient(135deg, #00f2fe, #4facfe)',
    icon: <Globe size={16} color="#ffffff" />,
    badge: 'HTTP / API',
  },
  action: {
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    icon: <Play size={16} color="#ffffff" />,
    badge: 'ACTION',
  },
  decision: {
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    icon: <GitFork size={16} color="#ffffff" />,
    badge: 'DECISION',
  },
  approval: {
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
    icon: <UserCheck size={16} color="#ffffff" />,
    badge: 'APPROVAL',
  },
  jump: {
    color: '#eab308',
    gradient: 'linear-gradient(135deg, #eab308, #ca8a04)',
    icon: <CircleDot size={16} color="#ffffff" />,
    badge: 'JUMP CONNECTOR',
  },
  end: {
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    icon: <StopCircle size={16} color="#ffffff" />,
    badge: 'END FLOW',
  },
  output: {
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7, #9333ea)',
    icon: <Send size={16} color="#ffffff" />,
    badge: 'OUTPUT',
  },
  code: {
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    icon: <Code2 size={16} color="#ffffff" />,
    badge: 'JS CODE',
  },
  media: {
    color: '#d946ef',
    gradient: 'linear-gradient(135deg, #d946ef, #c026d3)',
    icon: <Video size={16} color="#ffffff" />,
    badge: 'MEDIA RENDER',
  },
};

export const CustomNode: React.FC<NodeProps<any>> = memo(({ data, selected }) => {
  const nodeData = data as WorkflowNodeData;
  const nodeType = nodeData.type || 'action';
  const config = nodeConfigs[nodeType] || nodeConfigs.action;

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
          ? `2px solid ${config.color}`
          : '1px solid var(--border-color)',
        boxShadow: isDebugFailed
          ? '0 0 20px rgba(239, 68, 68, 0.6)'
          : selected
          ? `0 0 20px ${config.color}40`
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

      {/* Handles de Entrada e Saída com Hitbox Expandido (16px x 16px para Touch) */}
      {nodeType !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: isDebugFailed ? '#ef4444' : config.color,
            width: '16px',
            height: '16px',
            border: '2px solid var(--bg-primary)',
            borderRadius: '50%',
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
            background: config.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {config.icon}
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
            {config.badge}
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

      {/* Output Handles Específicos para Nó de Decisão */}
      {isDecision ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '0 8px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>Sim</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="true"
              style={{
                left: '12px',
                background: '#10b981',
                width: '16px',
                height: '16px',
                border: '2px solid var(--bg-primary)',
                borderRadius: '50%',
              }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>Não</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="false"
              style={{
                right: '12px',
                background: '#ef4444',
                width: '16px',
                height: '16px',
                border: '2px solid var(--bg-primary)',
                borderRadius: '50%',
              }}
            />
          </div>
        </div>
      ) : (
        nodeType !== 'output' && (
          <Handle
            type="source"
            position={Position.Bottom}
            style={{
              background: isDebugFailed ? '#ef4444' : config.color,
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
