import React, { useState, useEffect } from 'react';
import { PlayCircle, RefreshCw, Search, Clock, CheckCircle2, AlertCircle, Hourglass, Eye, Code, FileText, ChevronRight, X, Layers } from 'lucide-react';
import { Profile } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/api';

interface FlowExecution {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: 'running' | 'waiting_approval' | 'completed' | 'failed';
  current_node_id?: string;
  context_data: Record<string, any>;
  started_at: string;
  completed_at?: string;
}

interface ExecutionLog {
  id: string;
  execution_id: string;
  node_id?: string;
  status: 'info' | 'success' | 'warning' | 'error';
  log_message: string;
  created_at: string;
}

interface ExecutionsPageProps {
  currentProfile: Profile;
}

const fallbackExecutions: FlowExecution[] = [
  {
    id: 'exec-demo-101',
    workflow_id: 'flow-sample-1',
    workflow_name: 'Integração Webhook & CRM B2B',
    status: 'completed',
    current_node_id: 'node-output-1',
    context_data: { trigger: 'POST /api/v1/webhook', payload: { company_name: 'Acme Logistics Inc', status: 'QUALIFIED' }, status_code: 200 },
    started_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
  },
  {
    id: 'exec-demo-102',
    workflow_id: 'flow-sample-1',
    workflow_name: 'Integração Webhook & CRM B2B',
    status: 'waiting_approval',
    current_node_id: 'node-approval-1',
    context_data: { approval: { token: 'token-approval-9988', assignee: 'alan.pereira@alp-nexus.com', requested_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() } },
    started_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'exec-demo-103',
    workflow_id: 'flow-sample-2',
    workflow_name: 'Fluxo de Boas-Vindas & Onboarding',
    status: 'failed',
    current_node_id: 'node-whatsapp-1',
    context_data: { error: 'API do WhatsApp retornou HTTP 503 Service Unavailable' },
    started_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

const fallbackLogs: Record<string, ExecutionLog[]> = {
  'exec-demo-101': [
    { id: 'log-1', execution_id: 'exec-demo-101', node_id: 'node-trigger-1', status: 'info', log_message: 'Recebido payload HTTP POST /api/v1/webhook', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    { id: 'log-2', execution_id: 'exec-demo-101', node_id: 'node-code-1', status: 'info', log_message: 'Código JS executado com sucesso no Sandbox Node.js', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    { id: 'log-3', execution_id: 'exec-demo-101', node_id: 'node-output-1', status: 'success', log_message: 'Fluxo finalizado com resposta 200 OK', created_at: new Date(Date.now() - 1000 * 60 * 44).toISOString() },
  ],
  'exec-demo-102': [
    { id: 'log-4', execution_id: 'exec-demo-102', node_id: 'node-trigger-1', status: 'info', log_message: 'Evento de gatilho recebido', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: 'log-5', execution_id: 'exec-demo-102', node_id: 'node-approval-1', status: 'warning', log_message: 'Aguardando aprovação de alan.pereira@alp-nexus.com', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  ],
  'exec-demo-103': [
    { id: 'log-6', execution_id: 'exec-demo-103', node_id: 'node-trigger-3', status: 'info', log_message: 'Webhook disparado', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: 'log-7', execution_id: 'exec-demo-103', node_id: 'node-whatsapp-1', status: 'error', log_message: 'Erro ao conectar à API do WhatsApp Cloud', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  ],
};

const statusBadges: Record<FlowExecution['status'], { label: string; bg: string; color: string; border: string; icon: React.ElementType }> = {
  running: {
    label: 'Em Execução',
    bg: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    border: 'rgba(59, 130, 246, 0.4)',
    icon: RefreshCw,
  },
  waiting_approval: {
    label: 'Aguardando Aprovação',
    bg: 'rgba(249, 115, 22, 0.15)',
    color: '#fb923c',
    border: 'rgba(249, 115, 22, 0.4)',
    icon: Hourglass,
  },
  completed: {
    label: 'Concluído',
    bg: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    border: 'rgba(16, 185, 129, 0.4)',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Falhou',
    bg: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: 'rgba(239, 68, 68, 0.4)',
    icon: AlertCircle,
  },
};

export const ExecutionsPage: React.FC<ExecutionsPageProps> = ({ currentProfile }) => {
  const { t } = useLanguage();
  const [executions, setExecutions] = useState<FlowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExecution, setSelectedExecution] = useState<FlowExecution | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchExecutions = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Busca direta na tabela 'flow_executions' sem sintaxe de FK inválida
      const { data: supaExecs, error: execErr } = await supabase
        .from('flow_executions')
        .select('*')
        .order('started_at', { ascending: false });

      if (!execErr && supaExecs !== null && supaExecs !== undefined) {
        // Correlacionar nomes de fluxos das tabelas 'flowcharts' e 'workflows'
        const [{ data: fcData }, { data: wfData }] = await Promise.all([
          supabase.from('flowcharts').select('id, name'),
          supabase.from('workflows').select('id, name'),
        ]);

        const nameMap = new Map<string, string>();
        (fcData || []).forEach((f: any) => nameMap.set(f.id, f.name));
        (wfData || []).forEach((w: any) => nameMap.set(w.id, w.name));

        const formatted = supaExecs.map((item: any) => ({
          ...item,
          workflow_name: nameMap.get(item.workflow_id) || item.context_data?.workflow_name || 'Fluxo Synapse',
        }));

        setExecutions(formatted);
        setIsLoading(false);
        return;
      }

      // 2. Tentar rota REST backend com URL configurada (getApiUrl)
      const apiUrl = getApiUrl('/api/v1/executions');
      const res = await fetch(apiUrl).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.executions)) {
          setExecutions(data.executions);
          setIsLoading(false);
          return;
        }
      }

      // 3. Tratamento em caso de erro de conexão ou indisponibilidade de serviço
      if (execErr) {
        console.warn('⚠️ [EXECUTIONS SUPABASE WARN]:', execErr.message);
        setErrorMessage('Não foi possível carregar o histórico de execuções. Verifique sua conexão.');
        setExecutions([]);
      } else {
        setExecutions(fallbackExecutions);
      }
    } catch (err: any) {
      console.warn('⚠️ [EXECUTIONS FATAL WARN]:', err);
      setErrorMessage('Não foi possível carregar o histórico de execuções. Verifique sua conexão.');
      setExecutions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();

    // Inscrição em tempo real na tabela 'flow_executions'
    const channelExecutions = supabase
      .channel('realtime:flow_executions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flow_executions' },
        () => {
          fetchExecutions();
        }
      )
      .subscribe();

    // Inscrição em tempo real na tabela 'execution_logs'
    const channelLogs = supabase
      .channel('realtime:execution_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'execution_logs' },
        (payload) => {
          const newLog = payload.new as ExecutionLog;
          if (newLog) {
            setExecutionLogs((prev) => {
              if (selectedExecution && newLog.execution_id === selectedExecution.id) {
                if (prev.some((l) => l.id === newLog.id)) return prev;
                return [...prev, newLog];
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelExecutions);
      supabase.removeChannel(channelLogs);
    };
  }, [selectedExecution]);

  const handleOpenLogs = async (execution: FlowExecution) => {
    setSelectedExecution(execution);
    setIsLoadingLogs(true);
    try {
      // 1. Tentar Supabase
      const { data: logData, error: logErr } = await supabase
        .from('execution_logs')
        .select('*')
        .eq('execution_id', execution.id)
        .order('created_at', { ascending: true });

      if (!logErr && logData && logData.length > 0) {
        setExecutionLogs(logData);
        setIsLoadingLogs(false);
        return;
      }

      // 2. Fallback API REST com getApiUrl
      const apiUrl = getApiUrl(`/api/v1/executions/${execution.id}/logs`);
      const res = await fetch(apiUrl).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        setExecutionLogs(data.logs || fallbackLogs[execution.id] || []);
      } else {
        setExecutionLogs(fallbackLogs[execution.id] || []);
      }
    } catch (err) {
      setExecutionLogs(fallbackLogs[execution.id] || []);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const filtered = executions.filter((item) => {
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesSearch =
      (item.workflow_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.current_node_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ flex: 1, padding: '32px', overflowY: 'auto', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'rgba(0, 242, 254, 0.12)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              color: 'var(--accent-cyan)',
              display: 'flex',
            }}>
              <PlayCircle size={22} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>
              Histórico de Execuções (Runner Logs)
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Acompanhe o estado de execução em tempo real, nós ativos e variáveis de contexto de todos os fluxos.
          </p>
        </div>

        <button
          onClick={fetchExecutions}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: '8px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Banner de Erro */}
      {errorMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'running', label: 'Em Execução' },
            { id: 'waiting_approval', label: 'Aguardando Aprovação' },
            { id: 'completed', label: 'Concluídas' },
            { id: 'failed', label: 'Falhas' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterStatus(pill.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: filterStatus === pill.id ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                color: filterStatus === pill.id ? '#0a0c10' : 'var(--text-secondary)',
                border: filterStatus === pill.id ? 'none' : '1px solid var(--border-color)',
                transition: 'all 0.15s ease',
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            placeholder="Buscar por fluxo ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Tabela de Execuções */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '14px 18px' }}>Status</th>
              <th style={{ padding: '14px 18px' }}>Nome do Fluxo</th>
              <th style={{ padding: '14px 18px' }}>Nó Atual</th>
              <th style={{ padding: '14px 18px' }}>Data de Início</th>
              <th style={{ padding: '14px 18px' }}>Término / Duração</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Carregando histórico de execuções...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Nenhuma execução encontrada para os filtros selecionados.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const badge = statusBadges[item.status] || statusBadges.completed;
                const StatusIcon = badge.icon;
                const startDate = new Date(item.started_at).toLocaleString();
                const endDate = item.completed_at ? new Date(item.completed_at).toLocaleTimeString() : 'Em andamento';

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Status Badge */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        color: badge.color,
                        fontSize: '11px',
                        fontWeight: 800,
                      }}>
                        <StatusIcon size={12} className={item.status === 'running' ? 'spin' : ''} />
                        <span>{badge.label}</span>
                      </div>
                    </td>

                    {/* Fluxo */}
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{item.workflow_name || 'Fluxo IPaaS'}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          ID: {item.workflow_id}
                        </span>
                      </div>
                    </td>

                    {/* Nó Atual */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: 'var(--accent-cyan)',
                      }}>
                        {item.current_node_id || 'node-start'}
                      </span>
                    </td>

                    {/* Data de Início */}
                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="var(--text-muted)" />
                        <span>{startDate}</span>
                      </div>
                    </td>

                    {/* Término */}
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>
                      {endDate}
                    </td>

                    {/* Ações */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenLogs(item)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'rgba(0, 242, 254, 0.1)',
                          border: '1px solid rgba(0, 242, 254, 0.3)',
                          color: 'var(--accent-cyan)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={14} />
                        Detalhes & Logs
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalhes da Execução & Logs */}
      {selectedExecution && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-tertiary)',
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  Logs de Execução: {selectedExecution.workflow_name}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Execution ID: {selectedExecution.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedExecution(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo Modal */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Variáveis de Contexto JSON */}
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Code size={14} color="var(--accent-cyan)" />
                  Payload & Variáveis de Contexto (context_data)
                </h4>
                <pre style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '11px',
                  color: '#00f2fe',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '150px',
                  margin: 0,
                }}>
                  {JSON.stringify(selectedExecution.context_data, null, 2)}
                </pre>
              </div>

              {/* Timeline de Logs da Tabela execution_logs */}
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="var(--accent-cyan)" />
                  Linha do Tempo de Rastreamento Passo a Passo (execution_logs)
                </h4>

                {isLoadingLogs ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Buscando logs da execução...</p>
                ) : executionLogs.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum evento registrado nesta execução.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {executionLogs.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: log.status === 'error' ? 'rgba(239, 68, 68, 0.2)' : log.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: log.status === 'error' ? '#f87171' : log.status === 'success' ? '#34d399' : '#60a5fa',
                          }}>
                            {log.status}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            [{log.node_id || 'Runner'}] {log.log_message}
                          </span>
                        </div>

                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
