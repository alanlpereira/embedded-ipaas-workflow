import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ShieldCheck, UserCheck, Clock, AlertTriangle, Loader2, Smartphone, ArrowRight } from 'lucide-react';

interface FormattedField {
  key: string;
  label: string;
  value: any;
}

interface ApprovalTokenData {
  token: string;
  flowchart_id: string;
  flowchart_name: string;
  assignee_email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  created_at: string;
  decided_at?: string;
  formattedFields: FormattedField[];
  rawPayload: any;
}

export const ZeroFrictionDecidePage: React.FC<{ token: string }> = ({ token }) => {
  const [tokenData, setTokenData] = useState<ApprovalTokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionState, setDecisionState] = useState<'APPROVED' | 'REJECTED' | null>(null);

  useEffect(() => {
    fetch(`/api/approvals/decide/${token}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.error || 'Token inválido ou não encontrado.');
          });
        }
        return res.json();
      })
      .then((data) => {
        setTokenData(data);
        if (data.status !== 'PENDING') {
          setDecisionState(data.status);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (isSubmitting || decisionState) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/approvals/decide/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          decided_by: 'Gestor Mobile (Zero Fricção)',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Erro ao registrar decisão.');
      }

      setDecisionState(decision);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Loader2 size={36} color="var(--accent-blue)" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Carregando solicitação de aprovação...
          </span>
        </div>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <AlertTriangle size={32} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Token Indisponível ou Utilizado
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              {error || 'Esta aprovação já foi concluída anteriormente ou o token expirou por segurança.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Se a decisão já tiver sido tomada (ou no clique atual)
  if (decisionState) {
    const isApproved = decisionState === 'APPROVED';
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isApproved ? '0 0 24px rgba(16, 185, 129, 0.4)' : '0 0 24px rgba(239, 68, 68, 0.4)',
              }}
            >
              {isApproved ? (
                <CheckCircle2 size={36} color="#10b981" />
              ) : (
                <XCircle size={36} color="#ef4444" />
              )}
            </div>

            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                {isApproved ? 'Solicitação Aprovada!' : 'Solicitação Rejeitada'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                {isApproved
                  ? 'O fluxograma continuou sua execução automaticamente para os próximos passos.'
                  : 'A execução foi interrompida no caminho de rejeição.'}
              </p>
            </div>

            <div style={{
              background: 'var(--bg-tertiary)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              justifyContent: 'center',
            }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Token invalidado por segurança contra cliques duplos.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Top Header Simplificado Mobile */}
      <header style={{
        padding: '16px 20px',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '6px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', color: '#0a0c10' }}>
            <UserCheck size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Aprovação HITL
            </h1>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              NexusFlow Mobile Zero Fricção
            </span>
          </div>
        </div>

        <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 10px', borderRadius: '12px', fontWeight: 800 }}>
          Sem Login
        </span>
      </header>

      {/* Conteúdo Principal com Card de Rótulos Legíveis */}
      <main style={{ flex: 1, padding: '20px', overflowY: 'auto', paddingBottom: '120px' }}>
        <div style={{
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* Título da Solicitação */}
          <div>
            <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Processo: {tokenData.flowchart_name}
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px', margin: 0 }}>
              Confirmação de Aprovação do Gestor
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
              <Clock size={13} />
              <span>Solicitado em {new Date(tokenData.created_at).toLocaleString()}</span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

          {/* Rótulos Legíveis de Dados do Payload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>
              Dados da Requisição (Payload)
            </h3>

            {tokenData.formattedFields.map((field, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                  {field.label}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {String(field.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Sticky Footer com Botões Grandes de Toque (Min Height 52px) */}
      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100vw',
        padding: '16px 20px',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        gap: '12px',
        zIndex: 50,
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)',
      }}>
        <button
          onClick={() => handleDecision('REJECTED')}
          disabled={isSubmitting}
          style={{
            flex: 1,
            minHeight: '52px',
            borderRadius: '14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            fontSize: '14px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          <XCircle size={20} />
          REJEITAR
        </button>

        <button
          onClick={() => handleDecision('APPROVED')}
          disabled={isSubmitting}
          style={{
            flex: 1.5,
            minHeight: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
          }}
        >
          {isSubmitting ? (
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <>
              <CheckCircle2 size={20} />
              APROVAR
            </>
          )}
        </button>
      </footer>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  width: '100vw',
  background: 'var(--bg-primary)',
  padding: '20px',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '440px',
  background: 'var(--bg-glass)',
  backdropFilter: 'blur(20px)',
  border: '1px solid var(--border-color)',
  borderRadius: '24px',
  padding: '32px 24px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
};
