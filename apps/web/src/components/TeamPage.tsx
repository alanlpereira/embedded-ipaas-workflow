import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, User, X, Mail, Check, ShieldAlert, Trash2 } from 'lucide-react';
import { Profile, UserRole } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';

interface TeamPageProps {
  currentProfile: Profile;
}

const defaultTeamMembers: Profile[] = [
  {
    id: 'usr-rodrigo-moura',
    full_name: 'Dr. Rodrigo Moura Rodrigues',
    email: 'rodrigo.moura@alp-nexus.com',
    role: 'Master',
    professional_id: 'OAB/MG Habilitada',
    organization_id: 'org-legal-ops',
    created_at: new Date('2026-08-10').toISOString(),
    updated_at: new Date('2026-08-10').toISOString(),
  },
  {
    id: 'usr-alan-pereira',
    full_name: 'Dr. Alan Lacerda Pereira',
    email: 'alanlacerdapereira@gmail.com',
    role: 'Master',
    professional_id: 'OAB/MG Habilitada',
    organization_id: 'org-alp-nexus',
    created_at: new Date('2026-08-01').toISOString(),
    updated_at: new Date('2026-08-01').toISOString(),
  },
  {
    id: 'usr-2',
    organization_id: 'org-alp-nexus',
    email: 'dev.admin@alp-nexus.com',
    full_name: 'Carlos Santos (Admin)',
    role: 'Admin',
    created_at: new Date('2026-08-02').toISOString(),
    updated_at: new Date('2026-08-02').toISOString(),
  },
  {
    id: 'usr-3',
    organization_id: 'org-alp-nexus',
    email: 'viewer.demo@alp-nexus.com',
    full_name: 'Usuário Leitor (Viewer Demo)',
    role: 'Viewer',
    created_at: new Date('2026-08-03').toISOString(),
    updated_at: new Date('2026-08-03').toISOString(),
  },
];

export const TeamPage: React.FC<TeamPageProps> = ({ currentProfile }) => {
  const { t } = useLanguage();

  const [members, setMembers] = useState<Profile[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Admin');

  useEffect(() => {
    async function loadRealTeamFromDb() {
      setIsLoadingMembers(true);
      try {
        const { data: rpcProfiles, error } = await supabase.rpc('get_all_profiles');
        const dbList = (!error && rpcProfiles)
          ? rpcProfiles
          : (await supabase.from('profiles').select('*')).data;

        if (dbList) {
          setMembers(dbList);
        }
      } catch (err) {
        console.warn('⚠️ Erro ao carregar membros da equipe do Supabase:', err);
      } finally {
        setIsLoadingMembers(false);
      }
    }

    loadRealTeamFromDb();
  }, []);

  const canManageTeam = currentProfile.role === 'Master' || currentProfile.role === 'Admin';

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newFullName) return;

    const newMemberProfile: Profile = {
      id: `usr-${Date.now()}`,
      organization_id: currentProfile.organization_id || 'org-alp-nexus',
      email: newEmail.trim(),
      full_name: newFullName.trim(),
      role: newRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMembers((prev) => [newMemberProfile, ...prev]);
    setIsModalOpen(false);
    setNewFullName('');
    setNewEmail('');
    alert(t.messages.memberAdded || 'Membro adicionado com sucesso!');
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (confirm(`Tem certeza que deseja remover ${memberName} da equipe e excluir do banco?`)) {
      try {
        const { error: rpcErr } = await supabase.rpc('delete_user_profile', { target_user_id: memberId });
        if (rpcErr) {
          await supabase.from('profiles').delete().eq('id', memberId);
        }
      } catch (err) {
        console.error('❌ Erro ao excluir usuário no Supabase:', err);
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'Master':
        return { bg: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', border: 'rgba(0, 242, 254, 0.3)' };
      case 'Admin':
        return { bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: 'rgba(59, 130, 246, 0.3)' };
      case 'Viewer':
        return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {t.team.title}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {t.team.subtitle}
          </p>
        </div>

        {canManageTeam && (
          <button
            onClick={() => setIsModalOpen(true)}
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
            {t.team.addMemberBtn}
          </button>
        )}
      </div>

      {/* Tabela de Membros */}
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
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {t.team.table.name}
              </th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {t.team.table.email}
              </th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Organização / Edição
              </th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {t.team.table.role}
              </th>
              {canManageTeam && (
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>
                  {t.team.table.actions}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const badgeStyle = getRoleBadgeStyle(member.role);
              const isRodrigo = member.email.includes('rodrigo.moura');
              const isLegalOps = member.organization_id === 'org-legal-ops' || isRodrigo;

              return (
                <tr key={member.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isLegalOps ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                        color: isLegalOps ? '#ffffff' : '#0a0c10',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '13px',
                      }}>
                        {member.full_name ? member.full_name.substring(0, 2).toUpperCase() : 'US'}
                      </div>
                      <div>
                        <div>{member.full_name || 'Usuário Sem Nome'}</div>
                        {member.professional_id && (
                          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                            {member.professional_id}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {member.email}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {isLegalOps ? (
                      <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '12px', fontWeight: 800 }}>
                        ⚖️ Legal Ops Edition
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', border: 'rgba(0, 242, 254, 0.3)', padding: '4px 10px', borderRadius: '12px', fontWeight: 800 }}>
                        ✨ Synapse Edition
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: badgeStyle.bg,
                      color: badgeStyle.color,
                      border: `1px solid ${badgeStyle.border}`,
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}>
                      {member.role}
                    </span>
                  </td>
                  {canManageTeam && (
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      {member.id !== currentProfile.id && (
                        <button
                          onClick={() => handleDeleteMember(member.id, member.full_name || member.email)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={14} /> Remover
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Adicionar Membro */}
      {isModalOpen && (
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
            padding: '28px',
            width: '90%',
            maxWidth: '440px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800 }}>
                {t.team.modal.title}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t.team.modal.nameLabel}
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ex: Dr. Rodrigo Moura Rodrigues"
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t.team.modal.emailLabel}
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="rodrigo.moura@alp-nexus.com"
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t.team.modal.roleLabel}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px' }}
                >
                  <option value="Admin">Admin (Gestão de Equipe)</option>
                  <option value="Master">Master (Acesso Total)</option>
                  <option value="Member">Member (Operador)</option>
                  <option value="Viewer">Viewer (Apenas Leitura)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '9px 16px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>
                  {t.team.modal.cancelBtn}
                </button>
                <button type="submit" style={{ padding: '9px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', color: '#0a0c10', fontWeight: 800, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                  {t.team.modal.saveBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
