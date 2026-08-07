import React from 'react';
import { Zap, Play, GitFork, UserCheck, Send, Code2, Video, Globe, Clock, Mail, CheckCircle, StopCircle, CircleDot } from 'lucide-react';
import { NodeType } from '@ipaas/shared-types';
import { EditionBadge } from './EditionBadge';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface SidebarBlock {
  type: NodeType;
  labelKey: keyof typeof blockTranslations.pt;
  icon: React.ReactNode;
  color: string;
}

const blockTranslations = {
  pt: {
    trigger: { label: 'Gatilho / Evento', desc: 'Recebe eventos HTTP Webhook ou chamadas manuais.' },
    schedule: { label: 'Gatilho de Agendamento', desc: 'Dispara fluxos em horários agendados (Diário, Semanal, Mensal).' },
    email_trigger: { label: 'Gatilho de E-mail', desc: 'Dispara fluxos ao receber e-mails no Synapse Inbound ou IMAP.' },
    http: { label: 'Requisição HTTP / Webhook', desc: 'Dispara chamadas REST/Webhook reais com tokens do Cofre.' },
    action: { label: 'Ação / Processamento', desc: 'Executa ações automatizadas nos sistemas conectados.' },
    email_approval: { label: 'Aprovação por E-mail', desc: 'Envia e-mail de aprovação interativo (Aprovado / Rejeitado).' },
    code: { label: 'Código Customizado JS', desc: 'Executa scripts Node.js isolados via Sandbox VM.' },
    media: { label: 'Processamento de Mídia', desc: 'Renderização de vídeo assíncrona (Veo 3 / Pipeline).' },
    decision: { label: 'Decisão Lógica', desc: 'Bifurca o fluxo de acordo com regras de validação.' },
    approval: { label: 'Aprovação (HITL)', desc: 'Pausa para aprovação humana (Mobile Zero Fricção).' },
    jump: { label: 'Conector de Salto', desc: 'Conecta/recomeça o fluxo em outra caixa circular do mesmo número.' },
    end: { label: 'Fim de Fluxo (Término)', desc: 'Finaliza a execução do fluxo sem saídas subsequentes.' },
    output: { label: 'Saída / Resposta', desc: 'Retorna payload final ou status HTTP.' },
  },
  en: {
    trigger: { label: 'Trigger / Event', desc: 'Receives HTTP Webhook events or manual calls.' },
    schedule: { label: 'Schedule Trigger', desc: 'Triggers workflows on scheduled times (Daily, Weekly, Monthly).' },
    email_trigger: { label: 'Email Trigger', desc: 'Triggers workflows when emails arrive via Synapse Inbound or IMAP.' },
    http: { label: 'HTTP Request / Webhook', desc: 'Fires real REST/Webhook calls with Vault tokens.' },
    action: { label: 'Action / Processing', desc: 'Executes automated actions on connected systems.' },
    email_approval: { label: 'Email Approval Action', desc: 'Sends interactive approval email (Approved / Rejected).' },
    code: { label: 'Custom JS Code', desc: 'Executes isolated Node.js scripts via Sandbox VM.' },
    media: { label: 'Media Processing', desc: 'Async video rendering (Veo 3 / Pipeline).' },
    decision: { label: 'Logical Decision', desc: 'Branches flow according to validation rules.' },
    approval: { label: 'Approval (HITL)', desc: 'Pauses for human approval (Zero Friction Mobile).' },
    jump: { label: 'Jump Connector', desc: 'Connects/restarts flow at another circular box with the same number.' },
    end: { label: 'End Flow (Terminate)', desc: 'Finalizes flow execution without subsequent outputs.' },
    output: { label: 'Output / Response', desc: 'Returns final payload or HTTP status.' },
  },
};

const blocks: SidebarBlock[] = [
  { type: 'trigger', labelKey: 'trigger', icon: <Zap size={18} color="#10b981" />, color: '#10b981' },
  { type: 'schedule', labelKey: 'schedule', icon: <Clock size={18} color="#8b5cf6" />, color: '#8b5cf6' },
  { type: 'email_trigger', labelKey: 'email_trigger', icon: <Mail size={18} color="#0284c7" />, color: '#0284c7' },
  { type: 'http', labelKey: 'http', icon: <Globe size={18} color="#00f2fe" />, color: '#00f2fe' },
  { type: 'action', labelKey: 'action', icon: <Play size={18} color="#3b82f6" />, color: '#3b82f6' },
  { type: 'email_approval', labelKey: 'email_approval', icon: <CheckCircle size={18} color="#10b981" />, color: '#10b981' },
  { type: 'code', labelKey: 'code', icon: <Code2 size={18} color="#06b6d4" />, color: '#06b6d4' },
  { type: 'media', labelKey: 'media', icon: <Video size={18} color="#d946ef" />, color: '#d946ef' },
  { type: 'decision', labelKey: 'decision', icon: <GitFork size={18} color="#f59e0b" />, color: '#f59e0b' },
  { type: 'approval', labelKey: 'approval', icon: <UserCheck size={18} color="#f97316" />, color: '#f97316' },
  { type: 'jump', labelKey: 'jump', icon: <CircleDot size={18} color="#eab308" />, color: '#eab308' },
  { type: 'end', labelKey: 'end', icon: <StopCircle size={18} color="#ef4444" />, color: '#ef4444' },
  { type: 'output', labelKey: 'output', icon: <Send size={18} color="#a855f7" />, color: '#a855f7' },
];

interface SidebarProps {
  onAddNode?: (type: NodeType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onAddNode }) => {
  const { currentOrg } = useTheme();
  const { language, t } = useLanguage();

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
          {t.sidebar.title}
        </h2>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
          {t.sidebar.dragInstructions}
        </p>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginTop: '4px',
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        paddingRight: '6px',
      }}>
        {blocks.map((block) => {
          const info = blockTranslations[language][block.labelKey];
          return (
            <div
              key={block.type}
              draggable
              onDragStart={(e) => onDragStart(e, block.type)}
              onClick={() => onAddNode && onAddNode(block.type)}
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid var(--border-color)`,
                borderLeft: `4px solid ${block.color}`,
                cursor: 'pointer',
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
                  {info.label}
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
                  {info.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
