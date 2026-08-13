import React, { useState } from 'react';
import { LayoutDashboard, Sparkles, Users, Workflow, LayoutTemplate, Settings, LogOut, Scale, ShieldCheck, Search, Bell, ChevronRight, Menu, X, Activity, Radio, Lock, Building2 } from 'lucide-react';
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
  const isMasterOrAdmin = currentProfile?.role === 'Master' || currentProfile?.role === 'Admin';
  const isMaster = currentProfile?.role === 'Master';

  const navItems = [
    // Módulo Jurídico (Disponível para todos os perfis, inclusive Dr. Rodrigo Moura)
    { id: 'dashboard' as ViewTab, label: 'Portal de Processos', icon: <Scale size={18} />, badge: 'PJe Live', group: 'Módulo Jurídico' },
    { id: 'copilot' as ViewTab, label: 'Legal Copilot (IA)', icon: <Sparkles size={18} style={{ color: '#38bdf8' }} />, badge: 'Gemini 1.5', group: 'Módulo Jurídico' },
    { id: 'clients' as ViewTab, label: 'Clientes & Casos', icon: <Users size={18} />, group: 'Módulo Jurídico' },

    // Módulo de Automação / Engenharia de Fluxos (Exibido para Admin/Master com controle de acesso)
    ...(isMasterOrAdmin ? [
      { id: 'dashboard_flows' as ViewTab, label: 'Dashboard de Fluxos', icon: <LayoutDashboard size={18} />, group: 'Automações & IPaaS' },
      { id: 'editor' as ViewTab, label: 'Editor de Fluxos', icon: <Workflow size={18} />, group: 'Automações & IPaaS' },
      { id: 'executions' as ViewTab, label: 'Painel de Execuções', icon: <Activity size={18} />, group: 'Automações & IPaaS' },
      { id: 'audit' as ViewTab, label: 'Inspecionar com IA', icon: <Radio size={18} style={{ color: '#38bdf8' }} />, badge: 'IA Audit', group: 'Automações & IPaaS' },
      { id: 'templates' as ViewTab, label: 'Galeria de Modelos', icon: <LayoutTemplate size={18} />, group: 'Automações & IPaaS' },
      { id: 'integrations' as ViewTab, label: 'Cofre de Integrações', icon: <Lock size={18} />, group: 'Automações & IPaaS' },
    ] : []),

    // Administração da Plataforma (Exibido apenas para Master)
    ...(isMaster ? [
      { id: 'masterAdmin' as ViewTab, label: 'Admin Master Global', icon: <ShieldCheck size={18} color="#f59e0b" />, group: 'Administração' },
      { id: 'tenantAdmin' as ViewTab, label: 'Gestão da Organização', icon: <Building2 size={18} />, group: 'Administração' },
    ] : []),

    // Configurações Gerais
    { id: 'settings' as ViewTab, label: 'Configurações', icon: <Settings size={18} />, group: 'Geral' },
  ];

  const advocateName = currentProfile?.full_name || 'Dr. Rodrigo Moura Rodrigues';
  const advocateOab = 'OAB/MG 145105';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#080c14', color: '#f8fafc', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      
      {/* SIDEBAR LATERAL COM CABEÇALHO E RODAPÉ FIXOS E ÁREA DE NAVEGAÇÃO ROLÁVEL */}
      <aside style={{
        width: '260px',
        height: '100%',
        background: 'rgba(15, 23, 42, 0.95)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 50,
        boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
      }}>
        {/* 📌 CABEÇALHO DA LOGOMARCA (FIXO NO TOPO - NUNCA ESCONDE) */}
        <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)' }}>
              <Scale size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>Advocacia IA</h1>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>NexusFlow IPaaS</span>
            </div>
          </div>
        </div>

        {/* 📜 ÁREA DE ROLAGEM DE MENUS (COM OVERFLOW-Y AUTO E SCROLLBAR ESTILIZADO) */}
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
                    onClick={() => onNavigate(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
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

        {/* 📌 RODAPÉ DO PERFIL DO ADVOGADO (FIXO EMBAIXO - NUNCA CORTA) */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0, background: 'rgba(15, 23, 42, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '13px' }}>
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
              {currentTab === 'dashboard_flows' && '📊 Dashboard de Fluxos e Execuções'}
              {currentTab === 'editor' && '🔄 Editor de Fluxos e Automações'}
              {currentTab === 'executions' && '⚡ Painel de Histórico de Execuções'}
              {currentTab === 'audit' && '🤖 Auditoria & Otimização com IA'}
              {currentTab === 'templates' && '📄 Galeria de Modelos Jurídicos'}
              {currentTab === 'integrations' && '🔑 Cofre de Credenciais & Tokens'}
              {currentTab === 'masterAdmin' && '👑 Painel de Administração Master'}
              {currentTab === 'tenantAdmin' && '🏢 Gestão da Organização'}
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
