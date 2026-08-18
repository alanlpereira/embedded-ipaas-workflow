import React, { useState, useEffect } from 'react';
import { Calendar, Mail, MessageSquare, FileText, Zap, HelpCircle, Activity, Loader2, RefreshCw, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserTelemetrySectionProps {
  userId: string;
  userEmail?: string;
}

export interface TelemetryMetrics {
  user_id: string;
  start_date: string;
  end_date: string;
  email_sent_count: number;
  whatsapp_summary_count: number;
  document_generated_count: number;
  ai_command_count: number;
  help_interaction_count: number;
  total_tokens_used: number;
}

export const UserTelemetrySection: React.FC<UserTelemetrySectionProps> = ({ userId, userEmail }) => {
  const getDefaultStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);

  const loadTelemetry = async () => {
    if (!userId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString();
      const endIso = new Date(`${endDate}T23:59:59.999Z`).toISOString();

      const { data, error } = await supabase.rpc('get_user_telemetry', {
        p_user_id: userId,
        p_start_date: startIso,
        p_end_date: endIso
      });

      if (error) {
        throw error;
      }

      setMetrics(data as TelemetryMetrics);
    } catch (err: any) {
      console.error('❌ Erro ao buscar telemetria do usuário:', err);
      setErrorMsg(err.message || 'Falha ao carregar dados de telemetria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, [userId, startDate, endDate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 📅 DateRangePicker Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '12px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
          <Calendar size={16} color="#38bdf8" />
          <span>Período da Telemetria:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>De:</span>
            <input
              id="telemetry-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                background: '#080c14',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '5px 10px',
                color: '#ffffff',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Até:</span>
            <input
              id="telemetry-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                background: '#080c14',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '5px 10px',
                color: '#ffffff',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="button"
            onClick={loadTelemetry}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '12px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* 📊 Grid de Cards Visuais Elegantes de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        
        {/* 1. E-mails Enviados */}
        <div id="card-telemetry-email" style={cardStyle('#3b82f6')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
            <span style={iconWrapperStyle('#3b82f6')}>
              <Mail size={16} />
            </span>
            <span style={badgeStyle('#3b82f6')}>email_sent</span>
          </div>
          <div style={metricValueStyle}>
            {loading ? '...' : (metrics?.email_sent_count || 0)}
          </div>
          <div style={metricTitleStyle}>E-mails Enviados</div>
        </div>

        {/* 2. Resumos (WhatsApp) */}
        <div id="card-telemetry-whatsapp" style={cardStyle('#10b981')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
            <span style={iconWrapperStyle('#10b981')}>
              <MessageSquare size={16} />
            </span>
            <span style={badgeStyle('#10b981')}>whatsapp_summary</span>
          </div>
          <div style={metricValueStyle}>
            {loading ? '...' : (metrics?.whatsapp_summary_count || 0)}
          </div>
          <div style={metricTitleStyle}>Resumos (WhatsApp)</div>
        </div>

        {/* 3. Peças Geradas */}
        <div id="card-telemetry-doc" style={cardStyle('#8b5cf6')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
            <span style={iconWrapperStyle('#8b5cf6')}>
              <FileText size={16} />
            </span>
            <span style={badgeStyle('#8b5cf6')}>document_generated</span>
          </div>
          <div style={metricValueStyle}>
            {loading ? '...' : (metrics?.document_generated_count || 0)}
          </div>
          <div style={metricTitleStyle}>Peças Geradas</div>
        </div>

        {/* 4. Comandos IA */}
        <div id="card-telemetry-ai" style={cardStyle('#38bdf8')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
            <span style={iconWrapperStyle('#38bdf8')}>
              <BarChart2 size={16} />
            </span>
            <span style={badgeStyle('#38bdf8')}>ai_command</span>
          </div>
          <div style={metricValueStyle}>
            {loading ? '...' : (metrics?.ai_command_count || 0)}
          </div>
          <div style={metricTitleStyle}>Comandos IA</div>
        </div>

        {/* 5. Interações Help Desk */}
        <div id="card-telemetry-help" style={cardStyle('#f59e0b')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
            <span style={iconWrapperStyle('#f59e0b')}>
              <HelpCircle size={16} />
            </span>
            <span style={badgeStyle('#f59e0b')}>help_interaction</span>
          </div>
          <div style={metricValueStyle}>
            {loading ? '...' : (metrics?.help_interaction_count || 0)}
          </div>
          <div style={metricTitleStyle}>Interações Help Desk</div>
        </div>

        {/* 6. Tokens IA Consumidos */}
        <div id="card-telemetry-tokens" style={cardStyle('#ec4899')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
            <span style={iconWrapperStyle('#ec4899')}>
              <Zap size={16} />
            </span>
            <span style={badgeStyle('#ec4899')}>tokens_used</span>
          </div>
          <div style={{ ...metricValueStyle, color: '#ec4899' }}>
            {loading ? '...' : (metrics?.total_tokens_used || 0).toLocaleString('pt-BR')}
          </div>
          <div style={metricTitleStyle}>Tokens IA Consumidos</div>
        </div>

      </div>

    </div>
  );
};

const cardStyle = (color: string): React.CSSProperties => ({
  background: '#080c14',
  border: `1px solid ${color}33`,
  borderRadius: '14px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxShadow: `0 4px 20px ${color}10`,
  transition: 'transform 0.2s ease',
});

const iconWrapperStyle = (color: string): React.CSSProperties => ({
  padding: '6px',
  borderRadius: '8px',
  background: `${color}20`,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
});

const badgeStyle = (color: string): React.CSSProperties => ({
  fontSize: '9px',
  fontFamily: 'monospace',
  color: color,
  background: `${color}15`,
  border: `1px solid ${color}30`,
  padding: '2px 6px',
  borderRadius: '4px',
  fontWeight: 700
});

const metricValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 900,
  color: '#ffffff',
  margin: '8px 0 4px 0',
  letterSpacing: '-0.5px'
};

const metricTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
  fontWeight: 600
};
