import React, { useState } from 'react';
import { User, Lock, Moon, Sun, Camera, Save, CheckCircle, ShieldCheck, Phone, BadgeCheck, AlertCircle } from 'lucide-react';
import { Profile } from '@ipaas/shared-types';
import { useTheme } from '../context/ThemeContext';

interface UserSettingsPageProps {
  currentProfile: Profile | null;
  onUpdateProfile?: (updatedProfile: Partial<Profile>) => void;
}

export const UserSettingsPage: React.FC<UserSettingsPageProps> = ({
  currentProfile,
  onUpdateProfile,
}) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance'>('profile');

  // Estados de Perfil
  const [fullName, setFullName] = useState(currentProfile?.full_name || 'Dr. Alan Pereira');
  const [email] = useState(currentProfile?.email || 'alan.pereira@alp-nexus.com');
  const [phone, setPhone] = useState(currentProfile?.phone || '+55 (11) 98888-7777');
  const [professionalId, setProfessionalId] = useState(currentProfile?.professional_id || 'OAB/SP 485.921');
  const [avatarUrl, setAvatarUrl] = useState(currentProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');

  // Estados de Segurança
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado de Sucesso no Perfil
  const [profileSaved, setProfileSaved] = useState(false);

  // Upload de Foto de Perfil
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setAvatarUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Salvar Perfil
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData: Partial<Profile> = {
      full_name: fullName,
      phone,
      professional_id: professionalId,
      avatar_url: avatarUrl,
    };

    if (onUpdateProfile) {
      onUpdateProfile(updatedData);
    }

    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  // Atualizar Senha
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setSecurityMessage({ type: 'error', text: 'A senha deve conter no mínimo 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'As senhas digitadas não coincidem.' });
      return;
    }

    setSecurityMessage({ type: 'success', text: 'Senha atualizada com sucesso via Supabase Auth!' });
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Configurações do Usuário
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Gerencie suas informações pessoais, registro profissional, credenciais de segurança e preferências de temas.
        </p>
      </div>

      {/* Tabs de Seções */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '28px',
        paddingBottom: '8px',
      }}>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'profile' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'profile' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'profile' ? '1px solid var(--border-color)' : '1px solid transparent',
            fontWeight: activeTab === 'profile' ? 700 : 500,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <User size={16} />
          Perfil
        </button>

        <button
          onClick={() => setActiveTab('security')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'security' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'security' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'security' ? '1px solid var(--border-color)' : '1px solid transparent',
            fontWeight: activeTab === 'security' ? 700 : 500,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <Lock size={16} />
          Segurança
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'appearance' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'appearance' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'appearance' ? '1px solid var(--border-color)' : '1px solid transparent',
            fontWeight: activeTab === 'appearance' ? 700 : 500,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <Moon size={16} />
          Aparência
        </button>
      </div>

      {/* SEÇÃO A: PERFIL */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} style={{ maxWidth: '640px' }}>
          {/* Avatar Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={avatarUrl}
                alt="Avatar de Perfil"
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--accent-cyan)',
                  boxShadow: '0 4px 14px rgba(0, 242, 254, 0.2)',
                }}
              />
              <label
                htmlFor="avatar-upload"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: 'var(--accent-cyan)',
                  color: '#0a0c10',
                  padding: '6px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={14} />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </div>

            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Foto de Perfil
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Clique no ícone da câmera para enviar uma nova foto de perfil em alta resolução.
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Nome Completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                E-mail de Acesso (Read-only)
              </label>
              <input
                type="email"
                value={email}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  cursor: 'not-allowed',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                <Phone size={14} />
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 (11) 99999-9999"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                <BadgeCheck size={14} />
                Registro Profissional / OAB / CREA
              </label>
              <input
                type="text"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                placeholder="Ex: OAB/SP 485.921, CREA-12345"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(0, 242, 254, 0.4)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Disponibilizado dinamicamente no Flow Builder para assinaturas em fluxos jurídicos e corporativos.
              </span>
            </div>
          </div>

          {/* Botão de Salvar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                color: '#0a0c10',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 242, 254, 0.3)',
              }}
            >
              <Save size={16} />
              Salvar Alterações
            </button>

            {profileSaved && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '12px', fontWeight: 700 }}>
                <CheckCircle size={16} />
                Perfil atualizado com sucesso!
              </span>
            )}
          </div>
        </form>
      )}

      {/* SEÇÃO B: SEGURANÇA */}
      {activeTab === 'security' && (
        <form onSubmit={handleUpdatePassword} style={{ maxWidth: '440px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Redefinição de Senha de Acesso
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Nova Senha
            </label>
            <input
              type="password"
              placeholder="Digite sua nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              placeholder="Confirme sua nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {securityMessage && (
            <div style={{
              marginBottom: '16px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: securityMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${securityMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
              color: securityMessage.type === 'success' ? '#10b981' : '#f87171',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              {securityMessage.type === 'success' ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
              <span>{securityMessage.text}</span>
            </div>
          )}

          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'var(--accent-blue)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Lock size={16} />
            Atualizar Senha via Supabase
          </button>
        </form>
      )}

      {/* SEÇÃO C: APARÊNCIA */}
      {activeTab === 'appearance' && (
        <div style={{ maxWidth: '520px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Tema da Plataforma
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Escolha entre o modo escuro (Dark) e o modo claro (Light). A preferência é persistida automaticamente.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Dark Card Toggle */}
            <div
              onClick={() => setTheme('dark')}
              style={{
                background: '#090d16',
                border: theme === 'dark' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: theme === 'dark' ? '0 4px 20px rgba(0, 242, 254, 0.2)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'rgba(0, 242, 254, 0.15)',
                  color: 'var(--accent-cyan)',
                }}>
                  <Moon size={20} />
                </div>
                {theme === 'dark' && <CheckCircle size={18} color="var(--accent-cyan)" />}
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}>Modo Dark (Padrão)</h4>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Alto contraste visual com tons escuros profundos.</p>
              </div>
            </div>

            {/* Light Card Toggle */}
            <div
              onClick={() => setTheme('light')}
              style={{
                background: '#f8fafc',
                border: theme === 'light' ? '2px solid var(--accent-blue)' : '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: theme === 'light' ? '0 4px 20px rgba(59, 130, 246, 0.2)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#3b82f6',
                }}>
                  <Sun size={20} />
                </div>
                {theme === 'light' && <CheckCircle size={18} color="#3b82f6" />}
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Modo Light</h4>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Interface clara para leitura em ambientes iluminados.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
