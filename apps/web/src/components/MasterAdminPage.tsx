import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Edit2, Zap, DollarSign, Users, Activity, Building, Lock, Sparkles, Copy, Check, X, Clock, Scale, Trash2, ToggleLeft, ToggleRight, Mail, Phone } from 'lucide-react';
import { Profile, PlanTier, UserRole } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { EditionBadge } from './EditionBadge';
import { AiAnalyticsDashboard } from './AiAnalyticsDashboard';
import { getApiUrl } from '../lib/api';
import { supabase } from '../lib/supabase';

export interface ExtendedProfile extends Profile {
  manual_status_override?: boolean;
  custom_plan_price?: number;
  ai_monthly_limit?: number;
}

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

  const [dbUsers, setDbUsers] = useState<ExtendedProfile[]>([]);

  // 🚀 Carregamento de Perfis Globais via RPC get_all_profiles (SECURITY DEFINER)
  const fetchMasterProfilesFromRpc = async () => {
    try {
      const { data: rpcProfiles, error } = await supabase.rpc('get_all_profiles');
      const list = (!error && rpcProfiles)
        ? rpcProfiles
        : (await supabase.from('profiles').select('*')).data;

      if (list) {
        setDbUsers(list);
        console.log(`⚡ [RPC MASTER DEFINER] ${list.length} perfis recuperados via RPC get_all_profiles().`);
      }
    } catch (err) {
      console.warn('⚠️ Erro ao invocar RPC get_all_profiles:', err);
    }
  };

  useEffect(() => {
    fetchMasterProfilesFromRpc();
  }, []);

  const handleDeleteDbUser = async (userId: string, userEmail: string) => {
    if (confirm(`ATENÇÃO MASTER: Excluir definitivamente o usuário ${userEmail} (${userId}) do banco PostgreSQL?`)) {
      try {
        console.log(`🗑️ [MASTER DB DELETE] Deletando perfil ${userId} do banco...`);
        const { error: rpcErr } = await supabase.rpc('delete_user_profile', { target_user_id: userId });
        if (rpcErr) {
          await supabase.from('profiles').delete().eq('id', userId);
        }
        setDbUsers((prev) => prev.filter((u) => u.id !== userId));
        alert(`Usuário ${userEmail} deletado com sucesso do PostgreSQL!`);
      } catch (err: any) {
        alert(`Erro ao deletar usuário do banco: ${err.message}`);
      }
    }
  };

  // Estado de Edição de Override de Usuário PostgreSQL
  const [editingUser, setEditingUser] = useState<ExtendedProfile | null>(null);
  const [userOverrideStatus, setUserOverrideStatus] = useState<boolean>(false);
  const [userAiLimit, setUserAiLimit] = useState<number>(100);
  const [userCustomPrice, setUserCustomPrice] = useState<number | ''>('');
  const [userPlan, setUserPlan] = useState<string>('Pro');
  const [userRole, setUserRole] = useState<UserRole>('Member');
  const [userOabNumber, setUserOabNumber] = useState<string>('');
  const [userOabUf, setUserOabUf] = useState<string>('MG');
  const [isSendingStripePortal, setIsSendingStripePortal] = useState<boolean>(false);

  useEffect(() => {
    if (editingUser) {
      setUserOverrideStatus(Boolean(editingUser.manual_status_override));
      setUserAiLimit(editingUser.ai_monthly_limit || 100);
      setUserCustomPrice(editingUser.custom_plan_price || '');
      setUserPlan(editingUser.subscription_plan || 'Pro');
      setUserRole(editingUser.role || 'Member');
      setUserOabNumber(editingUser.oab_number || '');
      setUserOabUf(editingUser.oab_uf || 'MG');
    }
  }, [editingUser]);

  const handleUpdateUserField = async (userId: string, field: string, value: any) => {
    try {
      console.log(`⚡ [MASTER FIELD UPDATE] Atualizando ${field} para ${userId}:`, value);
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', userId);

      if (error) throw error;

      setDbUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, [field]: value } : u))
      );

      console.log(`✅ [MASTER FIELD UPDATE SUCESSO] ${field} de ${userId} atualizado!`);
    } catch (err: any) {
      alert(`Erro ao atualizar campo ${field}: ${err.message}`);
    }
  };

  const handleSaveUserOverrides = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      console.log(`⚡ [MASTER OVERRIDE] Atualizando perfil completo ${editingUser.email}...`);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const payload = {
        manual_status_override: userOverrideStatus,
        ai_monthly_limit: Number(userAiLimit),
        custom_plan_price: userCustomPrice === '' ? null : Number(userCustomPrice),
        subscription_plan: userPlan,
        role: userRole as UserRole,
        oab_number: userOabNumber || null,
        oab_uf: userOabUf || 'MG'
      };

      const resp = await fetch(getApiUrl('admin-billing-manager'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'update_profile_override',
          target_user_id: editingUser.id,
          ...payload
        })
      });

      const res = await resp.json();

      // Atualização direta no PostgreSQL como fallback
      await supabase
        .from('profiles')
        .update(payload)
        .eq('id', editingUser.id);

      setDbUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                ...payload,
                role: userRole as UserRole,
                custom_plan_price: userCustomPrice === '' ? undefined : Number(userCustomPrice),
                oab_number: userOabNumber || undefined,
                oab_uf: userOabUf || undefined
              }
            : u
        )
      );

      alert(`✅ Configurações e Overrides de ${editingUser.email} atualizados com sucesso!`);
      setEditingUser(null);
    } catch (err: any) {
      alert(`Erro ao atualizar overrides: ${err.message}`);
    }
  };

  const handleSendStripePortalLink = async () => {
    if (!editingUser) return;
    setIsSendingStripePortal(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const resp = await fetch(getApiUrl('admin-billing-manager'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'send_portal_link',
          target_user_id: editingUser.id
        })
      });

      const res = await resp.json();
      alert(`✉️ [STRIPE PORTAL] ${res.message || 'Link gerado com sucesso.'}`);
    } catch (err: any) {
      alert(`Erro ao gerar link do portal: ${err.message}`);
    } finally {
      setIsSendingStripePortal(false);
    }
  };

  // Estado de Edição de Override de Organização
  const [editingOrg, setEditingOrg] = useState<ClientOrganizationItem | null>(null);
  const [editOverride, setEditOverride] = useState<number>(0);
  const [editPlan, setEditPlan] = useState<PlanTier>('LegalOps');

  // Estado da Demo Mágica
  const [generatedDemoUrl, setGeneratedDemoUrl] = useState<string | null>(null);
  const [generatedDemoOrg, setGeneratedDemoOrg] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  // 🚩 ESTADOS DE FEATURE FLAGS (Obrigatoriedade de Confirmação de E-mail e Telefone)
  const [requireEmailVerification, setRequireEmailVerification] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('synapse_require_email_verification') === 'true' : false;
  });
  const [requirePhoneVerification, setRequirePhoneVerification] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('synapse_require_phone_verification') === 'true' : false;
  });

  const handleToggleEmailVerification = async () => {
    const nextVal = !requireEmailVerification;
    setRequireEmailVerification(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('synapse_require_email_verification', String(nextVal));
    }
    try {
      await supabase
        .from('organizations')
        .update({ require_email_verification: nextVal })
        .eq('id', 'org-alp-nexus');
    } catch (e) {}
  };

  const handleTogglePhoneVerification = async () => {
    const nextVal = !requirePhoneVerification;
    setRequirePhoneVerification(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('synapse_require_phone_verification', String(nextVal));
    }
    try {
      await supabase
        .from('organizations')
        .update({ require_phone_verification: nextVal })
        .eq('id', 'org-alp-nexus');
    } catch (e) {}
  };

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

      {/* 🚩 SEÇÃO DE FEATURE FLAGS (CONTROLE MASTER DE CONFIRMAÇÃO DE E-MAIL E TELEFONE) */}
      <div style={{ ...cardStyle, marginBottom: '28px', border: '1px solid rgba(56, 189, 248, 0.25)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#38bdf8" />
              Feature Flags da Plataforma (Controle Master)
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Alterne em tempo real as travas de verificação obrigatória durante o cadastro e onboarding.
            </p>
          </div>
          <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '4px 10px', fontWeight: 700 }}>
            Configuração Global
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Toggle 1: Obrigatoriedade de E-mail */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: requireEmailVerification ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: requireEmailVerification ? '#10b981' : '#94a3b8' }}>
                <Mail size={20} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Confirmação de E-mail</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Exigir verificação Magic Link / OTP</div>
              </div>
            </div>
            <button
              onClick={handleToggleEmailVerification}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: requireEmailVerification ? '#10b981' : '#64748b', transition: 'all 0.2s' }}
              title={requireEmailVerification ? 'Ativo (Clique para desativar)' : 'Desativado (Clique para ativar)'}
            >
              {requireEmailVerification ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
            </button>
          </div>

          {/* Toggle 2: Obrigatoriedade de Telefone */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: requirePhoneVerification ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: requirePhoneVerification ? '#10b981' : '#94a3b8' }}>
                <Phone size={20} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Confirmação de Telefone</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Exigir validação por SMS / WhatsApp</div>
              </div>
            </div>
            <button
              onClick={handleTogglePhoneVerification}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: requirePhoneVerification ? '#10b981' : '#64748b', transition: 'all 0.2s' }}
              title={requirePhoneVerification ? 'Ativo (Clique para desativar)' : 'Desativado (Clique para ativar)'}
            >
              {requirePhoneVerification ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
            </button>
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

      {/* Seção 3: Centro de Comando Master — Usuários Registrados (`public.profiles`) */}
      <div style={{ ...cardStyle, marginBottom: '28px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="#10b981" />
          Centro de Comando Master — Usuários Registrados (`public.profiles`) ({dbUsers.length})
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Advogado / ID</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>E-mail & OAB</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Status & Override</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Plano & Preço</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Uso IA / Limite</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Painel de Comando Master</th>
              </tr>
            </thead>
            <tbody>
              {dbUsers.map((user) => {
                const isOverridden = Boolean(user.manual_status_override);
                const isAct = isOverridden || user.subscription_status === 'active';
                const currentUsage = user.ai_monthly_usage || 0;
                const maxLimit = user.ai_monthly_limit || 100;

                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px' }}>
                      {user.full_name || 'Advogado'}
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{user.id}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#38bdf8', fontSize: '13px', fontWeight: 600 }}>
                      {user.email}
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                        {user.oab_number ? `OAB/${user.oab_uf || 'MG'} ${user.oab_number}` : 'OAB Pendente'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => handleUpdateUserField(user.id, 'manual_status_override', !isOverridden)}
                        title="Clique para Alternar Liberação Forçada (Override Stripe)"
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: isOverridden ? 'rgba(16, 185, 129, 0.2)' : (isAct ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                          color: isOverridden ? '#10b981' : (isAct ? '#3b82f6' : '#ef4444'),
                          border: isOverridden ? '1px solid rgba(16, 185, 129, 0.4)' : (isAct ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'),
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {isOverridden ? '🟢 LIBERADO (OVERRIDE)' : (isAct ? '🔵 ATIVO (STRIPE)' : '🔴 BLOQUEADO')}
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <select
                        value={user.subscription_plan || 'Pro'}
                        onChange={(e) => handleUpdateUserField(user.id, 'subscription_plan', e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          color: '#38bdf8',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Pro">⚖️ Plano Pro (R$ 149)</option>
                        <option value="Enterprise">🏢 Enterprise</option>
                        <option value="LegalOps">⚖️ Legal Ops (500k)</option>
                        <option value="Synapse">✨ Synapse (1M)</option>
                        <option value="Axiom">⚡ Axiom (200k)</option>
                        <option value="Kinex">🔥 Kinex (50k)</option>
                        <option value="Forge">🔨 Forge (10k)</option>
                      </select>
                      {user.custom_plan_price ? (
                        <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, marginTop: '2px' }}>Custom: R$ {user.custom_plan_price}/mês</div>
                      ) : null}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong>{currentUsage} / {maxLimit}</strong>
                        <button
                          title="Zerar Consumo de IA"
                          onClick={() => handleUpdateUserField(user.id, 'ai_monthly_usage', 0)}
                          style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer' }}
                        >
                          🔄 Zerar
                        </button>
                      </div>
                      <div style={{ width: '100px', height: '5px', background: 'var(--bg-tertiary)', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, Math.round((currentUsage / maxLimit) * 100))}%`, height: '100%', background: '#38bdf8' }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => setEditingUser(user)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                            color: '#0a0c10',
                            fontSize: '11px',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Zap size={13} /> Gerenciar Overrides
                        </button>

                        <button
                          onClick={() => handleDeleteDbUser(user.id, user.email)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {dbUsers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Nenhum usuário cadastrado no banco de dados.
                  </td>
                </tr>
              )}
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
      {/* Modal Overrides de Usuário (Painel Master) */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '480px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="var(--accent-cyan)" />
                Gerenciar Overrides — {editingUser.full_name || editingUser.email}
              </h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveUserOverrides} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Edição do App / Plano & Role */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Edição do App / Plano</label>
                  <select
                    value={userPlan}
                    onChange={(e) => setUserPlan(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="Pro">⚖️ Plano Pro (R$ 149/mês)</option>
                    <option value="Enterprise">🏢 Enterprise</option>
                    <option value="LegalOps">⚖️ Legal Ops (500k tokens)</option>
                    <option value="Synapse">✨ Synapse (1M tokens)</option>
                    <option value="Axiom">⚡ Axiom (200k tokens)</option>
                    <option value="Kinex">🔥 Kinex (50k tokens)</option>
                    <option value="Forge">🔨 Forge (10k tokens)</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Role / Permissão</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    style={inputStyle}
                  >
                    <option value="Member">👤 Member (Advogado)</option>
                    <option value="Master">👑 Master (Admin Global)</option>
                    <option value="Admin">🛡️ Admin (Gestor)</option>
                    <option value="Viewer">👁️ Viewer (Leitura)</option>
                  </select>
                </div>
              </div>

              {/* Registro Profissional OAB */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Número da OAB</label>
                  <input
                    type="text"
                    value={userOabNumber}
                    onChange={(e) => setUserOabNumber(e.target.value)}
                    placeholder="Ex: 123456"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>UF da OAB</label>
                  <select
                    value={userOabUf}
                    onChange={(e) => setUserOabUf(e.target.value)}
                    style={inputStyle}
                  >
                    {['MG', 'SP', 'RJ', 'PR', 'RS', 'SC', 'BA', 'DF', 'GO', 'ES', 'PE', 'CE', 'MA', 'PA', 'PB', 'AM', 'RN', 'AL', 'PI', 'MT', 'MS', 'SE', 'RO', 'TO', 'AC', 'AP', 'RR'].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Override Liberação Forçada */}
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: userOverrideStatus ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-tertiary)', border: userOverrideStatus ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                  <span>🟢 Liberação Forçada (Override Stripe)</span>
                  <input
                    type="checkbox"
                    checked={userOverrideStatus}
                    onChange={(e) => setUserOverrideStatus(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                  />
                </label>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Quando ativado, libera o Portal PJe imediatamente, ignorando inadimplência do Stripe.
                </div>
              </div>

              {/* Ajustar Limite Mensal de IA & Preço Customizado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Limite Mensal de IA (ai_monthly_limit)</label>
                  <input
                    type="number"
                    value={userAiLimit}
                    onChange={(e) => setUserAiLimit(Number(e.target.value))}
                    placeholder="Ex: 5000"
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Preço Customizado (R$/mês)</label>
                  <input
                    type="number"
                    value={userCustomPrice}
                    onChange={(e) => setUserCustomPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Padrão R$ 149"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Ação Stripe Customer Portal */}
              <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleSendStripePortalLink}
                  disabled={isSendingStripePortal}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#3b82f6',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ✉️ Link Stripe Portal (PCI)
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => setEditingUser(null)} style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', color: '#0a0c10', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Salvar Configurações</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
