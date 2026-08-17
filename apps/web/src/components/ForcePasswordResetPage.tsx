import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Lock, AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { Profile } from '../types';

interface ForcePasswordResetPageProps {
  currentProfile: Profile;
  onPasswordResetComplete: (updatedProfile: Profile) => void;
}

export const ForcePasswordResetPage: React.FC<ForcePasswordResetPageProps> = ({
  currentProfile,
  onPasswordResetComplete,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem. Verifique a confirmação.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Atualizar senha e user_metadata no Supabase Auth
      const { error: authErr } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          requires_password_change: false
        }
      });

      if (authErr) {
        throw new Error(authErr.message || 'Erro ao atualizar senha no Supabase Auth.');
      }

      // 2. Atualizar coluna requires_password_change = false em public.profiles
      const targetUserId = (await supabase.auth.getUser())?.data?.user?.id || currentProfile?.id;
      const { data: updatedProfile, error: profileErr } = await supabase
        .from('profiles')
        .update({
          requires_password_change: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId)
        .select('*')
        .maybeSingle();

      if (profileErr) {
        console.error('🚨 Erro ao atualizar perfil após troca de senha:', profileErr.message);
      } else {
        console.log('✅ Perfil atualizado no Postgres com requires_password_change=false:', updatedProfile);
      }

      const activeProfile: Profile = {
        ...(updatedProfile || currentProfile),
        requires_password_change: false,
      };

      setSuccessMessage('Senha redefinida com sucesso! Redirecionando para o workspace...');

      setTimeout(() => {
        onPasswordResetComplete(activeProfile);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao redefinir a senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#080c14',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(56, 189, 248, 0.1)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.2))',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              marginBottom: '16px',
            }}
          >
            <KeyRound size={28} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            Redefinição Obrigatória de Senha
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px', lineHeight: '1.5' }}>
            Olá, <strong style={{ color: '#38bdf8' }}>{currentProfile.full_name || currentProfile.email}</strong>. Por medida de segurança da política corporativa, você deve alterar sua senha temporária no primeiro acesso.
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#4ade80',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Nova Senha Corporativa
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
              />
              <input
                id="new-password-input"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(51, 65, 85, 0.8)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Confirmar Nova Senha
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
              />
              <input
                id="confirm-password-input"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(51, 65, 85, 0.8)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <button
            id="btn-salvar-nova-senha"
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
              border: 'none',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)',
              marginTop: '8px',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Atualizando senha...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Salvar Nova Senha e Acessar Plataforma</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
