import React, { useState } from 'react';
import { Workflow, Save, Play, Globe, LayoutDashboard, Users, LogOut, ArrowLeft, Code, LayoutTemplate, History, Activity, Building2, ShieldCheck, Building, Radio, Download, Upload, Sparkles, Lock, Settings, Menu, X } from 'lucide-react';
import { Profile } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { CollaboratorInfo } from '../collaboration/useYjsCollaboration';
import { EditionBadge } from './EditionBadge';

export type ViewTab = 'dashboard' | 'templates' | 'editor' | 'team' | 'audit' | 'agency' | 'masterAdmin' | 'tenantAdmin' | 'integrations' | 'settings';

interface NavbarProps {
  currentProfile: Profile | null;
  flowchartName: string;
  currentTab: ViewTab;
  onNavigate: (tab: ViewTab) => void;
  onSave?: () => void;
  isSaving?: boolean;
  onLogout?: () => void;
  onOpenEmbedModal?: () => void;
  onOpenVersionModal?: () => void;
  onExportJson?: () => void;
  onOpenImportModal?: () => void;
  onAnalyzeEfficiency?: () => void;
  isAnalyzingEfficiency?: boolean;
  collaborators?: CollaboratorInfo[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProfile,
  flowchartName,
  currentTab,
  onNavigate,
  onSave,
  isSaving,
  onLogout,
  onOpenEmbedModal,
  onOpenVersionModal,
  onExportJson,
  onOpenImportModal,
  onAnalyzeEfficiency,
  isAnalyzingEfficiency,
  collaborators = [],
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { currentOrg } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const canEdit = currentProfile?.role === 'Master' || currentProfile?.role === 'Admin';
  const isMaster = currentProfile?.role === 'Master';
  const isAdminOrMaster = currentProfile?.role === 'Admin' || currentProfile?.role === 'Master';

  const handleMobileNav = (tab: ViewTab) => {
    onNavigate(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    // 4. CONTAINER PAI DA NAVBAR: w-full px-4 justify-between
    <header className="w-full px-4 flex items-center justify-between gap-4 h-16 border-b border-border bg-[#090d16] backdrop-blur-md relative z-[100]" style={{
      height: '64px',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      padding: '0 16px',
      background: '#090d16',
      position: 'relative',
      zIndex: 100,
      width: '100%',
    }}>
      {/* 3. ÍCONES FIXOS E BRANDING DA ESQUERDA: flex-shrink-0 min-w-fit */}
      <div className="flex-shrink-0 min-w-fit flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => onNavigate('dashboard')}
        >
          <img
            src="/assets/synapse-logo.png"
            alt="Synapse Logo"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            style={{ height: '32px', objectFit: 'contain' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '-0.3px', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap' }}>
              {t.appTitle}
            </h1>
            <EditionBadge edition={currentOrg?.plan_tier || 'Synapse'} size="small" />
          </div>
        </div>
      </div>

      {/* 1. CONTAINER DESKTOP COM AS CLASSES hidden md:flex items-center gap-4 */}
      <nav className="hidden md:flex items-center gap-4 flex-1 min-w-0" style={{
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        whiteSpace: 'nowrap',
        flex: 1,
        minWidth: 0,
      }}>
        <button
          onClick={() => onNavigate('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: currentTab === 'dashboard' ? 'var(--bg-tertiary)' : 'transparent',
            color: currentTab === 'dashboard' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <LayoutDashboard size={15} />
          {t.nav.dashboard}
        </button>

        <button
          onClick={() => onNavigate('templates')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: currentTab === 'templates' ? 'var(--bg-tertiary)' : 'transparent',
            color: currentTab === 'templates' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <LayoutTemplate size={15} />
          {t.nav.templates}
        </button>

        <button
          onClick={() => onNavigate('audit')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: currentTab === 'audit' ? 'var(--bg-tertiary)' : 'transparent',
            color: currentTab === 'audit' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <Activity size={15} />
          {t.nav.audit}
        </button>

        <button
          onClick={() => onNavigate('integrations')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: currentTab === 'integrations' ? 'var(--bg-tertiary)' : 'transparent',
            color: currentTab === 'integrations' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <Lock size={15} />
          Integrações
        </button>

        <button
          onClick={() => onNavigate('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: currentTab === 'settings' ? 'var(--bg-tertiary)' : 'transparent',
            color: currentTab === 'settings' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <Settings size={15} />
          Configurações
        </button>

        {isAdminOrMaster && (
          <button
            onClick={() => onNavigate('tenantAdmin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: currentTab === 'tenantAdmin' ? 'var(--bg-tertiary)' : 'transparent',
              color: currentTab === 'tenantAdmin' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Building size={15} color="var(--accent-cyan)" />
            {t.nav.tenantAdmin}
          </button>
        )}

        {isMaster && (
          <>
            <button
              onClick={() => onNavigate('agency')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: currentTab === 'agency' ? 'var(--bg-tertiary)' : 'transparent',
                color: currentTab === 'agency' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <Building2 size={15} />
              {t.nav.agency}
            </button>

            <button
              onClick={() => onNavigate('masterAdmin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: currentTab === 'masterAdmin' ? 'var(--bg-tertiary)' : 'transparent',
                color: currentTab === 'masterAdmin' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <ShieldCheck size={15} color="var(--accent-purple)" />
              {t.nav.masterAdmin}
            </button>
          </>
        )}

        {currentTab === 'editor' && (
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--bg-tertiary)',
              color: 'var(--accent-cyan)',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Workflow size={15} />
            {flowchartName}
          </button>
        )}

        <button
          onClick={() => onNavigate('team')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: currentTab === 'team' ? 'var(--bg-tertiary)' : 'transparent',
            color: currentTab === 'team' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <Users size={15} />
          {t.nav.team}
        </button>
      </nav>

      {/* 3. ÍCONES FIXOS E CONTROLES DA DIREITA: flex-shrink-0 min-w-fit */}
      <div className="flex-shrink-0 min-w-fit flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* Colaboradores Conectados no Editor */}
        {currentTab === 'editor' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#10b981',
            fontWeight: 700,
          }}>
            <Radio size={14} color="#10b981" style={{ animation: 'pulse 1.5s infinite' }} />
            <span>{collaborators.length || 1} online</span>
          </div>
        )}

        {/* Botões de Ação do Editor */}
        {currentTab === 'editor' && canEdit && (
          <>
            {onAnalyzeEfficiency && (
              <button
                onClick={onAnalyzeEfficiency}
                disabled={isAnalyzingEfficiency}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: isAnalyzingEfficiency ? 'not-allowed' : 'pointer',
                }}
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">IA</span>
              </button>
            )}

            {onSave && (
              <button
                onClick={onSave}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'var(--accent-blue)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                <Save size={14} />
                <span className="hidden sm:inline">{isSaving ? t.saving : t.saveWorkflow}</span>
              </button>
            )}
          </>
        )}

        {/* Seletor de Idiomas (PT / EN) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '2px 4px',
        }}>
          <button
            onClick={() => setLanguage('pt')}
            style={{
              background: language === 'pt' ? 'var(--accent-cyan)' : 'transparent',
              color: language === 'pt' ? '#0a0c10' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            PT
          </button>
          <button
            onClick={() => setLanguage('en')}
            style={{
              background: language === 'en' ? 'var(--accent-cyan)' : 'transparent',
              color: language === 'en' ? '#0a0c10' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            EN
          </button>
        </div>

        {/* Avatar e Perfil (Com atalho para Configurações) */}
        {currentProfile && (
          <div
            onClick={() => onNavigate('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '8px',
              transition: 'background 0.2s ease',
            }}
            title="Configurações do Perfil"
          >
            <img
              src={currentProfile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt="Avatar"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--accent-cyan)',
              }}
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
              }}
            />
            <div className="hidden lg:flex flex-col">
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {currentProfile.full_name || currentProfile.email.split('@')[0]}
              </span>
              <span style={{
                fontSize: '9px',
                color: 'var(--accent-cyan)',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                {currentProfile.professional_id || currentProfile.role}
              </span>
            </div>
          </div>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            title={t.nav.logout}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <LogOut size={16} />
          </button>
        )}

        {/* 2. MENU HAMBÚRGUER (MOBILE MENU): flex md:hidden */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex md:hidden p-2 text-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '6px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
          title="Menu de Navegação Mobile"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 2. DRAWER / DROPDOWN MOBILE MENU */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden absolute top-[64px] left-0 w-full bg-[#090d16] border-b border-border p-4 flex flex-col gap-3 shadow-2xl z-50"
          style={{
            position: 'absolute',
            top: '64px',
            left: 0,
            width: '100%',
            background: '#090d16',
            borderBottom: '1px solid var(--border-color)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
            zIndex: 150,
          }}
        >
          <button
            onClick={() => handleMobileNav('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: currentTab === 'dashboard' ? 'var(--bg-tertiary)' : 'transparent',
              color: currentTab === 'dashboard' ? 'var(--accent-cyan)' : 'var(--text-primary)',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <LayoutDashboard size={16} />
            {t.nav.dashboard}
          </button>

          <button
            onClick={() => handleMobileNav('templates')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: currentTab === 'templates' ? 'var(--bg-tertiary)' : 'transparent',
              color: currentTab === 'templates' ? 'var(--accent-cyan)' : 'var(--text-primary)',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <LayoutTemplate size={16} />
            {t.nav.templates}
          </button>

          <button
            onClick={() => handleMobileNav('audit')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: currentTab === 'audit' ? 'var(--bg-tertiary)' : 'transparent',
              color: currentTab === 'audit' ? 'var(--accent-cyan)' : 'var(--text-primary)',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Activity size={16} />
            {t.nav.audit}
          </button>

          <button
            onClick={() => handleMobileNav('integrations')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: currentTab === 'integrations' ? 'var(--bg-tertiary)' : 'transparent',
              color: currentTab === 'integrations' ? 'var(--accent-cyan)' : 'var(--text-primary)',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Lock size={16} />
            Integrações & Cofre
          </button>

          <button
            onClick={() => handleMobileNav('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: currentTab === 'settings' ? 'var(--bg-tertiary)' : 'transparent',
              color: currentTab === 'settings' ? 'var(--accent-cyan)' : 'var(--text-primary)',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Settings size={16} />
            Configurações do Usuário
          </button>

          {isAdminOrMaster && (
            <button
              onClick={() => handleMobileNav('tenantAdmin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: currentTab === 'tenantAdmin' ? 'var(--bg-tertiary)' : 'transparent',
                color: currentTab === 'tenantAdmin' ? 'var(--accent-cyan)' : 'var(--text-primary)',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Building size={16} color="var(--accent-cyan)" />
              {t.nav.tenantAdmin}
            </button>
          )}

          {isMaster && (
            <>
              <button
                onClick={() => handleMobileNav('agency')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: currentTab === 'agency' ? 'var(--bg-tertiary)' : 'transparent',
                  color: currentTab === 'agency' ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Building2 size={16} />
                {t.nav.agency}
              </button>

              <button
                onClick={() => handleMobileNav('masterAdmin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: currentTab === 'masterAdmin' ? 'var(--bg-tertiary)' : 'transparent',
                  color: currentTab === 'masterAdmin' ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <ShieldCheck size={16} color="var(--accent-purple)" />
                {t.nav.masterAdmin}
              </button>
            </>
          )}

          <button
            onClick={() => handleMobileNav('team')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: currentTab === 'team' ? 'var(--bg-tertiary)' : 'transparent',
              color: currentTab === 'team' ? 'var(--accent-cyan)' : 'var(--text-primary)',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Users size={16} />
            {t.nav.team}
          </button>
        </div>
      )}
    </header>
  );
};
