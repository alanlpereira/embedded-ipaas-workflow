import React, { useState } from 'react';
import { ShieldCheck, Plus, Edit2, Zap, DollarSign, Users, Activity, Building, Lock, Sparkles, Copy, Check, X, Clock } from 'lucide-react';
import { Profile, PlanTier } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { EditionBadge } from './EditionBadge';

interface MasterAdminPageProps {
  currentProfile: Profile | null;
}

export interface ClientOrganizationItem {
  id: string;
  name: string;
  plan_tier: PlanTier;
  active_status: 'ACTIVE' | 'SUSPENDED';
  ai_tokens_limit: number;
  custom_token_override: number;
  ai_tokens_used: number;
  active_users_count: number;
  executions_count: number;
  created_at: string;
}

const initialOrganizations: ClientOrganizationItem[] = [
  {
    id: 'org-alp-nexus',
    name: 'ALP Nexus Enterprise (Matriz)',
    plan_tier: 'Synapse',
    active_status: 'ACTIVE',
    ai_tokens_limit: 1000000,
    custom_token_override: 500000,
    ai_tokens_used: 142000,
    active_users_count: 14,
    executions_count: 3840,
    created_at: '2026-08-01',
  },
  {
    id: 'org-acme-corp',
    name: 'Acme Logistics Ltda',
    plan_tier: 'Axiom',
    active_status: 'ACTIVE',
    ai_tokens_limit: 200000,
    custom_token_override: 10000,
    ai_tokens_used: 48200,
    active_users_count: 5,
    executions_count: 1250,
    created_at: '2026-08-02',
  },
  {
    id: 'org-kinex-lab',
    name: 'Kinex Tech Solutions',
    plan_tier: 'Kinex',
    active_status: 'ACTIVE',
    ai_tokens_limit: 50000,
    custom_token_override: 5000,
    ai_tokens_used: 24000,
    active_users_count: 3,
    executions_count: 890,
    created_at: '2026-08-03',
  },
  {
    id: 'org-forge-dev',
    name: 'Forge Starter Studio',
    plan_tier: 'Forge',
    active_status: 'ACTIVE',
    ai_tokens_limit: 10000,
    custom_token_override: 0,
    ai_tokens_used: 4800,
    active_users_count: 2,
    executions_count: 210,
    created_at: '2026-08-04',
  },
];

export const MasterAdminPage: React.FC<MasterAdminPageProps> = ({ currentProfile }) => {
  const { t } = useLanguage();

  const [orgs, setOrgs] = useState<ClientOrganizationItem[]>(initialOrganizations);

  // Estados de Cadastro de Nova Org
  const [newOrgName, setNewOrgName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newPlanTier, setNewPlanTier] = useState<PlanTier>('Forge');

  // Estado de Edição de Override
  const [editingOrg, setEditingOrg] = useState<ClientOrganizationItem | null>(null);
  const [editOverride, setEditOverride] = useState<number>(0);
  const [editPlan, setEditPlan] = useState<PlanTier>('Forge');

  // Estado da Demo Mágica
  const [generatedDemoUrl, setGeneratedDemoUrl] = useState<string | null>(null);
  const [generatedDemoOrg, setGeneratedDemoOrg] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  if (currentProfile?.role !== 'Master') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        <h2>Acesso Negado</h2>
        <p>Esta área é restrita exclusivamente ao usuário Master.</p>
      </div>
    );
  }

  // Cálculos do Dashboard Analítico Global & Custos Operacionais
  const totalAI = orgs.reduce((acc, item) => acc + item.ai_tokens_used, 0);
  const totalExecutions = orgs.reduce((acc, item) => acc + item.executions_count, 0);
  const totalUsers = orgs.reduce((acc, item) => acc + item.active_users_count, 0);

  // Widget Financeiro: Estimativa de Custos
  const COST_PER_1K_TOKENS = 0.00015;
  const COST_PER_1K_LOGS = 0.002;

  const estimatedAICost = (totalAI / 1000) * COST_PER_1K_TOKENS;
  const estimatedDbCost = (totalExecutions / 1000) * COST_PER_1K_LOGS;
  const totalOperationalCost = estimatedAICost + estimatedDbCost;

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newAdminEmail.trim()) return;

    const baseLimits: Record<PlanTier, number> = {
      Forge: 10000,
      Kinex: 50000,
      Axiom: 200000,
      Synapse: 1000000,
    };

    const newOrg: ClientOrganizationItem = {
      id: `org-${Date.now()}`,
      name: newOrgName,
      plan_tier: newPlanTier,
      active_status: 'ACTIVE',
      ai_tokens_limit: baseLimits[newPlanTier],
      custom_token_override: 0,
      ai_tokens_used: 0,
      active_users_count: 1,
      executions_count: 0,
      created_at: new Date().toISOString().split('T')[0],
    };

    setOrgs((prev) => [...prev, newOrg]);
    setNewOrgName('');
    setNewAdminEmail('');
    setNewAdminName('');
    alert(`Organização "${newOrgName}" cadastrada na edição "${newPlanTier}"!`);
  };

  const handleSaveOverride = () => {
    if (!editingOrg) return;

    setOrgs((prev) =>
      prev.map((item) =>
        item.id === editingOrg.id
          ? { ...item, plan_tier: editPlan, custom_token_override: editOverride }
          : item
      )
    );
    setEditingOrg(null);
  };

  const handleGenerateMagicDemoLink = async (org: ClientOrganizationItem) => {
    setIsGeneratingDemo(true);
    setGeneratedDemoOrg(org.name);

    try {
      const response = await fetch('/api/v1/master/demo-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: org.id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar link de demo.');

      setGeneratedDemoUrl(data.demoUrl);
      setCopiedLink(false);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const handleCopyDemoUrl = () => {
    if (!generatedDemoUrl) return;
    navigator.clipboard.writeText(generatedDemoUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '32px', background: 'var(--bg-primary)' }}>
      {/* Header Master */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '6px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))' }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {t.masterAdmin.title}
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            {t.masterAdmin.subtitle}
          </p>
        </div>
      </div>

      {/* Widgets Financeiros & Dashboard Global */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={cardStatStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={statTitleStyle}>Total de Clientes</span>
            <Building size={20} color="var(--accent-purple)" />
          </div>
          <h2 style={statValueStyle}>{orgs.length}</h2>
          <span style={statSubStyle}>{totalUsers} usuários ativos</span>
        </div>

        <div style={cardStatStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={statTitleStyle}>Tokens Consumidos</span>
            <Zap size={20} color="var(--accent-cyan)" />
          </div>
          <h2 style={statValueStyle}>{totalAI.toLocaleString()}</h2>
          <span style={statSubStyle}>Tokens Gemini consumidos</span>
        </div>

        <div style={cardStatStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={statTitleStyle}>Total de Execuções</span>
            <Activity size={20} color="#10b981" />
          </div>
          <h2 style={statValueStyle}>{totalExecutions.toLocaleString()}</h2>
          <span style={statSubStyle}>Execuções de fluxos no mês</span>
        </div>

        <div style={{
          ...cardStatStyle,
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(245, 158, 11, 0.1))',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...statTitleStyle, color: '#f87171' }}>Custos Operacionais</span>
            <DollarSign size={20} color="#f87171" />
          </div>
          <h2 style={{ ...statValueStyle, color: '#ef4444' }}>${totalOperationalCost.toFixed(3)}</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            API AI: ${estimatedAICost.toFixed(3)} | DB: ${estimatedDbCost.toFixed(3)}
          </span>
        </div>
      </div>

      {/* Tabela Global de Clientes com Badges de Edição Oficial */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '32px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Gestão de Clientes e Edições do Motor (Forge, Kinex, Axiom, Synapse)
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-muted)' }}>
              <th style={thStyle}>Organização</th>
              <th style={thStyle}>Edição Contratada</th>
              <th style={thStyle}>Limite Base + Override</th>
              <th style={thStyle}>Tokens Consumidos</th>
              <th style={thStyle}>Usuários</th>
              <th style={thStyle}>Execuções</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Ações Rápidas</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => {
              const baseLimits: Record<PlanTier, number> = {
                Forge: 10000,
                Kinex: 50000,
                Axiom: 200000,
                Synapse: 1000000,
              };
              const base = baseLimits[org.plan_tier] || 10000;
              const totalLimit = base + org.custom_token_override;
              const usagePercent = Math.min(100, Math.round((org.ai_tokens_used / totalLimit) * 100));

              return (
                <tr key={org.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={tdStyle}>
                    <strong style={{ color: 'var(--text-primary)' }}>{org.name}</strong>
                    <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>ID: {org.id}</span>
                  </td>
                  <td style={tdStyle}>
                    <EditionBadge edition={org.plan_tier} size="small" />
                  </td>
                  <td style={tdStyle}>
                    <span>{totalLimit.toLocaleString()} tokens</span>
                    {org.custom_token_override > 0 && (
                      <span style={{ fontSize: '10px', color: '#10b981', display: 'block' }}>
                        (+{org.custom_token_override.toLocaleString()} override)
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{usagePercent}%</span>
                      <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{ width: `${usagePercent}%`, height: '100%', background: usagePercent > 90 ? '#ef4444' : 'var(--accent-cyan)' }} />
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>{org.active_users_count}</td>
                  <td style={tdStyle}>{org.executions_count}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => handleGenerateMagicDemoLink(org)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                          border: 'none',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '11px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
                        }}
                      >
                        <Sparkles size={13} />
                        Demo Mágica
                      </button>

                      <button
                        onClick={() => {
                          setEditingOrg(org);
                          setEditPlan(org.plan_tier);
                          setEditOverride(org.custom_token_override);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--accent-blue)',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit2 size={13} />
                        Editar Edição
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cadastrar Nova Organização e Edição */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '24px',
        maxWidth: '600px',
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Cadastrar Nova Organização
        </h3>

        <form onSubmit={handleCreateOrg} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Nome da Empresa / Cliente</label>
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Ex: Empresa Global S/A"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>E-mail do Admin Principal</label>
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@cliente.com"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Edição Contratada (Poder do Motor)</label>
              <select
                value={newPlanTier}
                onChange={(e) => setNewPlanTier(e.target.value as PlanTier)}
                style={inputStyle}
              >
                <option value="Forge">Forge Edition (10k tokens - Slate)</option>
                <option value="Kinex">Kinex Edition (50k tokens - Orange)</option>
                <option value="Axiom">Axiom Edition (200k tokens - Blue)</option>
                <option value="Synapse">Synapse Edition (1M tokens - Cyan)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
              color: '#0a0c10',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            <Plus size={16} />
            Cadastrar Cliente e Registrar Admin
          </button>
        </form>
      </div>

      {/* Modal de Exibição do Link de Demo Mágica */}
      {generatedDemoUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '20px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(24px)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))' }}>
                  <Sparkles size={22} color="#ffffff" />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Link de Demo Mágica Gerado!
                  </h2>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Cliente: {generatedDemoOrg}
                  </span>
                </div>
              </div>
              <button onClick={() => setGeneratedDemoUrl(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '11px',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}>
              <Clock size={16} />
              <span><strong>Validade de 7 Dias:</strong> O cliente acessará o painel autenticado silenciosamente sem digitar senha.</span>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>URL do Link Mágico de Acesso</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input
                  type="text"
                  readOnly
                  value={generatedDemoUrl}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleCopyDemoUrl}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: copiedLink ? '#10b981' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                    color: copiedLink ? '#fff' : '#0a0c10',
                    fontWeight: 800,
                    fontSize: '12px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                  {copiedLink ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setGeneratedDemoUrl(null)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Edição de Override e Edição do Motor */}
      {editingOrg && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '20px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Editar Edição & Custom Override ({editingOrg.name})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Alterar Edição do Motor</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value as PlanTier)}
                  style={inputStyle}
                >
                  <option value="Forge">Forge Edition (10.000 tokens - Slate)</option>
                  <option value="Kinex">Kinex Edition (50.000 tokens - Orange)</option>
                  <option value="Axiom">Axiom Edition (200.000 tokens - Blue)</option>
                  <option value="Synapse">Synapse Edition (1.000.000 tokens - Cyan)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Tokens Extras Customizados (Override)</label>
                <input
                  type="number"
                  value={editOverride}
                  onChange={(e) => setEditOverride(Number(e.target.value))}
                  placeholder="Ex: 50000"
                  style={inputStyle}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Este valor será somado ao limite base da edição contratada.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  onClick={() => setEditingOrg(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSaveOverride}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--accent-purple)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const cardStatStyle: React.CSSProperties = {
  background: 'var(--bg-glass)',
  backdropFilter: 'blur(16px)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const statTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
};

const statValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 900,
  color: 'var(--text-primary)',
  margin: 0,
};

const statSubStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-secondary)',
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  padding: '16px',
  color: 'var(--text-secondary)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
};
