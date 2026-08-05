import React, { useState } from 'react';
import { ReactFlow, Controls, Background, MiniMap, Node, Edge, Connection, NodeChange, EdgeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Sparkles, Send, Loader2, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';

import { CustomNode } from './CustomNode';
import { LiveCursors } from './LiveCursors';
import { RemoteCursor } from '../collaboration/useYjsCollaboration';
import { WorkflowNode, WorkflowEdge, NodeType } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';

const nodeTypes: any = {
  trigger: CustomNode,
  action: CustomNode,
  decision: CustomNode,
  approval: CustomNode,
  output: CustomNode,
  code: CustomNode,
  media: CustomNode,
};

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: WorkflowNode) => void;
  onAddNodeAtPosition: (type: NodeType, position: { x: number; y: number }) => void;
  onPaneClick: () => void;
  onFlowGenerated?: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
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
  onAddNodeAtPosition,
  onPaneClick,
  onFlowGenerated,
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

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiLimitError, setAiLimitError] = useState<string | null>(null);

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

  const handleGenerateFlowWithAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setAiLimitError(null);

    try {
      const response = await fetch('/api/v1/ai/generate-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      const data = await response.json();

      if (response.status === 403 || data.error === 'AI_LIMIT_EXCEEDED') {
        setAiLimitError(data.message || 'Limite de tokens de IA atingido (100%). Solicite um upgrade de plano ao usuário Master.');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar fluxo via IA');
      }

      if (data.nodes && data.edges && onFlowGenerated) {
        onFlowGenerated(data.nodes, data.edges);
        setAiPrompt('');
      }
    } catch (err: any) {
      alert(`Erro no Copilot AI: ${err.message}`);
    } finally {
      setIsGenerating(false);
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
          errorMessage: errorMessage || 'HTTP 500 API Gateway Timeout',
        },
      };
    }
    return node;
  });

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--bg-primary)' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
    >
      {/* Live Cursors Overlay em Tempo Real (Estilo Figma/Miro) */}
      <LiveCursors cursors={remoteCursors} />

      {/* Banner de Debug Mode no Topo do Canvas */}
      {isDebugMode && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))',
          backdropFilter: 'blur(12px)',
          border: '1px solid #f87171',
          borderRadius: '12px',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)',
          color: '#ffffff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} color="#ffffff" />
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>
                {t.debugMode.activeBadge}
              </span>
              <strong style={{ fontSize: '13px' }}>{t.debugMode.failedNodeTitle}: {errorMessage}</strong>
            </div>
          </div>

          {onRetryFromFailedNode && (
            <button
              onClick={onRetryFromFailedNode}
              disabled={isRetrying}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#991b1b',
                fontWeight: 800,
                fontSize: '12px',
                border: 'none',
                cursor: isRetrying ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              <RefreshCw size={14} style={{ animation: isRetrying ? 'spin 1s linear infinite' : 'none' }} />
              {isRetrying ? t.auditPage.retrying : t.debugMode.retryFromHere}
            </button>
          )}
        </div>
      )}

      {/* Floating Prompt Bar do Copilot AI */}
      {showCopilotBar && !isDebugMode && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          width: '90%',
          maxWidth: '680px',
        }}>
          <form
            onSubmit={handleGenerateFlowWithAI}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(16px)',
              border: aiLimitError ? '1px solid #ef4444' : '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '8px 12px 8px 16px',
              boxShadow: aiLimitError ? '0 10px 30px rgba(239, 68, 68, 0.3)' : '0 10px 30px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
              color: '#fff',
              fontWeight: 800,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              flexShrink: 0
            }}>
              <Sparkles size={14} color="#fff" />
              {t.copilot.badge}
            </div>

            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={t.copilot.placeholder}
              disabled={isGenerating}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />

            <button
              type="submit"
              disabled={isGenerating || !aiPrompt.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                background: isGenerating ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                color: '#0a0c10',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                cursor: isGenerating || !aiPrompt.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  {t.copilot.generating}
                </>
              ) : (
                <>
                  <Send size={14} />
                  {t.copilot.generateBtn}
                </>
              )}
            </button>
          </form>

          {/* Banner Alerta de Limite Atingido */}
          {aiLimitError && (
            <div style={{
              marginTop: '8px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
            }}>
              <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{aiLimitError}</span>
            </div>
          )}
        </div>
      )}

      <ReactFlow
        nodes={flowNodes as unknown as Node[]}
        edges={edges as Edge[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick as any}
        onPaneClick={onPaneClick}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        zoomOnPinch={true}
        panOnScroll={false}
        panOnDrag={[1, 2]}
        preventScrolling={true}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: 'var(--accent-blue)', strokeWidth: 2 },
        }}
      >
        <Background color="var(--border-color)" gap={20} size={1} />
        <Controls style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'trigger') return '#10b981';
            if (n.type === 'action') return '#3b82f6';
            if (n.type === 'code') return '#06b6d4';
            if (n.type === 'media') return '#d946ef';
            if (n.type === 'decision') return '#f59e0b';
            if (n.type === 'approval') return '#f97316';
            if (n.type === 'output') return '#a855f7';
            return '#64748b';
          }}
          style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
        />
      </ReactFlow>
    </div>
  );
};

export default WorkflowCanvas;
