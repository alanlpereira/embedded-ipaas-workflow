import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AIErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 [AI ERROR BOUNDARY] Erro capturado no Painel de IA:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '12px 16px',
          borderRadius: '16px',
          background: 'rgba(239, 68, 68, 0.15)',
          backdropFilter: 'blur(16px)',
          border: '1px solid #ef4444',
          color: '#f87171',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)',
          maxWidth: '680px',
          width: '100%',
        }}>
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', color: '#ef4444', marginBottom: '2px' }}>
              Erro Crítico no Painel de IA (Failsafe Ativado)
            </strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {this.state.error?.message || 'Ocorreu uma falha inesperada na renderização da IA.'}
            </span>
          </div>
          <button
            onClick={this.handleReset}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <RefreshCw size={12} />
            Reiniciar Painel
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
