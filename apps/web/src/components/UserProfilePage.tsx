import React, { useState, useRef } from 'react';
import { User, Mail, Phone, FileBadge, MapPin, Save, CheckCircle2, Camera, Upload, Trash2, Sparkles } from 'lucide-react';
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
  const [avatarUrl, setAvatarUrl] = useState<string>(
    currentProfile?.avatar_url || (typeof window !== 'undefined' ? localStorage.getItem('synapse_advocate_avatar') || '' : '')
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Upload de Imagem de Perfil (Supabase Storage com Fallback Base64 DataURL)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('⚠️ Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('⚠️ A imagem deve ter no máximo 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    showToast('📤 Processando sua foto de perfil...');

    try {
      // 1. Tentar upload direto no Supabase Storage (Bucket 'legal_copilot_files')
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('legal_copilot_files')
        .upload(filePath, file, { upsert: true });

      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('legal_copilot_files')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          setAvatarUrl(publicUrlData.publicUrl);
          localStorage.setItem('synapse_advocate_avatar', publicUrlData.publicUrl);
          showToast('📸 Foto de perfil atualizada com sucesso!');
          setIsUploadingPhoto(false);
          return;
        }
      }

      // 2. Fallback de FileReader Base64 para garantir pré-visualização e salvamento imediato
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        if (base64Url) {
          setAvatarUrl(base64Url);
          localStorage.setItem('synapse_advocate_avatar', base64Url);
          showToast('📸 Foto de perfil carregada com sucesso!');
        }
        setIsUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.warn('⚠️ Aviso ao processar foto:', err);
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    localStorage.removeItem('synapse_advocate_avatar');
    showToast('🗑️ Foto de perfil removida.');
  };

  const isMaster = Boolean(
    currentProfile?.role === 'Master' ||
    currentProfile?.email === 'alanlpereira@hotmail.com' ||
    currentProfile?.email === 'alan.pereira@alp-nexus.com' ||
    (currentProfile?.email && currentProfile.email.includes('master'))
  );

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

      const cleanOab = (isMaster ? oabNumber : (currentProfile?.oab_number || oabNumber)).trim();
      const cleanUf = (isMaster ? oabUf : (currentProfile?.oab_uf || oabUf)).trim().toUpperCase();
      const cleanName = fullName.trim();
      const cleanPhone = phone.trim();

      const updatePayload: Record<string, any> = {
        full_name: cleanName,
        phone: cleanPhone,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      // 🔐 Apenas o usuário Master pode alterar OAB e UF
      if (isMaster) {
        updatePayload.oab_number = cleanOab;
        updatePayload.oab_uf = cleanUf;
        updatePayload.professional_id = cleanOab ? `OAB/${cleanUf} ${cleanOab}` : '';
      }

      // Persistir no Supabase public.profiles (incluindo avatar_url)
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', targetUserId)
        .select('*')
        .single();

      if (error) {
        console.warn('⚠️ Aviso ao atualizar tabela profiles:', error.message);
      }

      // Atualizar no localStorage
      localStorage.setItem('synapse_advocate_oab', cleanOab);
      localStorage.setItem('synapse_advocate_uf', cleanUf);
      if (avatarUrl) {
        localStorage.setItem('synapse_advocate_avatar', avatarUrl);
      } else {
        localStorage.removeItem('synapse_advocate_avatar');
      }

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
        avatar_url: avatarUrl,
      } as Profile;

      localStorage.setItem('synapse_active_session', JSON.stringify(mergedProfile));

      if (onUpdateProfile) {
        onUpdateProfile(mergedProfile);
      }

      showToast('✅ Perfil e foto atualizados com sucesso!');
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
              Altere sua foto de perfil, dados pessoais, número da OAB e dados de contato.
            </p>
          </div>
        </div>
      </div>

      {/* Input de Arquivo Oculto para Seleção de Imagem */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageSelect}
        style={{ display: 'none' }}
      />

      {/* Card Principal do Formulário */}
      <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '28px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 📸 SEÇÃO DE FOTO DE PERFIL DO USUÁRIO */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            padding: '20px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px dashed rgba(56, 189, 248, 0.3)',
            borderRadius: '16px'
          }}>
            {/* Avatar Preview */}
            <div style={{ position: 'relative' }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Foto do Perfil"
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #38bdf8',
                    boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)'
                  }}
                />
              ) : (
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  border: '3px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b'
                }}>
                  <User size={40} />
                </div>
              )}

              {/* Botão Flutuante de Câmera */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Carregar Nova Foto"
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  background: '#38bdf8',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                }}
              >
                <Camera size={16} />
              </button>
            </div>

            {/* Ações de Foto */}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
                Foto de Perfil Profissional
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px 0' }}>
                Envie uma foto em alta resolução (PNG, JPG ou WEBP até 5MB). Ela será exibida no sistema e nos relatórios.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: isUploadingPhoto ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Upload size={14} />
                  {isUploadingPhoto ? 'Carregando Foto...' : 'Escolher Foto do Dispositivo'}
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>

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
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                  Número da OAB * {!isMaster && <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Estático)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <FileBadge size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    required
                    readOnly={!isMaster}
                    disabled={!isMaster}
                    value={oabNumber}
                    onChange={(e) => isMaster && setOabNumber(e.target.value)}
                    placeholder="123456"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      background: isMaster ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      color: isMaster ? '#ffffff' : '#94a3b8',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: isMaster ? 'text' : 'not-allowed'
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
                    disabled={!isMaster}
                    value={oabUf}
                    onChange={(e) => isMaster && setOabUf(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      background: isMaster ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      color: isMaster ? '#ffffff' : '#94a3b8',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: isMaster ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
                      <option key={uf} value={uf} style={{ background: '#0f172a', color: '#ffffff' }}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {!isMaster && (
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                🔒 O número e a UF da OAB são estáticos e definidos na assinatura. Somente o usuário Master pode alterar a OAB.
              </span>
            )}
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
              disabled={isSaving || isUploadingPhoto}
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
                cursor: (isSaving || isUploadingPhoto) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
                opacity: (isSaving || isUploadingPhoto) ? 0.7 : 1
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
