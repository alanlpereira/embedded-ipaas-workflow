import React from 'react';
import { Workflow, Save, Play, Globe, LayoutDashboard, Users, LogOut, ArrowLeft, Code, LayoutTemplate, History, Activity, Building2, ShieldCheck, Building, Radio, Download, Upload, Sparkles, Lock, Settings } from 'lucide-react';
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
  const { currentOrg, primaryColor } = useTheme();

  const canEdit = currentProfile?.role === 'Master' || currentProfile?.role === 'Admin';
  const isMaster = currentProfile?.role === 'Master';
  const isAdminOrMaster = currentProfile?.role === 'Admin' || currentProfile?.role === 'Master';

  return (
    <header style={{
      height: '64px',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      padding: '0 20px',
      background: '#090d16',
      backdropFilter: 'blur(20px)',
      position: 'relative',
      zIndex: 100,
      width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
        {/* Espaço Reservado no Topo para a Logomarca Oficial Synapse e Selo de Edição */}
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

        {/* Abas de Navegação Principal com Overflow Horizontal Limpo */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          whiteSpace: 'nowrap',
          padding: '4px 0',
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
            }}
          >
            <Users size={15} />
            {t.nav.team}
          </button>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Colaboradores Conectados ao Vivo no Editor */}
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
            <span>{collaborators.length || 1} online ao vivo</span>
          </div>
        )}

        {/* Botões do Editor de Fluxogramas */}
        {currentTab === 'editor' && (
          <>
            {onAnalyzeEfficiency && (
              <button
                onClick={onAnalyzeEfficiency}
                disabled={isAnalyzingEfficiency}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: isAnalyzingEfficiency ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
                }}
              >
                <Sparkles size={15} color="#ffffff" />
                {isAnalyzingEfficiency ? 'Analisando...' : 'Analisar Eficiência (IA)'}
              </button>
            )}

            {onExportJson && (
              <button
                onClick={onExportJson}
                title="Exportar Fluxo em formato JSON"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Download size={14} />
                Exportar (.json)
              </button>
            )}

            {canEdit && onOpenImportModal && (
              <button
                onClick={onOpenImportModal}
                title="Importar Fluxo JSON"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-cyan)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Upload size={14} />
                Importar
              </button>
            )}

            {onOpenVersionModal && (
              <button
                onClick={onOpenVersionModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <History size={14} />
                Histórico
              </button>
            )}

            {canEdit && onSave && (
              <button
                onClick={onSave}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <Save size={16} />
                {isSaving ? t.saving : t.saveWorkflow}
              </button>
            )}

            <div style={{ height: '24px', width: '1px', background: 'var(--border-color)', margin: '0 4px' }} />
          </>
        )}

        {/* Seletor de Idiomas (PT / EN) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '4px 6px',
        }}>
          <Globe size={14} color="var(--accent-cyan)" />
          <button
            onClick={() => setLanguage('pt')}
            style={{
              background: language === 'pt' ? 'var(--accent-cyan)' : 'transparent',
              color: language === 'pt' ? '#0a0c10' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '4px',
              padding: '3px 6px',
              fontSize: '11px',
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
              padding: '3px 6px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            EN
          </button>
        </div>

        {/* Perfil e Logout */}
        {currentProfile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                color: '#fff'
              }}>
                {currentProfile.full_name ? currentProfile.full_name.charAt(0) : 'A'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {currentProfile.full_name || currentProfile.email}
                </span>
                <span style={{
                  fontSize: '9px',
                  color: currentProfile.role === 'Master' ? 'var(--accent-cyan)' : currentProfile.role === 'Admin' ? 'var(--accent-blue)' : 'var(--text-muted)',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>
                  Role: {currentProfile.role}
                </span>
              </div>
            </div>

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
          </div>
        )}
      </div>
    </header>
  );
};
