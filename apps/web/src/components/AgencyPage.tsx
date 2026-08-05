import React, { useState } from 'react';
import { Building2, Plus, Users, Zap, Shield, ChevronRight, Activity, ArrowUpRight, Lock } from 'lucide-react';
import { Profile, PlanTier } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme, ExtendedOrganization } from '../context/ThemeContext';
import { EditionBadge } from './EditionBadge';

interface AgencyPageProps {
  currentProfile: Profile | null;
  onImpersonateSuccess: (org: ExtendedOrganization) => void;
}

export const AgencyPage: React.FC<AgencyPageProps> = ({
  currentProfile,
  onImpersonateSuccess,
}) => {
  const { t } = useLanguage();
  const { availableOrgs, switchOrganization, currentOrg } = useTheme();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newPlan, setNewPlan] = useState<PlanTier>('Forge');

  if (currentProfile?.role !== 'Master') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        <h2>Acesso Negado</h2>
        <p>Esta área é restrita a usuários com perfil Master ou Agência.</p>
      </div>
    );
  }

  const handleCreateSubOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    const baseLimits: Record<PlanTier, number> = {
      Forge: 10000,
      Kinex: 50000,
      Axiom: 200000,
      Synapse: 1000000,
    };

    const created: ExtendedOrganization = {
      id: `org-${Date.now()}`,
      name: newOrgName,
      plan_tier: newPlan,
      ai_tokens_limit: baseLimits[newPlan],
      ai_tokens_used: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    switchOrganization(created.id);
    onImpersonateSuccess(created);

    setIsModalOpen(false);
    setNewOrgName('');
    setNewAdminEmail('');
    alert(`Sub-organização "${newOrgName}" criada com a Edição ${newPlan}!`);
  };

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '32px', background: 'var(--bg-primary)' }}>
      {/* Header Agência Multi-Tenant */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '6px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))' }}>
              <Building2 size={20} color="#0a0c10" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {t.agencyPage.title}
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            {t.agencyPage.subtitle}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
            color: '#0a0c10',
            fontWeight: 800,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 242, 254, 0.3)',
          }}
        >
          <Plus size={16} />
          {t.agencyPage.createSubOrg}
        </button>
      </div>

      {/* Grid de Sub-Organizações de Clientes com Badges de Edições */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {availableOrgs.map((org) => {
          const isSelected = org.id === currentOrg?.id;
          const edition: PlanTier = (org.plan_tier as PlanTier) || 'Synapse';

          return (
            <div
              key={org.id}
              style={{
                background: 'var(--bg-glass)',
                backdropFilter: 'blur(16px)',
                border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: isSelected ? '0 0 24px rgba(0, 242, 254, 0.2)' : 'none',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'rgba(0, 242, 254, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-cyan)',
                      fontWeight: 800,
                    }}>
                      {org.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {org.name}
                      </h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {org.id}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      fontSize: '10px',
                      fontWeight: 800,
                    }}>
                      {t.agencyPage.activeClientBadge}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <EditionBadge edition={edition} size="small" />
                </div>
              </div>

              <button
                onClick={() => {
                  switchOrganization(org.id);
                  onImpersonateSuccess(org);
                }}
                disabled={isSelected}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: '10px',
                  background: isSelected ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                  color: isSelected ? 'var(--text-muted)' : '#0a0c10',
                  fontWeight: 800,
                  fontSize: '12px',
                  border: 'none',
                  cursor: isSelected ? 'default' : 'pointer',
                }}
              >
                {isSelected ? t.agencyPage.impersonating : t.agencyPage.impersonateBtn}
                {!isSelected && <ArrowUpRight size={14} />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de Criação de Sub-Organização */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 60, padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '440px',
            background: 'var(--bg-glass)', backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
              {t.agencyPage.modalTitle}
            </h3>

            <form onSubmit={handleCreateSubOrg} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  {t.agencyPage.orgName}
                </label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Ex: Cliente Enterprise Ltda"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Edição Contratada
                </label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as PlanTier)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                >
                  <option value="Forge">Forge Edition (Slate - 10k tokens)</option>
                  <option value="Kinex">Kinex Edition (Orange - 50k tokens)</option>
                  <option value="Axiom">Axiom Edition (Blue - 200k tokens)</option>
                  <option value="Synapse">Synapse Edition (Cyan - 1M tokens)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--accent-cyan)', border: 'none', color: '#0a0c10', fontWeight: 800, cursor: 'pointer' }}
                >
                  {t.agencyPage.saveSubOrg}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
