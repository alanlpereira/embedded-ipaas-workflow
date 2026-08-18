import React from 'react';
import { MessageSquare, ExternalLink, ShieldCheck, Clock, ArrowLeft, PhoneCall, Sparkles } from 'lucide-react';
import { ViewTab } from './Navbar';

const WHATSAPP_URL = 'https://wa.me/5532988654825?text=Ol%C3%A1!%20Gostaria%20de%20atendimento%20humano%20para%20o%20sistema%20Synapse.';

interface HelpDeskChatProps {
  onBack?: () => void;
  isCompact?: boolean;
  onNavigate?: (tab: ViewTab) => void;
}

export const HelpDeskChat: React.FC<HelpDeskChatProps> = ({ onBack }) => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header da Tela - Estilo Oficial Synapse */}
      <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '20px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#94a3b8',
                padding: '10px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '14px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#ffffff', letterSpacing: '-0.4px' }}>
              Suporte & Atendimento Humano
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Fale diretamente com nossa equipe técnica e jurídica via WhatsApp oficial.
            </p>
          </div>
        </div>
      </div>

      {/* Card Principal de Contato WhatsApp - Estilo Oficial Synapse */}
      <div style={{
        background: '#0f172a',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow de Fundo */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Status de Presença */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
            Atendimento Humano Online
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} /> Segunda a Sexta, 09h às 18h (Horário de Brasília)
          </span>
        </div>

        {/* Título do Card */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0' }}>
            Precisa de ajuda com o Synapse?
          </h2>
          <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0, lineHeight: '1.6' }}>
            Nossa equipe de suporte está pronta para responder suas dúvidas sobre navegação, configuração de OAB, intimações no PJe e termos de uso.
          </p>
        </div>

        {/* Destaques de Atendimento */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
              <PhoneCall size={16} /> Número Oficial
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff' }}>
              +55 (32) 98865-4825
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
              <ShieldCheck size={16} /> Atendimento Direto
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>
              Sem robôs, sem filas e com resposta imediata
            </div>
          </div>
        </div>

        {/* Botão Principal de Atendimento Humano WhatsApp */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px' }}>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              width: '100%',
              maxWidth: '440px',
              padding: '16px 28px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(16, 185, 129, 0.35)',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              textAlign: 'center'
            }}
          >
            <MessageSquare size={20} />
            <span>Solicite ajuda humana no WhatsApp</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  );
};
