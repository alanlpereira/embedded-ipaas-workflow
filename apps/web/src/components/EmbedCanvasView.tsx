import React from 'react';
import { WorkflowCanvas } from './WorkflowCanvas';
import { WorkflowNode, WorkflowEdge } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { Workflow } from 'lucide-react';

interface EmbedCanvasViewProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export const EmbedCanvasView: React.FC<EmbedCanvasViewProps> = ({ nodes, edges }) => {
  const { t } = useLanguage();

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Canvas isolado em modo Somente Leitura */}
      <WorkflowCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={() => {}}
        onEdgesChange={() => {}}
        onConnect={() => {}}
        onNodeClick={() => {}}
        onAddNodeAtPosition={() => {}}
        onPaneClick={() => {}}
      />

      {/* Badge Flutuante no rodapé: Powered by NexusFlow */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '20px',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
        zIndex: 40,
        userSelect: 'none',
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Workflow size={12} color="#0a0c10" />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          {t.embedView.poweredBy}
        </span>
      </div>
    </div>
  );
};
