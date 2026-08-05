import React, { useState } from 'react';
import { Building, Users, Activity, ShieldCheck, UserPlus, Zap, Lock, CreditCard, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Profile, PlanTier } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { EditionBadge } from './EditionBadge';

interface TenantAdminPageProps {
  currentProfile: Profile | null;
}

interface TeamMemberItem {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member' | 'Viewer';
  status: 'ACTIVE' | 'INVITED';
  joined_at: string;
}

const initialMembers: TeamMemberItem[] = [
  {
    id: 'mem-1',
    name: 'Alan Pereira (Você)',
    email: 'alan.pereira@alp-nexus.com',
    role: 'Admin',
    status: 'ACTIVE',
    joined_at: '2026-08-01',
  },
  {
    id: 'mem-2',
    name: 'Carlos Oliveira',
    email: 'carlos@empresa.com',
    role: 'Member',
    status: 'ACTIVE',
    joined_at: '2026-08-02',
  },
  {
    id: 'mem-3',
    name: 'Mariana Santos',
    email: 'mariana@empresa.com',
    role: 'Viewer',
    status: 'INVITED',
    joined_at: '2026-08-04',
  },
];

export const TenantAdminPage: React.FC<TenantAdminPageProps> = ({ currentProfile }) => {
  const { t } = useLanguage();
  const { currentOrg } = useTheme();

  const [activeTab, setActiveTab] = useState<'team' | 'activity' | 'usage'>('team');
  const [members, setMembers] = useState<TeamMemberItem[]>(initialMembers);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Admin' | 'Member' | 'Viewer'>('Member');

  const edition: PlanTier = (currentOrg?.plan_tier as PlanTier) || 'Synapse';

  const baseLimits: Record<PlanTier, number> = {
    Forge: 10000,
    Kinex: 50000,
    Axiom: 200000,
    Synapse: 1000000,
  };

  const currentLimit = baseLimits[edition] || 1000000;
  const currentTokensUsed = currentOrg?.ai_tokens_used || 142000;
  const usagePercent = Math.min(100, Math.round((currentTokensUsed / currentLimit) * 100));

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    const newMember: TeamMemberItem = {
      id: `mem-${Date.now()}`,
      name: newMemberName,
      email: newMemberEmail,
      role: newMemberRole,
      status: 'INVITED',
      joined_at: new Date().toISOString().split('T')[0],
    };

    setMembers((prev) => [...prev, newMember]);
    setNewMemberName('');
    setNewMemberEmail('');
    setIsInviteModalOpen(false);
    alert(t.messages.memberAdded);
  };

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '32px', background: 'var(--bg-primary)' }}>
      {/* Header Tenant Admin */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)' }}>
              <Building size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {currentOrg?.name || 'Organização Principal'}
                </h1>
                <EditionBadge edition={edition} size="medium" />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                {t.tenantAdmin.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Abas Internas de Gestão da Organização */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('team')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'team' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'team' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Users size={16} />
          {t.tenantAdmin.teamTab}
        </button>

        <button
          onClick={() => setActiveTab('usage')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'usage' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'usage' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Zap size={16} />
          {t.tenantAdmin.usageTab}
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'activity' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'activity' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Activity size={16} />
          {t.tenantAdmin.activityTab}
        </button>
      </div>

      {/* Conteúdo Aba Uso do Plano e Edição */}
      {activeTab === 'usage' && (
        <div>
          <div style={{
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '28px',
            marginBottom: '28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t.tenantAdmin.secPlanTitle}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    Edição Ativa: {edition} Edition
                  </h2>
                  <EditionBadge edition={edition} size="large" />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {t.tenantAdmin.tokensUsage}
                </span>
                <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0' }}>
                  {currentTokensUsed.toLocaleString()} / {currentLimit.toLocaleString()}
                </h3>
                <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
                  <div style={{ width: `${usagePercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-blue))' }} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                  {usagePercent}% da quota mensal consumida
                </span>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {t.tenantAdmin.executionsUsage}
                </span>
                <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0' }}>
                  3.840 Execuções
                </h3>
                <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} /> Execuções ilimitadas no motor {edition}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba Equipe */}
      {activeTab === 'team' && (
        <div style={{
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {t.tenantAdmin.secTeamTitle}
            </h3>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                color: '#0a0c10',
                fontWeight: 800,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <UserPlus size={15} />
              {t.tenantAdmin.addMemberBtn}
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Nome</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>E-mail</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Função</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 12px', color: 'var(--text-primary)', fontWeight: 600 }}>{member.name}</td>
                  <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>{member.email}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '8px',
                      background: member.role === 'Admin' ? 'rgba(0, 242, 254, 0.15)' : 'var(--bg-tertiary)',
                      color: member.role === 'Admin' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}>
                      {member.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: member.status === 'ACTIVE' ? '#10b981' : '#f59e0b',
                    }}>
                      {member.status === 'ACTIVE' ? 'Ativo' : 'Convidado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Convidar Membro */}
      {isInviteModalOpen && (
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
              {t.team.modal.title}
            </h3>
            <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  {t.team.modal.fullName}
                </label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Nome do usuário"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  {t.team.modal.email}
                </label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  {t.team.modal.roleSelect}
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                >
                  <option value="Admin">Admin</option>
                  <option value="Member">Member</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                >
                  {t.team.modal.cancel}
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--accent-cyan)', border: 'none', color: '#0a0c10', fontWeight: 800, cursor: 'pointer' }}
                >
                  {t.team.modal.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
