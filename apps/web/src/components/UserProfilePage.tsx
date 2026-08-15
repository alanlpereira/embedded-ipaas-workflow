import React, { useState } from 'react';
import { User, Mail, Phone, FileBadge, MapPin, Save, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '@ipaas/shared-types';

interface UserProfilePageProps {
  currentProfile: Profile | null;
  onUpdateProfile?: (updated: Profile) => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  currentProfile,
  onUpdateProfile
}) => {
  const [fullName, setFullName] = useState(currentProfile?.full_name || '');
  const [email] = useState(currentProfile?.email || '');
  const [phone, setPhone] = useState(currentProfile?.phone || '');
  const [oabNumber, setOabNumber] = useState(
    currentProfile?.oab_number || (typeof window !== 'undefined' ? localStorage.getItem('synapse_advocate_oab') || '' : '')
  );
  const [oabUf, setOabUf] = useState(
    currentProfile?.oab_uf || (typeof window !== 'undefined' ? localStorage.getItem('synapse_advocate_uf') || 'MG' : 'MG')
  );

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = user?.id || currentProfile?.id;

      if (!targetUserId) {
        showToast('⚠️ Erro ao identificar a sessão do usuário.');
        setIsSaving(false);
        return;
      }

      const cleanOab = oabNumber.trim();
      const cleanUf = oabUf.trim().toUpperCase();
      const cleanName = fullName.trim();
      const cleanPhone = phone.trim();

      // Persistir no Supabase public.profiles
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          full_name: cleanName,
          oab_number: cleanOab,
          oab_uf: cleanUf,
          professional_id: cleanOab ? `OAB/${cleanUf} ${cleanOab}` : '',
          phone: cleanPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId)
        .select('*')
        .single();

      if (error) {
        console.warn('⚠️ Aviso ao atualizar tabela profiles:', error.message);
      }

      // Atualizar no localStorage
      localStorage.setItem('synapse_advocate_oab', cleanOab);
      localStorage.setItem('synapse_advocate_uf', cleanUf);

      const mergedProfile: Profile = {
        ...(currentProfile || {}),
        ...(updatedProfile || {}),
        id: targetUserId,
        email: email,
        full_name: cleanName,
        oab_number: cleanOab,
        oab_uf: cleanUf,
        professional_id: cleanOab ? `OAB/${cleanUf} ${cleanOab}` : '',
        phone: cleanPhone,
      } as Profile;

      localStorage.setItem('synapse_active_session', JSON.stringify(mergedProfile));

      if (onUpdateProfile) {
        onUpdateProfile(mergedProfile);
      }

      showToast('✅ Perfil atualizado com sucesso no Supabase!');
    } catch (err: any) {
      console.error('❌ Erro ao salvar perfil:', err);
      showToast(`❌ Erro ao salvar: ${err.message || 'Falha de conexão'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '24px',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 700,
          fontSize: '13px',
        }}>
          <CheckCircle2 size={18} />
          {toastMessage}
        </div>
      )}

      {/* Header da Tela */}
      <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '12px', color: '#38bdf8' }}>
            <User size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#ffffff' }}>Meu Perfil Jurídico</h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Gerencie suas informações profissionais, número da OAB e dados de contato para intimações.
            </p>
          </div>
        </div>
      </div>

      {/* Card Principal do Formulário */}
      <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '28px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Nome Completo */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
              Nome Completo do Advogado *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Dr. Alan Pereira"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* E-mail (Somente Leitura) */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
              E-mail de Cadastro (Identificador de Sessão)
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                disabled
                value={email}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  color: '#94a3b8',
                  fontSize: '14px',
                  cursor: 'not-allowed',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
              🔒 O e-mail da conta é vinculado ao Supabase Auth e utilizado automaticamente no envio de resumos.
            </span>
          </div>

          {/* Grid: Número OAB + UF */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                Número da OAB *
              </label>
              <div style={{ position: 'relative' }}>
                <FileBadge size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  required
                  value={oabNumber}
                  onChange={(e) => setOabNumber(e.target.value)}
                  placeholder="123456"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                UF *
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <select
                  value={oabUf}
                  onChange={(e) => setOabUf(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
                    <option key={uf} value={uf} style={{ background: '#0f172a', color: '#ffffff' }}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Telefone / WhatsApp */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
              Telefone / WhatsApp (Para Notificações)
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 (31) 99999-9999"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Botão de Salvar */}
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              <Save size={18} />
              {isSaving ? 'Salvando no Banco...' : 'Salvar Alterações do Perfil'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
