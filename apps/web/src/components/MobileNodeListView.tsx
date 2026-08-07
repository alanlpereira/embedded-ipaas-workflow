import React from 'react';
import { WorkflowNode, NodeType } from '@ipaas/shared-types';
import { Zap, Play, GitFork, UserCheck, Send, Code2, Video, Globe, Smartphone, RotateCw, Monitor, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface MobileNodeListViewProps {
  nodes: WorkflowNode[];
  onNodeClick: (event: React.MouseEvent, node: WorkflowNode) => void;
  onToggleCanvasMode: () => void;
}

const nodeTypeIcons: Record<NodeType, React.ElementType> = {
  trigger: Zap,
  schedule: Clock,
  http: Globe,
  action: Play,
  decision: GitFork,
  approval: UserCheck,
  output: Send,
  code: Code2,
  media: Video,
};

const nodeTypeColors: Record<NodeType, string> = {
  trigger: '#10b981',
  schedule: '#8b5cf6',
  http: '#00f2fe',
  action: '#3b82f6',
  decision: '#f59e0b',
  approval: '#f97316',
  output: '#a855f7',
  code: '#06b6d4',
  media: '#d946ef',
};

export const MobileNodeListView: React.FC<MobileNodeListViewProps> = ({
  nodes,
  onNodeClick,
  onToggleCanvasMode,
}) => {
  const { t } = useLanguage();

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        width: '100%',
        padding: '16px',
        overflowY: 'auto',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Banner Informativo Orientativo Mobile */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.12), rgba(59, 130, 246, 0.12))',
          border: '1px solid var(--accent-cyan)',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--accent-blue)', color: '#fff', flexShrink: 0 }}>
          <Smartphone size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Visão Linear de Nós (Modo Smartphone)
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
            Gire o aparelho para o modo horizontal ou alterne para visualizar o grafo completo.
          </p>
        </div>
        <button
          onClick={onToggleCanvasMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
            color: '#0a0c10',
            fontWeight: 800,
            fontSize: '11px',
            border: 'none',
            cursor: 'pointer',
            minHeight: '44px',
            boxShadow: '0 4px 12px rgba(0, 242, 254, 0.3)',
          }}
        >
          <Monitor size={14} />
          Canvas
        </button>
      </div>

      {/* Lista Linear Encadeada de Nós */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {nodes.map((node, index) => {
          const type = node.type || node.data?.type || 'action';
          const Icon = nodeTypeIcons[type] || Play;
          const color = nodeTypeColors[type] || '#3b82f6';
          const isApproval = type === 'approval';

          return (
            <React.Fragment key={node.id}>
              {/* Card Touch de Nó */}
              <div
                onClick={(e) => onNodeClick(e, node)}
                style={{
                  background: 'var(--bg-glass)',
                  backdropFilter: 'blur(16px)',
                  border: `1px solid var(--border-color)`,
                  borderLeft: `5px solid ${color}`,
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: `${color}22`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} color={color} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '10px', color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {type}
                    </span>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {node.data?.label || node.id}
                    </h4>
                  </div>

                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '6px' }}>
                    #{index + 1}
                  </span>
                </div>

                {node.data?.description && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    {node.data.description}
                  </p>
                )}

                {/* Ações Rápidas em Tamanho Grande de Toque (HITL Approval) */}
                {isApproval && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Aprovado com sucesso pelo Gestor via Mobile!`);
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        minHeight: '44px',
                        borderRadius: '10px',
                        background: '#10b981',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '12px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <CheckCircle size={16} />
                      Aprovar
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Rejeitado pelo Gestor via Mobile.`);
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        minHeight: '44px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <XCircle size={16} />
                      Rejeitar
                    </button>
                  </div>
                )}
              </div>

              {/* Seta de Conexão Sequencial entre Nós */}
              {index < nodes.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
                  <div style={{ width: '2px', height: '16px', background: 'var(--border-color)' }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
