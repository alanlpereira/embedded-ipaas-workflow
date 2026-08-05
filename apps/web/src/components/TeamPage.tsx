import React, { useState } from 'react';
import { UserPlus, Shield, User, X, Mail, Check, ShieldAlert } from 'lucide-react';
import { Profile, UserRole } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';

interface TeamPageProps {
  currentProfile: Profile;
}

export const TeamPage: React.FC<TeamPageProps> = ({ currentProfile }) => {
  const { t } = useLanguage();

  const [members, setMembers] = useState<Profile[]>([
    {
      id: 'usr-1',
      organization_id: 'org-alp-nexus',
      email: 'alan.pereira@alp-nexus.com',
      full_name: 'Alan Pereira',
      role: 'Master',
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
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Admin');

  const canManageTeam = currentProfile.role === 'Master' || currentProfile.role === 'Admin';

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newFullName) return;

    const newMemberProfile: Profile = {
      id: `usr-${Date.now()}`,
      organization_id: 'org-alp-nexus',
      email: newEmail,
      full_name: newFullName,
      role: newRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMembers((prev) => [...prev, newMemberProfile]);
    setIsModalOpen(false);
    setNewFullName('');
    setNewEmail('');
    alert(t.messages.memberAdded);
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

        {canManageTeam ? (
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
              color: '#0a0c10',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 242, 254, 0.3)',
            }}
          >
            <UserPlus size={18} />
            {t.team.addMember}
          </button>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#f59e0b',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            <ShieldAlert size={16} />
            Apenas Admins podem adicionar membros
          </div>
        )}
      </div>

      {/* Tabela de Membros */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>{t.team.table.name}</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>{t.team.table.email}</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>{t.team.table.role}</th>
              <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>{t.team.table.joined}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const roleBadge = getRoleBadgeStyle(member.role);

              return (
                <tr key={member.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 20px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: '#fff',
                        fontSize: '12px',
                      }}>
                        {member.full_name ? member.full_name.charAt(0) : 'U'}
                      </div>
                      {member.full_name || 'Sem nome'}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {member.email}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: roleBadge.bg,
                      color: roleBadge.color,
                      border: `1px solid ${roleBadge.border}`,
                    }}>
                      {member.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal para Adicionar Membro */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {t.team.modal.title}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t.team.modal.fullName}
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t.team.modal.email}
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="exemplo@empresa.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t.team.modal.roleSelect}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  <option value="Admin">Admin (Criação e Edição)</option>
                  <option value="Viewer">Viewer (Somente Leitura)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {t.team.modal.cancel}
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                    color: '#0a0c10',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
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
