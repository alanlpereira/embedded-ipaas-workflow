import React from 'react';
import { X, Sparkles, Zap, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { WorkflowNode, WorkflowEdge } from '@ipaas/shared-types';

export interface AIOptimizationReport {
  efficiencyScore: number;
  analysis: string;
  bottlenecks: string[];
  suggestions: string[];
  optimizedNodes?: WorkflowNode[];
  optimizedEdges?: WorkflowEdge[];
}

interface AIOptimizationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  report: AIOptimizationReport | null;
  onApplyImprovements: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
}

export const AIOptimizationDrawer: React.FC<AIOptimizationDrawerProps> = ({
  isOpen,
  onClose,
  report,
  onApplyImprovements,
}) => {
  if (!isOpen || !report) return null;

  const score = report.efficiencyScore || 85;

  const handleApply = () => {
    if (report.optimizedNodes && report.optimizedNodes.length > 0) {
      onApplyImprovements(report.optimizedNodes, report.optimizedEdges || []);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '460px',
        height: '100%',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid var(--border-color)',
        boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.6)',
        zIndex: 35,
        display: 'flex',
        flexDirection: 'column',
        padding: '28px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '6px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))' }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Análise de Eficiência (IA)
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Relatório Gerado por Gemini 2.5 LLM Architecture Advisor
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Score Widget */}
      <div style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Índice de Eficiência Lógica
          </span>
          <h3 style={{ fontSize: '24px', fontWeight: 900, color: score > 80 ? '#10b981' : '#f59e0b', marginTop: '2px' }}>
            {score}%
          </h3>
        </div>
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          border: `4px solid ${score > 80 ? '#10b981' : '#f59e0b'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '14px',
        }}>
          {score}
        </div>
      </div>

      {/* Análise Explicativa */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
          Resumo da Arquitetura
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
          {report.analysis}
        </p>
      </div>

      {/* Gargalos & Fragilidades */}
      {report.bottlenecks && report.bottlenecks.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={15} color="#ef4444" />
            Gargalos & Fragilidades Encontradas
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {report.bottlenecks.map((item, idx) => (
              <div key={idx} style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '11px',
                color: '#f87171',
                lineHeight: '1.4',
              }}>
                • {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recomendações de Melhoria */}
      {report.suggestions && report.suggestions.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={15} color="#10b981" />
            Recomendações de Otimização
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {report.suggestions.map((sug, idx) => (
              <div key={idx} style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '11px',
                color: '#34d399',
                lineHeight: '1.4',
              }}>
                ✓ {sug}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão de Aplicação das Otimizações no Canvas */}
      {report.optimizedNodes && report.optimizedNodes.length > 0 && (
        <button
          onClick={handleApply}
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
            color: '#0a0c10',
            fontWeight: 800,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(0, 242, 254, 0.3)',
          }}
        >
          <Zap size={16} fill="#0a0c10" />
          ⚡ Aplicar Melhorias no Canvas
        </button>
      )}
    </div>
  );
};
