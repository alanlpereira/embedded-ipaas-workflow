import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Profile } from '@ipaas/shared-types';

interface MagicDemoPageProps {
  onLoginSuccess: (profile: Profile) => void;
}

export const MagicDemoPage: React.FC<MagicDemoPageProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setError('Token de Demo Mágica não fornecido na URL.');
      setIsLoading(false);
      return;
    }

    fetch(`/api/v1/demo/verify?token=${token}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.error || 'Link de Demo Mágica inválido ou expirado.');
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data.valid && data.profile) {
          // Autenticação silenciosa bem sucedida
          setTimeout(() => {
            onLoginSuccess(data.profile);
          }, 1200);
        } else {
          setError('Não foi possível realizar o login silencioso.');
          setIsLoading(false);
        }
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [onLoginSuccess]);

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <AlertTriangle size={36} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Link de Demo Mágica Expirado ou Inválido
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              {error}
            </p>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Solicite um novo link de convite ao administrador Master.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.5)',
          }}>
            <Sparkles size={32} color="#ffffff" />
          </div>

          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Autenticação Mágica Zero Fricção
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px', margin: 0 }}>
              Entrando no seu Painel...
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Validando token temporário de 7 dias e preparando o ambiente da sua organização.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
            <Loader2 size={24} color="var(--accent-cyan)" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Redirecionando silenciosamente...
            </span>
          </div>

          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '11px',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <ShieldCheck size={16} />
            <span>Sessão segura verificada sem digitação de senha.</span>
          </div>
        </div>
      </div>
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
  padding: '36px 28px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
};
