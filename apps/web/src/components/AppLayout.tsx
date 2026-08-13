import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Sparkles, Users, Workflow, LayoutTemplate, Settings, LogOut, Scale, ShieldCheck, Search, Bell, ChevronRight, Menu, X, Activity, Radio, Lock, Building2 } from 'lucide-react';
import { ViewTab } from './Navbar';
import { Profile, PlanTier } from '@ipaas/shared-types';
import { EditionBadge } from './EditionBadge';

interface AppLayoutProps {
  currentTab: ViewTab;
  onNavigate: (tab: ViewTab) => void;
  currentProfile: Profile | null;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onNavigate,
  currentProfile,
  onLogout,
  children
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobileScreen(mobile);
      if (!mobile) setIsMobileMenuOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isRodrigoOrLegalOps = currentProfile?.organization_id === 'org-legal-ops' || currentProfile?.email?.includes('rodrigo.moura');
  const currentEdition: PlanTier = isRodrigoOrLegalOps ? 'LegalOps' : 'Synapse';

  const isMasterOrAdmin = (currentProfile?.role === 'Master' || currentProfile?.role === 'Admin') && !isRodrigoOrLegalOps;
  const isMaster = currentProfile?.role === 'Master' && !isRodrigoOrLegalOps;

  const navItems = [
    // Módulo Jurídico (Disponível para todos os perfis, inclusive Dr. Rodrigo Moura)
    { id: 'dashboard' as ViewTab, label: 'Portal de Processos', icon: <Scale size={18} />, badge: 'PJe Live', group: 'Módulo Jurídico' },
    { id: 'copilot' as ViewTab, label: 'Legal Copilot (IA)', icon: <Sparkles size={18} style={{ color: '#38bdf8' }} />, badge: 'Gemini 1.5', group: 'Módulo Jurídico' },
    { id: 'clients' as ViewTab, label: 'Clientes & Casos', icon: <Users size={18} />, group: 'Módulo Jurídico' },

    // Módulo de Automação / Engenharia de Fluxos (Exibido para Admin/Master de edições completas)
    ...(isMasterOrAdmin ? [
      { id: 'dashboard_flows' as ViewTab, label: 'Dashboard de Fluxos', icon: <LayoutDashboard size={18} />, group: 'Automações & IPaaS' },
      { id: 'editor' as ViewTab, label: 'Editor de Fluxos', icon: <Workflow size={18} />, group: 'Automações & IPaaS' },
      { id: 'executions' as ViewTab, label: 'Painel de Execuções', icon: <Activity size={18} />, group: 'Automações & IPaaS' },
      { id: 'audit' as ViewTab, label: 'Inspecionar com IA', icon: <Radio size={18} style={{ color: '#38bdf8' }} />, badge: 'IA Audit', group: 'Automações & IPaaS' },
      { id: 'templates' as ViewTab, label: 'Galeria de Modelos', icon: <LayoutTemplate size={18} />, group: 'Automações & IPaaS' },
      { id: 'integrations' as ViewTab, label: 'Cofre de Integrações', icon: <Lock size={18} />, group: 'Automações & IPaaS' },
    ] : []),

    // Administração da Plataforma (Exibido para Master / Admin)
    ...(isMaster ? [
      { id: 'masterAdmin' as ViewTab, label: 'Admin Master Global', icon: <ShieldCheck size={18} color="#f59e0b" />, group: 'Administração' },
    ] : []),
    { id: 'tenantAdmin' as ViewTab, label: 'Gestão da Organização', icon: <Building2 size={18} />, group: 'Administração' },

    // Configurações Gerais
    { id: 'settings' as ViewTab, label: 'Configurações', icon: <Settings size={18} />, group: 'Geral' },
  ];

  const advocateName = currentProfile?.full_name || 'Dr. Rodrigo Moura Rodrigues';
  const advocateOab = currentProfile?.professional_id || 'OAB/MG 145105';

  const handleSelectNav = (tab: ViewTab) => {
    onNavigate(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#080c14', color: '#f8fafc', overflow: 'hidden', fontFamily: 'Inter, sans-serif', position: 'relative' }}>
      
      {/* 📱 BACKDROP/OVERLAY ESCURO PARA CELULAR */}
      {isMobileScreen && isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
          }}
        />
      )}

      {/* 📌 SIDEBAR LATERAL (DESKTOP: FIXA / MOBILE: DRAWER COM OVERLAY COMPLETO) */}
      <aside style={{
        width: '280px',
        height: '100%',
        background: '#0f172a',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 1000,
        boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
        position: isMobileScreen ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        transform: (isMobileScreen && !isMobileMenuOpen) ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* 📌 CABEÇALHO DA LOGOMARCA (SYNAPSE - FIXO NO TOPO COM BADGE DE EDIÇÃO) */}
        <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/logo-synapse.jpg"
              alt="Logo Synapse"
              style={{ height: '36px', width: 'auto', objectFit: 'contain', borderRadius: '8px', filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.4))' }}
              className="h-9 w-auto"
            />
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.4px' }}>Synapse</h1>
              <div style={{ marginTop: '2px' }}>
                <EditionBadge edition={currentEdition} size="small" />
              </div>
            </div>
          </div>

          {/* Botão X para fechar no mobile */}
          {isMobileScreen && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#ffffff', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* 📜 ÁREA DE ROLAGEM DE MENUS DA SIDEBAR */}
        <div
          className="no-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {Array.from(new Set(navItems.map(i => i.group))).map((groupName) => (
            <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', paddingLeft: '10px', marginBottom: '6px' }}>
                {groupName}
              </div>

              {navItems.filter(i => i.group === groupName).map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectNav(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: isActive ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)' : 'transparent',
                      color: isActive ? '#38bdf8' : '#94a3b8',
                      border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {item.icon}
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span style={{ fontSize: '10px', background: isActive ? '#0284c7' : 'rgba(255,255,255,0.1)', color: '#ffffff', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* 📌 RODAPÉ FIXO DO ADVOGADO */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0, background: '#0f172a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isRodrigoOrLegalOps ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '13px' }}>
              RM
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {advocateName}
              </p>
              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={11} /> {advocateOab}
              </span>
            </div>
            {onLogout && (
              <button onClick={onLogout} title="Sair" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL DA APLICAÇÃO */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', width: isMobileScreen ? '100vw' : 'calc(100vw - 280px)' }}>
        
        {/* Header Superior Responsivo com Botão Hambúrguer no Celular */}
        <header style={{
          height: '60px',
          padding: '0 16px',
          background: 'rgba(15, 23, 42, 0.8)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Botão Hambúrguer no Celular */}
            {isMobileScreen && (
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Menu size={20} />
              </button>
            )}

            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTab === 'dashboard' && '🏛️ Portal de Intimações & Processos'}
              {currentTab === 'copilot' && '⚖️ Legal Copilot (IA)'}
              {currentTab === 'clients' && '👥 Gestão de Clientes'}
              {currentTab === 'dashboard_flows' && '📊 Dashboard de Fluxos'}
              {currentTab === 'editor' && '🔄 Editor de Fluxos'}
              {currentTab === 'executions' && '⚡ Histórico de Execuções'}
              {currentTab === 'audit' && '🤖 Auditoria IA'}
              {currentTab === 'templates' && '📄 Modelos Jurídicos'}
              {currentTab === 'integrations' && '🔑 Cofre de Credenciais'}
              {currentTab === 'masterAdmin' && '👑 Admin Master'}
              {currentTab === 'tenantAdmin' && '🏢 Gestão da Organização'}
              {currentTab === 'settings' && '⚙️ Configurações'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 8px', borderRadius: '16px', fontWeight: 700 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              PJe Online
            </div>
          </div>
        </header>

        {/* Conteúdo da Página */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#080c14' }}>
          {children}
        </main>
      </div>
    </div>
  );
};
