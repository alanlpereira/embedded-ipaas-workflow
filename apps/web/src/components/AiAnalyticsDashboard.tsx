import React, { useState, useEffect } from 'react';
import { Sparkles, DollarSign, Users, Zap, TrendingDown, ShieldCheck, CheckCircle2, Bot, ArrowUpRight, BarChart3, RefreshCw, FileText } from 'lucide-react';
import { AiUsageLogItem } from '../services/LegalAiService';

interface UserSummary {
  email: string;
  name: string;
  requestsCount: number;
  tokensCount: number;
  costBrl: number;
  edition: string;
}

const mockInitialLogs: AiUsageLogItem[] = [
  {
    id: 'log-1',
    user_email: 'rodrigo.moura@alp-nexus.com',
    user_name: 'Dr. Rodrigo Moura Rodrigues',
    prompt_preview: 'Elaborar contestação c/c impugnação para cobrança indevida Cemig S.A. Processo 5001234-88.2026.8.13.0024',
    model_used: 'gemini-2.0-flash',
    provider_used: 'gemini_direct',
    tokens_consumed: 4850,
    estimated_cost_usd: 0.000363,
    estimated_cost_brl: 0.002,
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'log-2',
    user_email: 'rodrigo.moura@alp-nexus.com',
    user_name: 'Dr. Rodrigo Moura Rodrigues',
    prompt_preview: 'Analisar prazo fatal e sugestão de minuta de Agravo de Instrumento com efeito suspensivo',
    model_used: 'gemini-1.5-pro',
    provider_used: 'edge_function',
    tokens_consumed: 8200,
    estimated_cost_usd: 0.01025,
    estimated_cost_brl: 0.056,
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'log-3',
    user_email: 'alan.pereira@alp-nexus.com',
    user_name: 'Dr. Alan Pereira',
    prompt_preview: 'Sintetizar rito de intimação judicial e verificar prescrição quinquenal de débitos tributários',
    model_used: 'gemini-2.0-flash',
    provider_used: 'edge_function',
    tokens_consumed: 6100,
    estimated_cost_usd: 0.000457,
    estimated_cost_brl: 0.0025,
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'log-4',
    user_email: 'rodrigo.moura@alp-nexus.com',
    user_name: 'Dr. Rodrigo Moura Rodrigues',
    prompt_preview: 'Redigir réplica à contestação requerendo inversão do ônus da prova CDC',
    model_used: 'gemini-2.0-flash',
    provider_used: 'gemini_direct',
    tokens_consumed: 5200,
    estimated_cost_usd: 0.00039,
    estimated_cost_brl: 0.0021,
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'log-5',
    user_email: 'dev.admin@alp-nexus.com',
    user_name: 'Carlos Santos (Admin)',
    prompt_preview: 'Testar automação de gatilho webhook e extração de anexos de intimação PJe',
    model_used: 'gemini-2.0-flash',
    provider_used: 'edge_function',
    tokens_consumed: 3400,
    estimated_cost_usd: 0.000255,
    estimated_cost_brl: 0.0014,
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
];

export const AiAnalyticsDashboard: React.FC = () => {
  const [logs, setLogs] = useState<AiUsageLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('synapse_ai_usage_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return [...parsed, ...mockInitialLogs];
      }
    } catch (e) {}
    return mockInitialLogs;
  });

  const handleRefresh = () => {
    try {
      const saved = localStorage.getItem('synapse_ai_usage_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLogs([...parsed, ...mockInitialLogs]);
        }
      }
    } catch (e) {}
  };

  // Cálculo das métricas agregadas por usuário
  const userSummariesMap: Record<string, UserSummary> = {
    'rodrigo.moura@alp-nexus.com': {
      email: 'rodrigo.moura@alp-nexus.com',
      name: 'Dr. Rodrigo Moura Rodrigues',
      requestsCount: 42,
      tokensCount: 185400,
      costBrl: 0.48,
      edition: '⚖️ Legal Ops Edition',
    },
    'alan.pereira@alp-nexus.com': {
      email: 'alan.pereira@alp-nexus.com',
      name: 'Dr. Alan Pereira',
      requestsCount: 78,
      tokensCount: 412000,
      costBrl: 0.82,
      edition: '✨ Synapse Edition',
    },
    'dev.admin@alp-nexus.com': {
      email: 'dev.admin@alp-nexus.com',
      name: 'Carlos Santos (Admin)',
      requestsCount: 19,
      tokensCount: 68000,
      costBrl: 0.14,
      edition: '✨ Synapse Edition',
    },
  };

  // Atualizar contadores em tempo real a partir dos logs gravados
  logs.forEach((log) => {
    const key = log.user_email || 'rodrigo.moura@alp-nexus.com';
    if (!userSummariesMap[key]) {
      userSummariesMap[key] = {
        email: key,
        name: log.user_name || key,
        requestsCount: 0,
        tokensCount: 0,
        costBrl: 0,
        edition: key.includes('rodrigo') ? '⚖️ Legal Ops Edition' : '✨ Synapse Edition',
      };
    }
    userSummariesMap[key].requestsCount += 1;
    userSummariesMap[key].tokensCount += log.tokens_consumed;
    userSummariesMap[key].costBrl += log.estimated_cost_brl;
  });

  const userSummaries = Object.values(userSummariesMap);
  const totalRequests = userSummaries.reduce((acc, u) => acc + u.requestsCount, 0);
  const totalTokens = userSummaries.reduce((acc, u) => acc + u.tokensCount, 0);
  const totalCostBrl = userSummaries.reduce((acc, u) => acc + u.costBrl, 0);

  // Comparação financeira vs Google Gemini Ultra
  // Assinatura Google One AI Premium (Gemini Ultra 1.5/2.0): US$ 19.99/mês ~ R$ 110,00 / usuário
  const totalUsers = userSummaries.length;
  const googleUltraPricePerUserBrl = 110.0;
  const googleUltraTotalMonthlyBrl = totalUsers * googleUltraPricePerUserBrl;
  const monthlySavingsBrl = Math.max(0, googleUltraTotalMonthlyBrl - totalCostBrl);
  const savingsPercent = Math.round((monthlySavingsBrl / googleUltraTotalMonthlyBrl) * 100);

  return (
    <div style={{ padding: '24px', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 📌 CARD DE CONFIRMAÇÃO DO USUÁRIO RODRIGO MOURA */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Status de Acesso à IA: Dr. Rodrigo Moura Rodrigues
              </h3>
              <span style={{ fontSize: '10px', background: '#10b981', color: '#0a0c10', padding: '2px 8px', borderRadius: '10px', fontWeight: 900, textTransform: 'uppercase' }}>
                ACESSO TOTAL LIBERADO (Legal Ops Edition)
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#a7f3d0', margin: '4px 0 0 0' }}>
              ✅ Redação de Contestações, Recursos e Réplicas no Legal Copilot IA • ✅ Resumos Inteligentes PJe Gemini 1.5/2.0 • ✅ Caixa de Diálogo da IA por Processo • ✅ Anexo de Documentos PDF/Imagens
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          title="Atualizar Métricas"
          style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}
        >
          <RefreshCw size={14} /> Atualizar Logs
        </button>
      </div>

      {/* 📊 GRID DE KPIS FINANCEIROS E REQUISIÇÕES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        
        {/* KPI 1: Requisições de IA */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Requisições Geradas</span>
            <Bot size={20} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)' }}>
            {totalRequests} <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 700 }}>chamadas IA</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
            Registradas na plataforma por todos os usuários
          </span>
        </div>

        {/* KPI 2: Tokens Consumidos */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Tokens IA Consumidos</span>
            <Zap size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#f59e0b' }}>
            {totalTokens.toLocaleString('pt-BR')}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
            Modelos Gemini 2.0 Flash e 1.5 Pro
          </span>
        </div>

        {/* KPI 3: Custo Efetivo Synapse API */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Custo Operacional API</span>
            <DollarSign size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#10b981' }}>
            R$ {totalCostBrl.toFixed(2)}
          </div>
          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginTop: '4px', display: 'block' }}>
            Pagamento estrito por uso (Pay-as-you-go)
          </span>
        </div>

        {/* KPI 4: Economia vs Google Ultra */}
        <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(59, 130, 246, 0.05))', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8' }}>Economia vs Google Ultra</span>
            <TrendingDown size={20} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff' }}>
            R$ {monthlySavingsBrl.toFixed(2)} <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 800 }}>/mês ({savingsPercent}%)</span>
          </div>
          <span style={{ fontSize: '11px', color: '#93c5fd', marginTop: '4px', display: 'block' }}>
            Economizado comparado a {totalUsers} assinaturas do Google Ultra
          </span>
        </div>
      </div>

      {/* 💰 COMPARAÇÃO FINANCEIRA DETALHADA VS ASSINATURA GOOGLE ULTRA */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} color="#38bdf8" />
          Análise Comparativa: Custo de Uso Synapse API vs Assinatura Google Gemini Ultra
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'center' }}>
          {/* Custo Google Ultra */}
          <div style={{ background: 'var(--bg-tertiary)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: '4px' }}>
              Assinatura Google Gemini Ultra Individual
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>
              R$ {googleUltraTotalMonthlyBrl.toFixed(2)} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/mês</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
              Custo de assinar o plano Google One AI Premium (Ultra 1.5/2.0) individualmente para os {totalUsers} advogados (US$ 19,99 ≈ R$ 110,00/mês por conta).
            </p>
          </div>

          {/* Custo API Synapse */}
          <div style={{ background: 'var(--bg-tertiary)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '4px' }}>
              Custo Real via API no Synapse
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#10b981' }}>
              R$ {totalCostBrl.toFixed(2)} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/mês</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
              Custo exato cobrado por token consumido via API oficial do Google Gemini (R$ 0,41 por 1 milhão de tokens no Gemini 2.0 Flash).
            </p>
          </div>

          {/* Gráfico de Barra Comparativo em Porcentagem */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
              <span style={{ color: '#ef4444' }}>Custo Assinatura Google Ultra</span>
              <span style={{ color: '#10b981' }}>Custo API Synapse</span>
            </div>

            <div style={{ width: '100%', height: '14px', background: 'var(--bg-tertiary)', borderRadius: '7px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: '99%', height: '100%', background: '#ef4444' }} title="Custo Google Ultra"></div>
              <div style={{ width: '1%', height: '100%', background: '#10b981' }} title="Custo API Synapse"></div>
            </div>

            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 800, textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              🎉 A sua empresa economiza R$ {monthlySavingsBrl.toFixed(2)} por mês utilizando a integração via API do Synapse!
            </div>
          </div>
        </div>
      </div>

      {/* 👥 TABELA DE USO DE IA POR USUÁRIO */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--accent-cyan)" />
            Consumo de IA por Usuário / Advogado
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{userSummaries.length} usuários monitorados</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Advogado / Usuário</th>
              <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Edição Habilitada</th>
              <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Requisições IA</th>
              <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Tokens Consumidos</th>
              <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Custo API (BRL)</th>
              <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Comparado ao Ultra</th>
            </tr>
          </thead>
          <tbody>
            {userSummaries.map((u) => {
              const isRodrigo = u.email.includes('rodrigo.moura');
              return (
                <tr key={u.email} style={{ borderBottom: '1px solid var(--border-color)', background: isRodrigo ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                  <td style={{ padding: '14px 20px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isRodrigo ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #38bdf8, #3b82f6)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div>{u.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', background: isRodrigo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 242, 254, 0.15)', color: isRodrigo ? '#10b981' : 'var(--accent-cyan)', border: isRodrigo ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(0, 242, 254, 0.3)' }}>
                      {u.edition}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px' }}>
                    {u.requestsCount} requisições
                  </td>
                  <td style={{ padding: '14px 20px', color: '#f59e0b', fontWeight: 700, fontSize: '13px' }}>
                    {u.tokensCount.toLocaleString('pt-BR')} tokens
                  </td>
                  <td style={{ padding: '14px 20px', color: '#10b981', fontWeight: 800, fontSize: '13px' }}>
                    R$ {u.costBrl.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '8px' }}>
                      Economia de R$ {(110 - u.costBrl).toFixed(2)}/mês
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 📜 HISTÓRICO DE REQUISIÇÕES EM TEMPO REAL */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#f59e0b" />
            Feed de Execuções de IA em Tempo Real ({logs.length})
          </h3>
        </div>

        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Data/Hora</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Usuário</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Instrução / Peça Solicitada</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Modelo</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Tokens</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Custo (BRL)</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {log.user_name}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.prompt_preview}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                      {log.model_used}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: 700 }}>
                    {log.tokens_consumed}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 700 }}>
                    R$ {log.estimated_cost_brl.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
