import React, { useState } from 'react';
import { LayoutDashboard, Sparkles, Users, Workflow, LayoutTemplate, Settings, LogOut, Scale, ShieldCheck, Search, Bell, ChevronRight, Menu, X } from 'lucide-react';
import { ViewTab } from './Navbar';
import { Profile } from '@ipaas/shared-types';

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
  const navItems = [
    { id: 'dashboard' as ViewTab, label: 'Portal de Processos', icon: <Scale size={18} />, badge: 'PJe Live' },
    { id: 'copilot' as ViewTab, label: 'Legal Copilot (IA)', icon: <Sparkles size={18} style={{ color: '#38bdf8' }} />, badge: 'Gemini 1.5' },
    { id: 'clients' as ViewTab, label: 'Clientes & Casos', icon: <Users size={18} /> },
    { id: 'editor' as ViewTab, label: 'Editor de Fluxos', icon: <Workflow size={18} /> },
    { id: 'templates' as ViewTab, label: 'Galeria de Modelos', icon: <LayoutTemplate size={18} /> },
    { id: 'settings' as ViewTab, label: 'Configurações', icon: <Settings size={18} /> },
  ];

  const advocateName = currentProfile?.full_name || 'Dr. Rodrigo Moura Rodrigues';
  const advocateOab = 'OAB/MG 145105';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#080c14', color: '#f8fafc', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      
      {/* SIDEBAR LATERAL FIXA */}
      <aside style={{
        width: '260px',
        height: '100%',
        background: 'rgba(15, 23, 42, 0.95)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 16px',
        flexShrink: 0,
        zIndex: 50,
        boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
      }}>
        <div>
          {/* Logo & Marca */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', paddingLeft: '8px' }}>
            <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)' }}>
              <Scale size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>Advocacia IA</h1>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>NexusFlow IPaaS</span>
            </div>
          </div>

          {/* Menus Principais da Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', paddingLeft: '12px', marginBottom: '8px' }}>
              Navegação Principal
            </div>

            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.icon}
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span style={{ fontSize: '10px', background: isActive ? '#0284c7' : 'rgba(255,255,255,0.1)', color: '#ffffff', padding: '2px 7px', borderRadius: '10px', fontWeight: 700 }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rodapé da Sidebar (Perfil do Advogado) */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '14px' }}>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Header Superior Limpo */}
        <header style={{
          height: '60px',
          padding: '0 24px',
          background: 'rgba(15, 23, 42, 0.8)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              {currentTab === 'dashboard' && '🏛️ Portal de Intimações & Processos CNJ'}
              {currentTab === 'copilot' && '⚖️ Legal Copilot (Assistente de Redação IA)'}
              {currentTab === 'clients' && '👥 Gestão de Clientes & Casos'}
              {currentTab === 'editor' && '🔄 Editor de Fluxos e Automações'}
              {currentTab === 'templates' && '📄 Galeria de Modelos Jurídicos'}
              {currentTab === 'settings' && '⚙️ Configurações do Sistema'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              PJe Comunica Online
            </div>

            <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
              <Bell size={16} />
            </button>
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
