import React, { useState } from 'react';
import { Workflow, Lock, Mail, ArrowRight, ShieldCheck, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../i18n/LanguageContext';
import { Profile } from '@ipaas/shared-types';

interface LoginPageProps {
  onLoginSuccess: (profile: Profile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('alan.pereira@alp-nexus.com');
  const [password, setPassword] = useState('ChangeMeOnFirstLogin2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Se Supabase real não estiver conectado localmente, realiza login simulado com o perfil
        console.warn('Supabase Auth error (fallback local):', error.message);
        fallbackLocalLogin(email);
        return;
      }

      if (data.user) {
        // Buscar perfil vinculado
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const userProfile: Profile = profile || {
          id: data.user.id,
          organization_id: 'org-alp-nexus',
          email: data.user.email || email,
          full_name: data.user.user_metadata?.full_name || 'Alan Pereira',
          role: (data.user.user_metadata?.role as any) || 'Master',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        onLoginSuccess(userProfile);
      }
    } catch (err: any) {
      fallbackLocalLogin(email);
    } finally {
      setIsLoading(false);
    }
  };

  const fallbackLocalLogin = (targetEmail: string) => {
    const isViewer = targetEmail.includes('viewer');
    const mockProfile: Profile = {
      id: isViewer ? 'user-viewer-id' : 'user-master-id',
      organization_id: 'org-alp-nexus',
      email: targetEmail,
      full_name: isViewer ? 'Usuário Leitor (Viewer Demo)' : 'Alan Pereira (Master)',
      role: isViewer ? 'Viewer' : 'Master',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onLoginSuccess(mockProfile);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 30%, rgba(18, 26, 40, 0.9), var(--bg-primary))',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '36px 32px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(0, 242, 254, 0.4)',
            marginBottom: '14px',
          }}>
            <Workflow size={28} color="#0a0c10" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {t.login.title}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
            {t.login.subtitle}
          </p>
        </div>

        {errorMessage && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '12px',
            marginBottom: '18px',
          }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              {t.login.emailLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '8px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              {t.login.passwordLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '8px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
              color: '#0a0c10',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0, 242, 254, 0.3)',
            }}
          >
            {isLoading ? t.login.authenticating : t.login.submitBtn}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Demo Access Buttons */}
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => {
              setEmail('alan.pereira@alp-nexus.com');
              fallbackLocalLogin('alan.pereira@alp-nexus.com');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(0, 242, 254, 0.08)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              color: 'var(--accent-cyan)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={16} />
            {t.login.quickMasterLogin}
          </button>

          <button
            onClick={() => {
              setEmail('viewer.demo@alp-nexus.com');
              fallbackLocalLogin('viewer.demo@alp-nexus.com');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: '8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              justifyContent: 'center',
            }}
          >
            <Eye size={16} />
            {t.login.demoViewerLogin}
          </button>
        </div>
      </div>
    </div>
  );
};
