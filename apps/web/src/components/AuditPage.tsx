import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, Clock, RefreshCw, ChevronRight, Bug, Eye, Sparkles } from 'lucide-react';
import { Profile } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';

export interface AuditLogItem {
  id: string;
  flowchart_id: string;
  flowchart_name: string;
  status: 'COMPLETED' | 'FAILED' | 'WAITING' | 'HEALED_BY_AI';
  failed_node_id?: string;
  error_message?: string;
  execution_trace: Array<{
    timestamp: string;
    nodeId: string;
    nodeLabel: string;
    type: string;
    status: string;
    output?: any;
  }>;
  created_at: string;
}

interface AuditPageProps {
  currentProfile: Profile | null;
  onInspectDebugLog: (log: AuditLogItem) => void;
}

const sampleAuditLogs: AuditLogItem[] = [
  {
    id: 'log-101',
    flowchart_id: 'flow-sample-1',
    flowchart_name: 'Integração Webhook & CRM B2B',
    status: 'HEALED_BY_AI',
    execution_trace: [
      { timestamp: '2026-08-05T14:20:00Z', nodeId: 'node-trigger-1', nodeLabel: 'Gatilho Webhook B2B', type: 'trigger', status: 'SUCCESS' },
      { timestamp: '2026-08-05T14:20:01Z', nodeId: 'node-action-1', nodeLabel: 'Sincronizar CRM External API', type: 'action', status: 'HEALED_BY_AI', output: { healed: true, auto_fixed_payload: { email: 'customer@nexusflow.com' } } },
      { timestamp: '2026-08-05T14:20:02Z', nodeId: 'node-output-1', nodeLabel: 'Resposta Final JSON', type: 'output', status: 'SUCCESS' },
    ],
    created_at: new Date('2026-08-05T14:20:00Z').toISOString(),
  },
  {
    id: 'log-102',
    flowchart_id: 'flow-sample-1',
    flowchart_name: 'Integração Webhook & CRM B2B',
    status: 'FAILED',
    failed_node_id: 'node-action-1',
    error_message: 'HTTP 500 API Gateway Timeout (10000ms Excedido na requisição https://httpbin.org/status/500)',
    execution_trace: [
      { timestamp: '2026-08-05T14:00:00Z', nodeId: 'node-trigger-1', nodeLabel: 'Gatilho Webhook B2B', type: 'trigger', status: 'SUCCESS' },
      { timestamp: '2026-08-05T14:00:01Z', nodeId: 'node-action-1', nodeLabel: 'Sincronizar CRM External API', type: 'action', status: 'FAILED' },
    ],
    created_at: new Date('2026-08-05T14:00:00Z').toISOString(),
  },
  {
    id: 'log-103',
    flowchart_id: 'flow-sample-1',
    flowchart_name: 'Integração Webhook & CRM B2B',
    status: 'COMPLETED',
    execution_trace: [
      { timestamp: '2026-08-05T12:00:00Z', nodeId: 'node-trigger-1', nodeLabel: 'Gatilho Webhook B2B', type: 'trigger', status: 'SUCCESS' },
      { timestamp: '2026-08-05T12:00:02Z', nodeId: 'node-output-1', nodeLabel: 'Resposta Final JSON', type: 'output', status: 'SUCCESS' },
    ],
    created_at: new Date('2026-08-05T12:00:00Z').toISOString(),
  },
];

import { getApiUrl } from '../lib/api';

export const AuditPage: React.FC<AuditPageProps> = ({ currentProfile, onInspectDebugLog }) => {
  const { t } = useLanguage();

  const [logs, setLogs] = useState<AuditLogItem[]>(sampleAuditLogs);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetch(getApiUrl('/api/v1/audit/logs'))
      .then((res) => res.json())
      .then((data) => {
        if (data.logs && data.logs.length > 0) setLogs(data.logs);
      })
      .catch(() => {});
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterStatus === 'ALL') return true;
    return log.status === filterStatus;
  });

  return (
    <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      {/* Header da Página */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={24} color="var(--accent-cyan)" />
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              {t.auditPage.title}
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t.auditPage.subtitle}
          </p>
        </div>

        {/* Filtros de Status */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'COMPLETED', 'HEALED_BY_AI', 'FAILED', 'WAITING'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: filterStatus === status ? 'var(--accent-blue)' : 'var(--bg-glass)',
                color: filterStatus === status ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {status === 'ALL'
                ? 'Todos'
                : status === 'HEALED_BY_AI'
                ? '🩹 Curado por IA'
                : status}
            </button>
          ))}
        </div>
      </div>

      {/* Grid com Tabela e Painel de Rastro de Nós */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedLog ? '1fr 420px' : '1fr', gap: '24px' }}>
        {/* Tabela Principal de Logs */}
        <div
          style={{
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
          }}
        >
          <div className="w-full overflow-x-auto" style={{ width: '100%', overflowX: 'auto', boxSizing: 'border-box' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '550px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>{t.auditPage.flowchart}</th>
                <th style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>{t.auditPage.timestamp}</th>
                <th style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                const isFailed = log.status === 'FAILED';
                const isHealed = log.status === 'HEALED_BY_AI';

                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      {isHealed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#06b6d4', fontSize: '12px', fontWeight: 700 }}>
                          <Sparkles size={16} color="#06b6d4" />
                          <span>Curado por IA</span>
                        </div>
                      ) : isFailed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>
                          <AlertTriangle size={16} color="#ef4444" />
                          <span>Falha</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '12px', fontWeight: 700 }}>
                          <CheckCircle size={16} color="#10b981" />
                          <span>Concluído</span>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>
                        {log.flowchart_name}
                      </strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        ID: {log.id}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {isFailed ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectDebugLog(log);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid #ef4444',
                            color: '#ef4444',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <Bug size={14} />
                          {t.auditPage.debugBtn}
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedLog(log)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={14} />
                          Ver Rastro
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>

        {/* Painel Lateral com Rastro de Execução (Execution Trace Timeline) */}
        {selectedLog && (
          <div
            style={{
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Rastro da Execução</h3>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {selectedLog.status === 'HEALED_BY_AI' && (
              <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid #06b6d4', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#06b6d4' }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} /> Fluxo Curado Autonomamente por IA
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  O motor detectou uma falha de schema na API externa, acionou o Gemini LLM para ajustar o JSON e executou a substituição no Supabase.
                </p>
              </div>
            )}

            {selectedLog.error_message && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#f87171' }}>
                <strong>{t.auditPage.errorMessage}:</strong>
                <p style={{ margin: '4px 0 0 0', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{selectedLog.error_message}</p>
              </div>
            )}

            {/* Linha do Tempo dos Nós */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              {selectedLog.execution_trace.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: step.status === 'FAILED' ? '#ef4444' : step.status === 'HEALED_BY_AI' ? '#06b6d4' : '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{step.nodeLabel}</strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(step.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--accent-blue)', textTransform: 'uppercase', fontWeight: 700 }}>
                      {step.type}
                    </span>
                    {step.output && (
                      <pre style={{ margin: '6px 0 0 0', fontSize: '10px', background: 'var(--bg-primary)', padding: '6px', borderRadius: '6px', overflowX: 'auto' }}>
                        {JSON.stringify(step.output, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
