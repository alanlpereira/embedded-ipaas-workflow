import React from 'react';
import { Zap, Play, GitFork, UserCheck, Send, Code2, Video } from 'lucide-react';
import { NodeType } from '@ipaas/shared-types';
import { EditionBadge } from './EditionBadge';
import { useTheme } from '../context/ThemeContext';

interface SidebarBlock {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const blocks: SidebarBlock[] = [
  {
    type: 'trigger',
    label: 'Gatilho / Evento',
    description: 'Recebe eventos HTTP Webhook ou agendamentos cron.',
    icon: <Zap size={18} color="#10b981" />,
    color: '#10b981',
  },
  {
    type: 'action',
    label: 'Ação / HTTP API',
    description: 'Dispara requisições HTTP REST com Vault pgsodium.',
    icon: <Play size={18} color="#3b82f6" />,
    color: '#3b82f6',
  },
  {
    type: 'code',
    label: 'Código Customizado JS',
    description: 'Executa scripts Node.js isolados via Sandbox VM.',
    icon: <Code2 size={18} color="#06b6d4" />,
    color: '#06b6d4',
  },
  {
    type: 'media',
    label: 'Processamento de Mídia',
    description: 'Renderização de vídeo assíncrona (Veo 3 / Pipeline).',
    icon: <Video size={18} color="#d946ef" />,
    color: '#d946ef',
  },
  {
    type: 'decision',
    label: 'Decisão Lógica',
    description: 'Bifurca o fluxo de acordo com regras de validação.',
    icon: <GitFork size={18} color="#f59e0b" />,
    color: '#f59e0b',
  },
  {
    type: 'approval',
    label: 'Aprovação (HITL)',
    description: 'Pausa para aprovação humana (Mobile Zero Fricção).',
    icon: <UserCheck size={18} color="#f97316" />,
    color: '#f97316',
  },
  {
    type: 'output',
    label: 'Saída / Resposta',
    description: 'Retorna payload final ou status HTTP.',
    icon: <Send size={18} color="#a855f7" />,
    color: '#a855f7',
  },
];

export const Sidebar: React.FC = () => {
  const { currentOrg } = useTheme();

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside
      style={{
        width: '260px',
        height: '100%',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--border-color)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 10,
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Topo Reservado da Sidebar para a Logomarca Synapse e Selo de Edição */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/assets/synapse-logo.png"
            alt="Synapse Logo"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            style={{ height: '28px', objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
              SYNAPSE
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {currentOrg?.name || 'Organização Principal'}
            </span>
          </div>
        </div>

        {/* Selo Visual de Edição (Forge, Kinex, Axiom, Synapse) */}
        <div>
          <EditionBadge edition={currentOrg?.plan_tier || 'Synapse'} size="small" />
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px 0' }}>
          Blocos de Construção
        </h2>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
          Arraste e solte no canvas para criar automações.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
        {blocks.map((block) => (
          <div
            key={block.type}
            draggable
            onDragStart={(e) => onDragStart(e, block.type)}
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: 'var(--bg-tertiary)',
              border: `1px solid var(--border-color)`,
              borderLeft: `4px solid ${block.color}`,
              cursor: 'grab',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: `${block.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {block.icon}
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {block.label}
              </h3>
              <p
                style={{
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  margin: '2px 0 0 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {block.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
