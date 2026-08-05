import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ShieldCheck, Clock, User, FileText, Loader2, Workflow, Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface ApprovalPageProps {
  token: string;
}

export const ApprovalPage: React.FC<ApprovalPageProps> = ({ token }) => {
  const { t } = useLanguage();

  const [approvalData, setApprovalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [decisionSubmitted, setDecisionSubmitted] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/approvals/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Solicitação de aprovação não encontrada');
        return res.json();
      })
      .then((data) => {
        setApprovalData(data);
        if (data.status !== 'PENDING') {
          setDecisionSubmitted(data.status);
        }
      })
      .catch((err) => {
        setErrorMessage(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/approvals/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Falha ao registrar resposta');
      }

      setDecisionSubmitted(decision);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-cyan)' }} />
      </div>
    );
  }

  if (errorMessage && !approvalData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '20px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '16px' }}>
          <AlertCircle size={28} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Solicitação Não Encontrada</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{errorMessage}</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.08), transparent 70%), var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '640px',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '36px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(249, 115, 22, 0.4)',
            }}>
              <ShieldCheck size={24} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                  HITL APPROVAL
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Token: {token.substring(0, 16)}...</span>
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {t.approvalPage.title}
              </h1>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
          {t.approvalPage.subtitle}
        </p>

        {/* Metadata Card */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '18px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <Workflow size={13} color="var(--accent-cyan)" /> {t.approvalPage.flowchart}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {approvalData?.flowchartName || 'Integração Webhook & CRM B2B'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <User size={13} color="var(--accent-blue)" /> {t.approvalPage.assignee}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {approvalData?.assigneeEmail || 'alan.pereira@alp-nexus.com'}
            </span>
          </div>
        </div>

        {/* Payload JSON */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <FileText size={14} color="var(--accent-cyan)" />
            {t.approvalPage.payloadTitle}
          </label>
          <pre style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '14px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-blue)',
            maxHeight: '200px',
            overflowY: 'auto',
          }}>
            {JSON.stringify(approvalData?.payload || { lead: 'Acme Corp', amount: 8500 }, null, 2)}
          </pre>
        </div>

        {/* Feedback / Sucesso ou Formulário */}
        {decisionSubmitted ? (
          <div style={{
            padding: '24px',
            borderRadius: '12px',
            background: decisionSubmitted === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${decisionSubmitted === 'APPROVED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              {decisionSubmitted === 'APPROVED' ? (
                <CheckCircle2 size={40} color="#10b981" />
              ) : (
                <XCircle size={40} color="#ef4444" />
              )}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: decisionSubmitted === 'APPROVED' ? '#10b981' : '#ef4444', marginBottom: '6px' }}>
              {t.approvalPage.successTitle}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {t.approvalPage.successSub}
            </p>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.approvalPage.notesPlaceholder}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button
                onClick={() => handleDecision('REJECTED')}
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                <XCircle size={18} />
                {t.approvalPage.rejectBtn}
              </button>

              <button
                onClick={() => handleDecision('APPROVED')}
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                }}
              >
                {isSubmitting ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                {isSubmitting ? t.approvalPage.submitting : t.approvalPage.approveBtn}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
