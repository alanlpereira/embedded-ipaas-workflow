import React, { useState, useEffect } from 'react';
import { Workflow, Save, Play, Globe, LayoutDashboard, Users, LogOut, ArrowLeft, Code, LayoutTemplate, History, Activity, Building2, ShieldCheck, Building, Radio, Download, Upload, Sparkles, Lock, Settings, Menu, X, Sun, Moon, Pencil, CreditCard } from 'lucide-react';
import { Profile } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { CollaboratorInfo } from '../collaboration/useYjsCollaboration';
import { EditionBadge } from './EditionBadge';

export type ViewTab = 'dashboard' | 'copilot' | 'clients' | 'profile' | 'pricing' | 'templates' | 'editor' | 'team' | 'audit' | 'agency' | 'masterAdmin' | 'tenantAdmin' | 'integrations' | 'settings' | 'executions' | 'dashboard_flows' | 'knowledge' | 'helpdesk';

interface NavbarProps {
  currentProfile: Profile | null;
  flowchartName: string;
  flowchartDescription?: string;
  onUpdateFlowchartMetadata?: (name: string, description?: string) => void;
  currentTab: ViewTab;
  onNavigate: (tab: ViewTab) => void;
  onSave?: () => void;
  isSaving?: boolean;
  onRunNow?: () => void;
  isRunningNow?: boolean;
  onLogout?: () => void;
  onOpenEmbedModal?: () => void;
  onOpenVersionModal?: () => void;
  onExportJson?: () => void;
  onOpenImportModal?: () => void;
  onAnalyzeEfficiency?: () => void;
  isAnalyzingEfficiency?: boolean;
  onClearCache?: () => void;
  collaborators?: CollaboratorInfo[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProfile,
  flowchartName,
  flowchartDescription = '',
  onUpdateFlowchartMetadata,
  currentTab,
  onNavigate,
  onSave,
  isSaving,
  onRunNow,
  isRunningNow,
  onLogout,
  onOpenEmbedModal,
  onOpenVersionModal,
  onExportJson,
  onOpenImportModal,
  onAnalyzeEfficiency,
  isAnalyzingEfficiency,
  onClearCache,
  collaborators = [],
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { currentOrg, theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditMetadataOpen, setIsEditMetadataOpen] = useState(false);
  const [isInlineEditingTitle, setIsInlineEditingTitle] = useState(false);
  const [editName, setEditName] = useState(flowchartName);
  const [editDesc, setEditDesc] = useState(flowchartDescription);

  useEffect(() => {
    setEditName(flowchartName);
  }, [flowchartName]);

  useEffect(() => {
    setEditDesc(flowchartDescription || '');
  }, [flowchartDescription]);

  const handleOpenMetadataModal = () => {
    setEditName(flowchartName);
    setEditDesc(flowchartDescription);
    setIsEditMetadataOpen(true);
  };

  const handleSaveMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateFlowchartMetadata && editName.trim()) {
      onUpdateFlowchartMetadata(editName.trim(), editDesc.trim());
    }
    setIsEditMetadataOpen(false);
  };

  const canEdit = currentProfile?.role === 'Master' || currentProfile?.role === 'Admin';
  const isMaster = currentProfile?.role === 'Master';
  const isAdminOrMaster = currentProfile?.role === 'Admin' || currentProfile?.role === 'Master';

  const handleMobileNav = (tab: ViewTab) => {
    onNavigate(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      style={{
        height: '64px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        zIndex: 100,
        position: 'relative',
      }}
    >
      {/* BRAND / LOGO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div
          onClick={() => onNavigate('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <img
            src="/logo-synapse.jpg"
            alt="Synapse Logo"
            style={{ height: '32px', width: 'auto', objectFit: 'contain', borderRadius: '6px' }}
            className="h-8 w-auto"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '-0.3px', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap' }}>
              {t.appTitle}
            </h1>
            <EditionBadge edition={currentOrg?.plan_tier || 'Legal AI'} size="small" />
          </div>
        </div>
      </div>

      {/* CONTAINER DE NAVEGAÇÃO COM ROLAGEM HORIZONTAL NATIVA NO CELULAR */}
      <nav
        className="no-scrollbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
          margin: '0 12px',
          padding: '4px 0',
        }}
      >
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
            border: currentTab === 'dashboard' ? '1px solid var(--border-color)' : '1px solid transparent',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <LayoutDashboard size={15} />
          Consultas PJe
        </button>

        <button
          onClick={() => onNavigate('copilot')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: currentTab === 'copilot' ? 'var(--bg-tertiary)' : 'transparent',
            color: currentTab === 'copilot' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: currentTab === 'copilot' ? '1px solid var(--border-color)' : '1px solid transparent',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <Sparkles size={15} style={{ color: '#38bdf8' }} />
          ⚖️ Copilot
        </button>

        <button
          onClick={() => onNavigate('clients')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: currentTab === 'clients' ? 'var(--bg-tertiary)' : 'transparent',
            color: currentTab === 'clients' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: currentTab === 'clients' ? '1px solid var(--border-color)' : '1px solid transparent',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <Users size={15} />
          Clientes
        </button>

        <button
          onClick={() => onNavigate('pricing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: currentTab === 'pricing' ? 'var(--bg-tertiary)' : 'transparent',
            color: currentTab === 'pricing' ? '#10b981' : 'var(--text-secondary)',
            border: currentTab === 'pricing' ? '1px solid #10b981' : '1px solid transparent',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <CreditCard size={15} style={{ color: '#10b981' }} />
          Planos & Assinaturas
        </button>

        {isAdminOrMaster && (
          <>
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
                border: currentTab === 'templates' ? '1px solid var(--border-color)' : '1px solid transparent',
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
                border: currentTab === 'audit' ? '1px solid var(--border-color)' : '1px solid transparent',
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
                border: currentTab === 'integrations' ? '1px solid var(--border-color)' : '1px solid transparent',
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
                border: currentTab === 'settings' ? '1px solid var(--border-color)' : '1px solid transparent',
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
          </>
        )}

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
              border: currentTab === 'tenantAdmin' ? '1px solid var(--border-color)' : '1px solid transparent',
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
                border: currentTab === 'agency' ? '1px solid var(--border-color)' : '1px solid transparent',
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
                border: currentTab === 'masterAdmin' ? '1px solid var(--border-color)' : '1px solid transparent',
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
          isInlineEditingTitle ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => {
                setIsInlineEditingTitle(false);
                if (onUpdateFlowchartMetadata && editName.trim()) {
                  onUpdateFlowchartMetadata(editName.trim(), flowchartDescription);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsInlineEditingTitle(false);
                  if (onUpdateFlowchartMetadata && editName.trim()) {
                    onUpdateFlowchartMetadata(editName.trim(), flowchartDescription);
                  }
                }
              }}
              autoFocus
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                background: 'var(--bg-tertiary)',
                color: 'var(--accent-cyan)',
                border: '1px solid var(--accent-cyan)',
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none',
              }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={handleOpenMetadataModal}
                title="Clique para abrir modal ou dê duplo-clique para editar nome inline"
                onDoubleClick={() => setIsInlineEditingTitle(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                <Workflow size={15} />
                <span>{flowchartName}</span>
                <Pencil size={12} style={{ opacity: 0.7, marginLeft: '2px' }} />
              </button>
            </div>
          )
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
            border: currentTab === 'team' ? '1px solid var(--border-color)' : '1px solid transparent',
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

      {/* CONTROLES DA DIREITA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
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
        {currentTab === 'editor' && (
          <>
            {canEdit && onAnalyzeEfficiency && (
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
                <span>IA</span>
              </button>
            )}

            {canEdit && onSave && (
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
                <span>{isSaving ? t.saving : t.saveWorkflow}</span>
              </button>
            )}

            {onRunNow && (
              <button
                onClick={onRunNow}
                disabled={isRunningNow}
                title="Executar este fluxo de trabalho agora"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: isRunningNow ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <Play size={14} fill="#ffffff" />
                <span>{isRunningNow ? 'Iniciando...' : '▶ Executar Agora'}</span>
              </button>
            )}
          </>
        )}

        {/* BOTÃO LIMPAR CACHE / RESETAR IDs UUID */}
        {onClearCache && (
          <button
            onClick={onClearCache}
            title="Limpar Cache Local & Resetar IDs para UUID autêntico"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <X size={14} />
            <span>Resetar Cache</span>
          </button>
        )}

        {/* SELETOR RÁPIDO DE TEMA (DARK / LIGHT) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para Modo Light' : 'Mudar para Modo Dark'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            borderRadius: '6px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--accent-cyan)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {theme === 'dark' ? <Sun size={15} color="#00f2fe" /> : <Moon size={15} color="#3b82f6" />}
        </button>

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
      </div>

      {/* MODAL DE EDIÇÃO DE METADADOS DO FLUXO (Título e Descrição) */}
      {isEditMetadataOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pencil size={18} color="var(--accent-cyan)" />
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700 }}>
                  Configurações do Fluxo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditMetadataOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Nome do Fluxo
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ex: Automação de E-commerce v2"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Descrição do Fluxo
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Descreva o propósito deste fluxo de trabalho..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditMetadataOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                    color: '#0a0c10',
                    fontWeight: 800,
                    fontSize: '12px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
