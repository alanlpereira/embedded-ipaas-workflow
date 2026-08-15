import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Edit2, Zap, DollarSign, Users, Activity, Building, Lock, Sparkles, Copy, Check, X, Clock, Scale } from 'lucide-react';
import { Profile, PlanTier } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { EditionBadge } from './EditionBadge';
import { AiAnalyticsDashboard } from './AiAnalyticsDashboard';
import { getApiUrl } from '../lib/api';
import { supabase } from '../lib/supabase';

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

const defaultOrganizations: ClientOrganizationItem[] = [
  {
    id: 'org-legal-ops',
    name: 'Advocacia Rodrigo Moura & Associados (Legal Ops)',
    plan_tier: 'LegalOps',
    active_status: 'ACTIVE',
    ai_tokens_limit: 500000,
    custom_token_override: 250000,
    ai_tokens_used: 12500,
    active_users_count: 3,
    executions_count: 540,
    created_at: '2026-08-10',
  },
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

  const [orgs, setOrgs] = useState<ClientOrganizationItem[]>(() => {
    try {
      const saved = localStorage.getItem('synapse_organizations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultOrganizations;
  });

  useEffect(() => {
    try {
      localStorage.setItem('synapse_organizations', JSON.stringify(orgs));
    } catch (e) {}
  }, [orgs]);

  // Estados de Cadastro de Nova Org
  const [newOrgName, setNewOrgName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newPlanTier, setNewPlanTier] = useState<PlanTier>('LegalOps');

  // 🚀 FASE 1 (OPÇÃO A): Carregamento de Perfis Globais via RPC get_all_profiles (SECURITY DEFINER)
  useEffect(() => {
    async function fetchMasterProfilesFromRpc() {
      try {
        const { data: rpcProfiles, error } = await supabase.rpc('get_all_profiles');
        if (error) {
          console.warn('⚠️ RPC get_all_profiles pendente no SQL Editor, executando fallback direto:', error.message);
          const { data: directProfiles } = await supabase.from('profiles').select('*');
          if (directProfiles && directProfiles.length > 0) {
            console.log(`📊 Perfis recuperados via fallback direto: ${directProfiles.length}`);
          }
        } else if (rpcProfiles && rpcProfiles.length > 0) {
          console.log(`⚡ [RPC MASTER DEFINER] ${rpcProfiles.length} perfis recuperados via RPC get_all_profiles().`);
        }
      } catch (err) {
        console.warn('⚠️ Erro ao invocar RPC get_all_profiles:', err);
      }
    }

    fetchMasterProfilesFromRpc();
  }, []);

  // Estado de Edição de Override
  const [editingOrg, setEditingOrg] = useState<ClientOrganizationItem | null>(null);
  const [editOverride, setEditOverride] = useState<number>(0);
  const [editPlan, setEditPlan] = useState<PlanTier>('LegalOps');

  // Estado da Demo Mágica
  const [generatedDemoUrl, setGeneratedDemoUrl] = useState<string | null>(null);
  const [generatedDemoOrg, setGeneratedDemoOrg] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  const isMaster = Boolean(
    currentProfile?.role === 'Master' ||
    currentProfile?.role === 'Admin' ||
    currentProfile?.email === 'alanlpereira@hotmail.com' ||
    currentProfile?.email === 'alan.pereira@alp-nexus.com' ||
    (currentProfile?.email && currentProfile.email.endsWith('@alp-nexus.com'))
  );

  if (!isMaster) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        <h2>Acesso Negado</h2>
        <p>Apenas perfis Master possuem acesso ao Painel Global de Administração.</p>
      </div>
    );
  }

  const baseLimits: Record<PlanTier, number> = {
    Forge: 10000,
    Kinex: 50000,
    Axiom: 200000,
    Synapse: 1000000,
    LegalOps: 500000,
  };

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newAdminEmail.trim()) return;

    const newOrg: ClientOrganizationItem = {
      id: `org-${Date.now()}`,
      name: newOrgName.trim(),
      plan_tier: newPlanTier,
      active_status: 'ACTIVE',
      ai_tokens_limit: baseLimits[newPlanTier] || 500000,
      custom_token_override: 0,
      ai_tokens_used: 0,
      active_users_count: 1,
      executions_count: 0,
      created_at: new Date().toISOString().split('T')[0],
    };

    const updated = [newOrg, ...orgs];
    setOrgs(updated);
    setNewOrgName('');
    setNewAdminEmail('');
    setNewAdminName('');
    alert(`Organização ${newOrg.name} cadastrada com sucesso na edição ${newPlanTier}!`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    const updated = orgs.map((o) => {
      if (o.id === editingOrg.id) {
        return {
          ...o,
          plan_tier: editPlan,
          custom_token_override: editOverride,
          ai_tokens_limit: baseLimits[editPlan] || o.ai_tokens_limit,
        };
      }
      return o;
    });

    setOrgs(updated);
    setEditingOrg(null);
    alert('Limites e edições atualizados com sucesso!');
  };

  const handleGenerateMagicLink = async (orgName: string) => {
    setIsGeneratingDemo(true);
    setGeneratedDemoOrg(orgName);
    try {
      const response = await fetch(`${getApiUrl('')}/api/demo/generate-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, expiresHours: 24 }),
      });
      const data = await response.json();
      if (data.url) {
        setGeneratedDemoUrl(data.url);
      } else {
        const fallbackUrl = `${window.location.origin}/?demo_org=${encodeURIComponent(orgName)}&token=magic-demo-${Date.now()}`;
        setGeneratedDemoUrl(fallbackUrl);
      }
    } catch (err) {
      const fallbackUrl = `${window.location.origin}/?demo_org=${encodeURIComponent(orgName)}&token=magic-demo-${Date.now()}`;
      setGeneratedDemoUrl(fallbackUrl);
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedDemoUrl) {
      navigator.clipboard.writeText(generatedDemoUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  };

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '32px', background: 'var(--bg-primary)' }}>
      {/* Header Master */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <ShieldCheck size={24} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
              Painel Master de Administração Global
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Gestão de clientes, limites de IA por edição (Legal Ops, Forge, Kinex, Axiom, Synapse) e geração de Links Mágicos.
          </p>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>Organizações Ativas</span>
            <Building size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)' }}>
            {orgs.length}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>Usuários Ativos Totais</span>
            <Users size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#10b981' }}>
            {orgs.reduce((acc, o) => acc + o.active_users_count, 0)}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>Execuções de Fluxos</span>
            <Activity size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#a855f7' }}>
            {orgs.reduce((acc, o) => acc + o.executions_count, 0).toLocaleString('pt-BR')}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>Tokens IA Consumidos</span>
            <Zap size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#f59e0b' }}>
            {(orgs.reduce((acc, o) => acc + o.ai_tokens_used, 0) / 1000).toFixed(1)}k
          </div>
        </div>
      </div>

      {/* Seção 1: Formulário de Cadastro de Nova Org */}
      <div style={{ ...cardStyle, marginBottom: '28px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} color="var(--accent-cyan)" />
          Cadastrar Nova Organização de Cliente
        </h3>

        <form onSubmit={handleCreateOrg} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Nome da Organização</label>
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Ex: Advocacia Rodrigo Moura"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>E-mail do Administrador</label>
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="rodrigo.moura@alp-nexus.com"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Edição do Motor</label>
            <select
              value={newPlanTier}
              onChange={(e) => setNewPlanTier(e.target.value as PlanTier)}
              style={inputStyle}
            >
              <option value="LegalOps">⚖️ Legal Ops Edition (500k tokens - PJe Restrito)</option>
              <option value="Synapse">✨ Synapse Edition (1M tokens - Cyan Total)</option>
              <option value="Axiom">⚡ Axiom Edition (200k tokens - Blue)</option>
              <option value="Kinex">🔥 Kinex Edition (50k tokens - Orange)</option>
              <option value="Forge">🔨 Forge Edition (10k tokens - Slate)</option>
            </select>
          </div>

          <button
            type="submit"
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
              color: '#0a0c10',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 242, 254, 0.3)',
              height: '42px',
            }}
          >
            + Cadastrar Organização
          </button>
        </form>
      </div>

      {/* Seção 2: Dashboard de Monitoramento de IA & Custos vs Google Ultra */}
      <div style={{ marginBottom: '28px' }}>
        <AiAnalyticsDashboard />
      </div>

      {/* Seção 3: Tabela de Organizações */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
          Organizações Cadastradas ({orgs.length})
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Organização</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Edição</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Limite Base + Override</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Consumo IA</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Usuários</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => {
                const totalLimit = org.ai_tokens_limit + (org.custom_token_override || 0);
                const usagePercent = Math.min(100, Math.round((org.ai_tokens_used / totalLimit) * 100));

                return (
                  <tr key={org.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px' }}>
                      {org.name}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <EditionBadge edition={org.plan_tier} size="small" />
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
                      {totalLimit.toLocaleString('pt-BR')} tokens
                      {org.custom_token_override > 0 && (
                        <span style={{ fontSize: '10px', color: '#10b981', marginLeft: '6px', fontWeight: 700 }}>
                          (+{(org.custom_token_override / 1000).toFixed(0)}k extra)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {org.ai_tokens_used.toLocaleString('pt-BR')} ({usagePercent}%)
                      </div>
                      <div style={{ width: '120px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${usagePercent}%`, height: '100%', background: usagePercent > 85 ? '#ef4444' : '#38bdf8' }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {org.active_users_count} membros
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setEditingOrg(org);
                            setEditPlan(org.plan_tier);
                            setEditOverride(org.custom_token_override || 0);
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--accent-cyan)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Edit2 size={13} /> Editar Quota
                        </button>

                        <button
                          onClick={() => handleGenerateMagicLink(org.name)}
                          disabled={isGeneratingDemo}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            color: '#f59e0b',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Sparkles size={13} /> Link Mágico
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar Organização */}
      {editingOrg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '440px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800 }}>Editar {editingOrg.name}</h3>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Alterar Edição do Motor</label>
                <select value={editPlan} onChange={e => setEditPlan(e.target.value as PlanTier)} style={inputStyle}>
                  <option value="LegalOps">⚖️ Legal Ops Edition (500k tokens - PJe Restrito)</option>
                  <option value="Synapse">✨ Synapse Edition (1M tokens - Cyan Total)</option>
                  <option value="Axiom">⚡ Axiom Edition (200k tokens - Blue)</option>
                  <option value="Kinex">🔥 Kinex Edition (50k tokens - Orange)</option>
                  <option value="Forge">🔨 Forge Edition (10k tokens - Slate)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Tokens Extras Customizados (Override)</label>
                <input type="number" value={editOverride} onChange={e => setEditOverride(Number(e.target.value))} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingOrg(null)} style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-cyan)', color: '#0a0c10', fontWeight: 800, border: 'none' }}>Salvar Quota</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Link Mágico */}
      {generatedDemoUrl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '500px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800 }}>Link Mágico de Demonstração</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Link de demonstração de 24h gerado para <strong>{generatedDemoOrg}</strong>:</p>
            <input type="text" readOnly value={generatedDemoUrl} style={{ ...inputStyle, background: 'var(--bg-tertiary)', color: '#38bdf8', fontFamily: 'monospace', marginBottom: '16px' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setGeneratedDemoUrl(null)} style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>Fechar</button>
              <button onClick={handleCopyLink} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-cyan)', color: '#0a0c10', fontWeight: 800, border: 'none' }}>{copiedLink ? 'Copiado!' : 'Copiar Link'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
