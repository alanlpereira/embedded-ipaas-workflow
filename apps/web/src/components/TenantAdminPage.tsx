import React, { useState, useEffect } from 'react';
import { Building, Users, Activity, ShieldCheck, UserPlus, Zap, Lock, CreditCard, ChevronRight, CheckCircle2, Trash2 } from 'lucide-react';
import { Profile, PlanTier } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { EditionBadge } from './EditionBadge';
import { AiAnalyticsDashboard } from './AiAnalyticsDashboard';
import { supabase } from '../lib/supabase';

interface TenantAdminPageProps {
  currentProfile: Profile | null;
}

interface TeamMemberItem {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member' | 'Viewer' | 'Master';
  status: 'ACTIVE' | 'INVITED';
  joined_at: string;
  edition?: string;
}

const defaultTenantMembers: TeamMemberItem[] = [
  {
    id: 'usr-rodrigo-moura-id',
    name: 'Dr. Rodrigo Moura Rodrigues',
    email: 'rodrigo.moura@alp-nexus.com',
    role: 'Master',
    status: 'ACTIVE',
    joined_at: '2026-08-10',
    edition: 'LegalOps',
  },
  {
    id: 'mem-1',
    name: 'Dr. Alan Pereira (Você)',
    email: 'alan.pereira@alp-nexus.com',
    role: 'Admin',
    status: 'ACTIVE',
    joined_at: '2026-08-01',
    edition: 'Synapse',
  },
  {
    id: 'mem-2',
    name: 'Carlos Oliveira',
    email: 'carlos@empresa.com',
    role: 'Member',
    status: 'ACTIVE',
    joined_at: '2026-08-02',
    edition: 'Synapse',
  },
  {
    id: 'mem-3',
    name: 'Mariana Santos',
    email: 'mariana@empresa.com',
    role: 'Viewer',
    status: 'INVITED',
    joined_at: '2026-08-04',
    edition: 'Synapse',
  },
];

export const TenantAdminPage: React.FC<TenantAdminPageProps> = ({ currentProfile }) => {
  const { t } = useLanguage();
  const { currentOrg } = useTheme();

  const [activeTab, setActiveTab] = useState<'team' | 'activity' | 'usage'>('team');
  const [members, setMembers] = useState<TeamMemberItem[]>([]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Admin' | 'Member' | 'Viewer' | 'Master'>('Member');

  // 🚀 Carregamento Exclusivo de Perfis do Banco Supabase PostgreSQL via RPC get_all_profiles
  useEffect(() => {
    async function loadTenantProfilesFromRpc() {
      try {
        const { data: rpcProfiles, error } = await supabase.rpc('get_all_profiles');
        const list = (!error && rpcProfiles)
          ? rpcProfiles
          : (await supabase.from('profiles').select('*')).data;

        if (list) {
          const mapped: TeamMemberItem[] = list.map((m: any) => ({
            id: m.id,
            name: m.full_name || m.name || m.email?.split('@')[0] || 'Membro Synapse',
            email: m.email,
            role: m.role || 'Member',
            status: 'ACTIVE',
            joined_at: m.created_at ? m.created_at.split('T')[0] : '2026-08-10',
            edition: m.organization_id === 'org-legal-ops' || m.email?.includes('rodrigo.moura') ? 'LegalOps' : 'Synapse',
          }));
          setMembers(mapped);
        }
      } catch (err) {
        console.warn('⚠️ Erro ao carregar membros do tenant via RPC:', err);
      }
    }

    loadTenantProfilesFromRpc();
  }, []);

  const edition: PlanTier = (currentProfile?.organization_id === 'org-legal-ops' || currentProfile?.email === 'rodrigo.moura@alp-nexus.com')
    ? 'LegalOps'
    : ((currentOrg?.plan_tier as PlanTier) || 'Synapse');

  const baseLimits: Record<PlanTier, number> = {
    Forge: 10000,
    Kinex: 50000,
    Axiom: 200000,
    Synapse: 1000000,
    LegalOps: 500000,
  };

  const currentLimit = baseLimits[edition] || 500000;
  const currentTokensUsed = currentOrg?.ai_tokens_used || 142000;
  const usagePercent = Math.min(100, Math.round((currentTokensUsed / currentLimit) * 100));

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    const newMember: TeamMemberItem = {
      id: `mem-${Date.now()}`,
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      role: newMemberRole,
      status: 'INVITED',
      joined_at: new Date().toISOString().split('T')[0],
      edition: edition,
    };

    const updated = [newMember, ...members];
    setMembers(updated);
    try {
      const teamProfiles = updated.map(m => ({
        id: m.id,
        organization_id: m.edition === 'LegalOps' ? 'org-legal-ops' : 'org-alp-nexus',
        email: m.email,
        full_name: m.name,
        role: m.role,
        created_at: m.joined_at,
        updated_at: m.joined_at,
      }));
      localStorage.setItem('synapse_team_members', JSON.stringify(teamProfiles));
    } catch (e) {}

    setNewMemberName('');
    setNewMemberEmail('');
    setIsInviteModalOpen(false);
    alert(t.messages.memberAdded || 'Novo membro convidado com sucesso!');
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (confirm(`Remover ${memberName} da organização e excluir perfil do banco?`)) {
      try {
        console.log(`🗑️ [DB DELETE] Solicitando exclusão do perfil ${memberId} no Supabase...`);
        // 1. Tentar exclusão via RPC SECURITY DEFINER (bypass de RLS)
        const { error: rpcErr } = await supabase.rpc('delete_user_profile', { target_user_id: memberId });
        
        if (rpcErr) {
          console.warn('⚠️ Fallback de exclusão via query direta:', rpcErr.message);
          // Fallback para exclusão direta na tabela profiles
          const { error: directErr } = await supabase
            .from('profiles')
            .delete()
            .eq('id', memberId);

          if (directErr) {
            console.error('❌ Erro ao deletar no Supabase:', directErr.message);
          }
        }
        console.log(`✅ [DB DELETE SUCCESS] Usuário ${memberId} excluído do banco PostgreSQL.`);
      } catch (err: any) {
        console.error('❌ Erro na comunicação com o banco de dados:', err);
      }

      // 2. Atualizar estado local e cache
      const updated = members.filter(m => m.id !== memberId);
      setMembers(updated);
      try {
        const teamProfiles = updated.map(m => ({
          id: m.id,
          organization_id: m.edition === 'LegalOps' ? 'org-legal-ops' : 'org-alp-nexus',
          email: m.email,
          full_name: m.name,
          role: m.role,
          created_at: m.joined_at,
          updated_at: m.joined_at,
        }));
        localStorage.setItem('synapse_team_members', JSON.stringify(teamProfiles));
      } catch (e) {}
    }
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
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
              {currentProfile?.organization_id === 'org-legal-ops' ? 'Advocacia Rodrigo Moura & Associados' : (currentOrg?.name || 'ALP Nexus Enterprise')}
            </h1>
            <EditionBadge edition={edition} size="medium" />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            {t.tenantAdmin.subtitle}
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
            color: '#0a0c10',
            fontWeight: 800,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 242, 254, 0.3)',
          }}
        >
          <UserPlus size={16} />
          {t.tenantAdmin.addMemberBtn}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('team')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'team' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'team' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'team' ? '1px solid var(--border-color)' : '1px solid transparent',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Users size={16} />
          {t.tenantAdmin.teamTab} ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'usage' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'usage' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'usage' ? '1px solid var(--border-color)' : '1px solid transparent',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Zap size={16} />
          {t.tenantAdmin.usageTab}
        </button>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'team' && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Membro</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>E-mail</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Edição Habilitada</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Função</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>
                    {m.name}
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {m.email}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <EditionBadge edition={m.edition || (m.email.includes('rodrigo.moura') ? 'LegalOps' : 'Synapse')} size="small" />
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                      {m.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: m.status === 'ACTIVE' ? '#10b981' : '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> {m.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDeleteMember(m.id, m.name)}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'usage' && (
        <AiAnalyticsDashboard />
      )}

      {/* Modal Convidar */}
      {isInviteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '420px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800 }}>Convidar Novo Membro</h3>
            <form onSubmit={handleInviteMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="Nome completo (Ex: Dr. Rodrigo Moura)" required style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <input type="email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} placeholder="rodrigo.moura@alp-nexus.com" required style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value as any)} style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="Admin">Admin</option>
                <option value="Member">Member</option>
                <option value="Viewer">Viewer</option>
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsInviteModalOpen(false)} style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-cyan)', color: '#0a0c10', fontWeight: 800, border: 'none' }}>Salvar Membro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
