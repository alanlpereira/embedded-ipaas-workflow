import React, { useState } from 'react';
import { MessageSquare, ExternalLink, X, PhoneCall, ShieldCheck } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/5532988654825?text=Ol%C3%A1!%20Gostaria%20de%20atendimento%20humano%20para%20o%20sistema%20Synapse.';

interface FloatingHelpWidgetProps {
  onOpenFullHelpDesk?: () => void;
  onNavigate?: (tab: any) => void;
}

export const FloatingHelpWidget: React.FC<FloatingHelpWidgetProps> = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: 'Inter, sans-serif' }}>
      
      {/* Mini Card Flutuante de Contato WhatsApp */}
      {isOpen && (
        <div style={{
          marginBottom: '12px',
          width: '320px',
          background: '#0f172a',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          color: '#f8fafc',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Header do Mini Card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Suporte Humano Online
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>
              Fale com o Atendimento
            </h4>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: '1.4' }}>
              Dúvidas sobre o Synapse? Clique abaixo para abrir uma conversa direta no WhatsApp.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', fontWeight: 700 }}>
            <PhoneCall size={14} color="#10b981" />
            +55 (32) 98865-4825
          </div>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 18px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              textDecoration: 'none',
              boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)'
            }}
          >
            <MessageSquare size={16} />
            <span>Iniciar WhatsApp</span>
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* Botão Flutuante Principal */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '50px',
          fontSize: '13px',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.45)',
          transition: 'all 0.2s ease',
        }}
        title="Solicite ajuda humana no WhatsApp (+55 32 98865-4825)"
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <MessageSquare size={18} />
          <span style={{ position: 'absolute', top: '-3px', right: '-3px', width: '8px', height: '8px', background: '#34d399', borderRadius: '50%', border: '2px solid #0f172a' }} />
        </div>
        <span>Suporte WhatsApp</span>
      </button>
    </div>
  );
};
