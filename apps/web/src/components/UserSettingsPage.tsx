import React, { useState } from 'react';
import { User, Lock, Moon, Sun, Camera, Save, CheckCircle, ShieldCheck, Phone, BadgeCheck, Mail, MapPin, Key, Scale } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'profile' | 'oab_credentials' | 'security'>('profile');

  // Estados de Perfil e Advocacia
  const [fullName, setFullName] = useState(currentProfile?.full_name || 'Dr. Alan Pereira');
  const [email, setEmail] = useState(currentProfile?.email || 'alanlpereira@hotmail.com');
  const [phone, setPhone] = useState(currentProfile?.phone || '+55 37 9958-3402');
  const [oabNumber, setOabNumber] = useState('145105');
  const [oabUf, setOabUf] = useState('MG');
  const [invoicePassword, setInvoicePassword] = useState('123456');
  const [avatarUrl, setAvatarUrl] = useState(currentProfile?.avatar_url || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150');

  // Estados de Segurança
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('synapse_biometric_enabled') === 'true';
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado de Sucesso no Perfil
  const [profileSaved, setProfileSaved] = useState(false);

  // Alternar Biometria
  const handleToggleBiometrics = () => {
    const nextVal = !isBiometricsEnabled;
    setIsBiometricsEnabled(nextVal);
    localStorage.setItem('synapse_biometric_enabled', nextVal ? 'true' : 'false');
    setSecurityMessage({
      type: 'success',
      text: nextVal ? 'Biometria (Touch ID / Face ID) ativada com sucesso!' : 'Biometria desabilitada com sucesso neste dispositivo.'
    });
  };

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
      email,
      phone,
      professional_id: `OAB/${oabUf} ${oabNumber}`,
      avatar_url: avatarUrl,
    };

    // Salvar também no LocalStorage para persistência rápida de sessão
    localStorage.setItem('synapse_advocate_oab', oabNumber);
    localStorage.setItem('synapse_advocate_uf', oabUf);
    localStorage.setItem('synapse_advocate_phone', phone);
    localStorage.setItem('synapse_advocate_email', email);

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
      setSecurityMessage({ type: 'error', text: 'A nova senha deve conter no mínimo 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'As senhas digitadas não coincidem.' });
      return;
    }

    // Salvar nova senha localmente e atualizar credencial
    localStorage.setItem('synapse_user_rodrigo_moura_password', newPassword);
    setSecurityMessage({ type: 'success', text: 'Sua senha foi alterada com sucesso!' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div style={{ flex: 1, padding: '28px 24px', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Scale size={24} style={{ color: 'var(--accent-blue)' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Menu do Advogado e Configurações
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Cadastre seu registro de OAB, UF, telefone corporativo, e-mail e credenciais do portal jurídico.
        </p>
      </div>

      {/* Tabs de Seções */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '12px',
        marginBottom: '24px',
        overflowX: 'auto',
      }}>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'profile' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
            color: activeTab === 'profile' ? 'var(--accent-blue)' : 'var(--text-muted)',
            transition: 'all 0.2s ease',
          }}
        >
          <User size={16} /> Dados Corporativos
        </button>

        <button
          onClick={() => setActiveTab('oab_credentials')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'oab_credentials' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
            color: activeTab === 'oab_credentials' ? 'var(--accent-blue)' : 'var(--text-muted)',
            transition: 'all 0.2s ease',
          }}
        >
          <BadgeCheck size={16} /> Credenciais da OAB / CNJ
        </button>

        <button
          onClick={() => setActiveTab('security')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'security' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
            color: activeTab === 'security' ? 'var(--accent-blue)' : 'var(--text-muted)',
            transition: 'all 0.2s ease',
          }}
        >
          <ShieldCheck size={16} /> Segurança e Acesso
        </button>
      </div>

      {/* Conteúdo Aba: Dados Corporativos */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Avatar Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={avatarUrl}
                alt="Foto do Advogado"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--accent-blue)',
                }}
              />
              <label htmlFor="avatar-upload" style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: 'var(--accent-blue)',
                color: '#fff',
                borderRadius: '50%',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>
                <Camera size={14} />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{fullName}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                OAB/{oabUf} nº {oabNumber} • Synapse Legal AI
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Nome Completo do Advogado
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                E-mail Corporativo
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Telefone Corporativo (WhatsApp)
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+55 37 9958-3402"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'var(--accent-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Save size={16} /> Salvar Dados Corporativos
            </button>
          </div>

          {profileSaved && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid #22c55e',
              borderRadius: '8px',
              color: '#22c55e',
              fontSize: '13px',
            }}>
              <CheckCircle size={16} /> Dados corporativos salvos com sucesso!
            </div>
          )}
        </form>
      )}

      {/* Conteúdo Aba: Credenciais da OAB / CNJ */}
      {activeTab === 'oab_credentials' && (
        <form onSubmit={handleSaveProfile} style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '10px',
            padding: '16px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            lineHeight: '1.5'
          }}>
            ℹ️ As credenciais da OAB cadastradas abaixo serão utilizadas automaticamente na consulta diária das 08:00 AM do PJe Comunica.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Número da OAB
              </label>
              <div style={{ position: 'relative' }}>
                <BadgeCheck size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={oabNumber}
                  onChange={(e) => setOabNumber(e.target.value)}
                  placeholder="145105"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                UF da OAB
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select
                  value={oabUf}
                  onChange={(e) => setOabUf(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  <option value="MG">MG - Minas Gerais</option>
                  <option value="SP">SP - São Paulo</option>
                  <option value="RJ">RJ - Rio de Janeiro</option>
                  <option value="ES">ES - Espírito Santo</option>
                  <option value="PR">PR - Paraná</option>
                  <option value="RS">RS - Rio Grande do Sul</option>
                  <option value="DF">DF - Distrito Federal</option>
                  <option value="BA">BA - Bahia</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Senha de Abertura de Anexos / Faturas
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={invoicePassword}
                  onChange={(e) => setInvoicePassword(e.target.value)}
                  placeholder="Defina a senha dos anexos PDF"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'var(--accent-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Save size={16} /> Salvar Credenciais OAB
            </button>
          </div>
        </form>
      )}

      {/* Conteúdo Aba: Segurança */}
      {activeTab === 'security' && (
        <div style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Seção de Gerenciamento da Biometria */}
          <div style={{
            background: isBiometricsEnabled ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${isBiometricsEnabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
                ☝️ Autenticação por Biometria (Touch ID / Face ID)
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                Permite o acesso instantâneo ao portal pelo smartphone sem digitar senha após o 1º acesso.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '11px',
                background: isBiometricsEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: isBiometricsEnabled ? '#22c55e' : '#ef4444',
                padding: '4px 10px',
                borderRadius: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap'
              }}>
                {isBiometricsEnabled ? '🟢 Ativado' : '🔴 Desativado'}
              </span>

              <button
                type="button"
                onClick={handleToggleBiometrics}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: isBiometricsEnabled ? '#ef4444' : '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                {isBiometricsEnabled ? 'Desabilitar Biometria' : 'Ativar Biometria'}
              </button>
            </div>
          </div>

          {/* Seção de Alteração de Senha */}
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Alterar Senha de Acesso
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Nova Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Confirmar Nova Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>
            </div>

            {securityMessage && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                background: securityMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${securityMessage.type === 'success' ? '#22c55e' : '#ef4444'}`,
                color: securityMessage.type === 'success' ? '#22c55e' : '#ef4444',
              }}>
                {securityMessage.text}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: 'var(--accent-blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Save size={16} /> Alterar Senha
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
