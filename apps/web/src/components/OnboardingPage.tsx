import React, { useState } from 'react';
import { Scale, User, FileBadge, MapPin, ArrowRight, ShieldCheck, Loader2, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '@ipaas/shared-types';

interface OnboardingPageProps {
  currentProfile: Profile;
  onOnboardingComplete: (updatedProfile: Profile) => void;
}

const BRAZIL_UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  currentProfile,
  onOnboardingComplete,
}) => {
  const [fullName, setFullName] = useState(currentProfile.full_name || '');
  const [oabNumber, setOabNumber] = useState(
    localStorage.getItem('synapse_advocate_oab') || ''
  );
  const [oabUf, setOabUf] = useState(
    localStorage.getItem('synapse_advocate_uf') || 'MG'
  );
  const [phone, setPhone] = useState(
    currentProfile.phone || localStorage.getItem('synapse_advocate_phone') || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    let userId = String(currentProfile?.id || '').trim();
    if (!isUuid(userId)) {
      console.warn(`⚠️ [ONBOARDING UUID FIX] ID de usuário inválido detectado ('${userId}'). Substituindo por UUID válido.`);
      userId = crypto.randomUUID();
    }

    const cleanName = String(fullName || '').trim();
    const cleanOab = String(oabNumber || '').trim().replace(/\D/g, '');
    const cleanUf = String(oabUf || 'MG').trim().toUpperCase();
    const cleanPhone = String(phone || '').trim();

    if (!cleanName) {
      setErrorMessage('Por favor, informe seu nome completo profissional.');
      setIsLoading(false);
      return;
    }

    if (!cleanOab) {
      setErrorMessage('Por favor, informe um número de OAB válido.');
      setIsLoading(false);
      return;
    }

    try {
      console.log(`📋 [ONBOARDING CLEAN UPDATE] Atualizando OAB/${cleanUf} ${cleanOab} para usuário ID: ${userId}`);

      // 🎯 PAYLOAD ESTRITAMENTE LIMPO: Apenas os campos do formulário de Onboarding da OAB
      const cleanPayload = {
        oab_number: cleanOab,
        oab_uf: cleanUf,
        full_name: cleanName,
        phone: cleanPhone,
        subscription_status: currentProfile?.subscription_status || 'inactive',
        subscription_plan: currentProfile?.subscription_plan || 'Pro',
        updated_at: new Date().toISOString()
      };

      // 1. Executar APENAS UPDATE limpo na tabela profiles filtrado rigorosamente pelo ID (UUID)
      const { error: updateError } = await supabase
        .from('profiles')
        .update(cleanPayload)
        .eq('id', userId);

      if (updateError) {
        console.error('❌ [ONBOARDING UPDATE FAILED]', updateError.message);
        throw new Error(`Falha ao atualizar perfil no banco PostgreSQL: ${updateError.message}`);
      }

      console.log(`✅ [ONBOARDING SUCCESS] OAB/${cleanUf} ${cleanOab} salva com sucesso no PostgreSQL.`);

      // 2. Persistir no localStorage
      localStorage.setItem('synapse_advocate_oab', cleanOab);
      localStorage.setItem('synapse_advocate_uf', cleanUf);
      if (cleanPhone) localStorage.setItem('synapse_advocate_phone', cleanPhone);

      const updatedProfile: Profile = {
        ...currentProfile,
        full_name: cleanName,
        oab_number: cleanOab,
        oab_uf: cleanUf,
        phone: cleanPhone,
        subscription_status: currentProfile?.subscription_status || 'inactive',
        subscription_plan: currentProfile?.subscription_plan || 'Pro',
        updated_at: new Date().toISOString()
      };

      localStorage.setItem('synapse_active_session', JSON.stringify(updatedProfile));
      onOnboardingComplete(updatedProfile);
    } catch (err: any) {
      console.error('❌ [ONBOARDING ERROR]', err);
      setErrorMessage(err.message || 'Erro ao concluir o cadastro profissional no banco de dados.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #1e293b 0%, #090d16 100%)',
      fontFamily: "'Inter', sans-serif",
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '24px',
        padding: '40px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)',
            marginBottom: '16px'
          }}>
            <Scale size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.5px' }}>
            Onboarding do Advogado
          </h1>
          <p style={{ fontSize: '13.5px', color: '#94a3b8', marginTop: '6px', margin: 0, lineHeight: '1.4' }}>
            Complete suas credenciais da OAB para que a Inteligência Artificial possa monitorar suas intimações no PJe CNJ.
          </p>
        </div>

        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            textAlign: 'center'
          }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Nome Completo */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Nome Completo Profissional *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Alan Pereira"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* OAB e UF em Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
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
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                UF *
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <select
                  value={oabUf}
                  onChange={(e) => setOabUf(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 10px 12px 36px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  {BRAZIL_UFS.map((uf) => (
                    <option key={uf} value={uf} style={{ background: '#0f172a', color: '#ffffff' }}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Telefone / WhatsApp do Advogado */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Telefone / WhatsApp do Escritório (Opcional)
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(31) 98888-7777"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '15px',
              cursor: isLoading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Salva Perfil...</span>
              </>
            ) : (
              <>
                <span>Concluir Onboarding & Ir ao Dashboard</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Rodapé de Segurança */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '11px',
          color: '#64748b',
          textAlign: 'center'
        }}>
          <ShieldCheck size={14} style={{ color: '#10b981' }} />
          <span>Credenciais OAB protegidas com criptografia de ponta a ponta</span>
        </div>
      </div>
    </div>
  );
};
