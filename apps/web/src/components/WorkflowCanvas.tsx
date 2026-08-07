import React, { useState } from 'react';
import { ReactFlow, Controls, Background, BackgroundVariant, MiniMap, Node, Edge, Connection, NodeChange, EdgeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { RefreshCw, AlertTriangle, Grid, LayoutGrid, FileText, Presentation } from 'lucide-react';

import { CustomNode } from './CustomNode';
import { LiveCursors } from './LiveCursors';
import { CopilotPromptBar } from './CopilotPromptBar';
import { RemoteCursor } from '../collaboration/useYjsCollaboration';
import { WorkflowNode, WorkflowEdge, NodeType } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { exportFlowToPDF, exportFlowToPPTX } from '../utils/exportUtils';

const nodeTypes: any = {
  trigger: CustomNode,
  schedule: CustomNode,
  email_trigger: CustomNode,
  email_approval: CustomNode,
  action: CustomNode,
  decision: CustomNode,
  approval: CustomNode,
  output: CustomNode,
  code: CustomNode,
  media: CustomNode,
  http: CustomNode,
  jump: CustomNode,
  end: CustomNode,
};

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: WorkflowNode) => void;
  onDeleteEdge?: (edgeId: string) => void;
  onAddNodeAtPosition: (type: NodeType, position: { x: number; y: number }) => void;
  onPaneClick: (event?: React.MouseEvent) => void;
  onCanvasInteractionPosition?: (position: { x: number; y: number }) => void;
  onFlowGenerated?: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  onAlignAllNodes?: () => void;
  showCopilotBar?: boolean;
  // Debug Mode Props
  isDebugMode?: boolean;
  failedNodeId?: string;
  errorMessage?: string;
  onRetryFromFailedNode?: () => void;
  isRetrying?: boolean;
  // Real-Time Collaboration Props
  remoteCursors?: RemoteCursor[];
  onMouseMoveCanvas?: (x: number, y: number) => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onDeleteEdge,
  onAddNodeAtPosition,
  onPaneClick,
  onCanvasInteractionPosition,
  onFlowGenerated,
  onAlignAllNodes,
  showCopilotBar = true,
  isDebugMode = false,
  failedNodeId,
  errorMessage,
  onRetryFromFailedNode,
  isRetrying = false,
  remoteCursors = [],
  onMouseMoveCanvas,
}) => {
  const { t } = useLanguage();
  const [showGrid, setShowGrid] = useState<boolean>(false);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow') as NodeType;
    if (!type) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const position = {
      x: event.clientX - bounds.left - 100,
      y: event.clientY - bounds.top - 40,
    };

    onAddNodeAtPosition(type, position);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (onMouseMoveCanvas) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      onMouseMoveCanvas(x, y);
    }
  };

  // Se estiver em Debug Mode, injetar props no nó com falha
  const flowNodes = nodes.map((node) => {
    if (isDebugMode && node.id === failedNodeId) {
      return {
        ...node,
        data: {
          ...node.data,
          isDebugFailed: true,
          errorMessage,
          onRetry: onRetryFromFailedNode,
          isRetrying,
        },
      };
    }
    return node;
  });

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Live Cursors de Outros Usuários (Colaboração Yjs) */}
      <LiveCursors cursors={remoteCursors} />

      {/* Banner de Status do Debug Mode */}
      {isDebugMode && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 25,
          background: 'rgba(239, 68, 68, 0.15)',
          backdropFilter: 'blur(16px)',
          border: '1px solid #ef4444',
          borderRadius: '12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#f87171',
          fontSize: '12px',
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)',
        }}>
          <AlertTriangle size={18} color="#ef4444" />
          <div>
            <div>Modo de Depuração e Autocorreção</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Falha detectada no nó de execução
            </div>
          </div>
          {failedNodeId && onRetryFromFailedNode && (
            <button
              onClick={onRetryFromFailedNode}
              disabled={isRetrying}
              style={{
                marginLeft: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                fontSize: '11px',
                cursor: isRetrying ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={12} className={isRetrying ? 'spin' : ''} />
              {isRetrying ? 'Reprocessando...' : 'Reprocessar a partir desta etapa'}
            </button>
          )}
        </div>
      )}

      {/* Copilot Floating AI Prompt Bar - Isolation ensures canvas doesn't re-render while typing */}
      {showCopilotBar && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          width: '90%',
          maxWidth: '680px',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <CopilotPromptBar onFlowGenerated={onFlowGenerated} style={{ pointerEvents: 'auto' }} />
        </div>
      )}

      {/* Barra de Ferramentas de Alinhamento, Grid e Exportação */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 30,
        display: 'flex',
        gap: '8px',
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        backdropFilter: 'blur(8px)',
        padding: '6px 10px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}>
        <button
          type="button"
          onClick={() => setShowGrid(!showGrid)}
          title={showGrid ? "Ocultar linhas do Grid" : "Mostrar linhas do Grid"}
          style={{
            background: showGrid ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
            border: showGrid ? '1px solid var(--accent-cyan)' : 'none',
            color: showGrid ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <Grid size={14} />
          Grid: {showGrid ? 'LIGADO' : 'DESLIGADO'}
        </button>

        {onAlignAllNodes && (
          <button
            type="button"
            onClick={onAlignAllNodes}
            title="Alinhar todas as caixas na grade de 20px"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <LayoutGrid size={14} />
            Alinhar Caixas
          </button>
        )}

        <div style={{ width: '1px', background: 'var(--border-color)', margin: '2px 2px' }} />

        {/* Botão Exportar PDF */}
        <button
          type="button"
          onClick={() => exportFlowToPDF(nodes, edges, 'Fluxo de Trabalho Synapse')}
          title="Exportar fluxo completo formatado em PDF"
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#60a5fa',
            borderRadius: '6px',
            padding: '4px 9px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={14} />
          Exportar PDF
        </button>

        {/* Botão Exportar PowerPoint (PPTX) */}
        <button
          type="button"
          onClick={() => exportFlowToPPTX(nodes, edges, 'Fluxo de Trabalho Synapse')}
          title="Exportar fluxo em formato de apresentação PowerPoint (.pptx)"
          style={{
            background: 'rgba(249, 115, 22, 0.15)',
            border: '1px solid rgba(249, 115, 22, 0.4)',
            color: '#fb923c',
            borderRadius: '6px',
            padding: '4px 9px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <Presentation size={14} />
          Exportar PPTX
        </button>
      </div>

      <ReactFlow
        nodes={flowNodes as unknown as Node[]}
        edges={edges as Edge[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(event, node) => {
          if (onCanvasInteractionPosition) {
            const posX = Math.round((node.position.x + 240) / 20) * 20;
            const posY = Math.round(node.position.y / 20) * 20;
            onCanvasInteractionPosition({ x: posX, y: posY });
          }
          onNodeClick(event, node as any);
        }}
        onPaneClick={(event) => {
          if (onCanvasInteractionPosition && event) {
            const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const posX = Math.round((event.clientX - bounds.left - 100) / 20) * 20;
            const posY = Math.round((event.clientY - bounds.top - 50) / 20) * 20;
            onCanvasInteractionPosition({ x: Math.max(20, posX), y: Math.max(20, posY) });
          }
          onPaneClick(event);
        }}
        onEdgeClick={(event, edge) => {
          event.stopPropagation();
          if (onDeleteEdge) {
            if (window.confirm('Remover esta linha de conexão entre os nós?')) {
              onDeleteEdge(edge.id);
            }
          }
        }}
        fitView
        snapToGrid={true}
        snapGrid={[20, 20]}
        deleteKeyCode={['Backspace', 'Delete']}
        edgesReconnectable={true}
        edgesFocusable={true}
        elementsSelectable={true}
        zoomOnPinch={true}
        panOnScroll={false}
        panOnDrag={true}
      >
        {showGrid && <Background variant={BackgroundVariant.Lines} color="rgba(255, 255, 255, 0.15)" gap={20} size={1} />}
        <Controls style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger': return '#10b981';
              case 'schedule': return '#8b5cf6';
              case 'email_trigger': return '#0284c7';
              case 'email_approval': return '#10b981';
              case 'action': return '#3b82f6';
              case 'decision': return '#f59e0b';
              case 'approval': return '#8b5cf6';
              case 'output': return '#64748b';
              case 'code': return '#ec4899';
              case 'media': return '#00f2fe';
              default: return '#64748b';
            }
          }}
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
        />
      </ReactFlow>
    </div>
  );
};
