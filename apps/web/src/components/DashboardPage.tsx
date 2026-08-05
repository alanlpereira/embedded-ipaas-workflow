import React, { useState } from 'react';
import { Plus, Search, GitBranch, Edit3, Trash2, Eye, Calendar, Layers, ShieldAlert } from 'lucide-react';
import { Flowchart, Profile } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';

interface DashboardPageProps {
  currentProfile: Profile;
  flowcharts: Flowchart[];
  onOpenFlowchart: (flowchart: Flowchart) => void;
  onCreateFlowchart: () => void;
  onDeleteFlowchart: (id: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentProfile,
  flowcharts,
  onOpenFlowchart,
  onCreateFlowchart,
  onDeleteFlowchart,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const canEdit = currentProfile.role === 'Master' || currentProfile.role === 'Admin';

  const filteredFlowcharts = flowcharts.filter(
    (flow) =>
      flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flow.description && flow.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {t.dashboard.title}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {t.dashboard.subtitle}
          </p>
        </div>

        {/* Botão Novo Fluxograma (Apenas Master e Admin) */}
        {canEdit ? (
          <button
            onClick={onCreateFlowchart}
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
            <Plus size={18} />
            {t.dashboard.createFlow}
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
            Perfil Viewer (Modo Leitura)
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '24px', position: 'relative', maxWidth: '400px' }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
        <input
          type="text"
          placeholder={t.dashboard.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 38px',
            borderRadius: '8px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
          }}
        />
      </div>

      {/* Grid de Fluxogramas */}
      {filteredFlowcharts.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {filteredFlowcharts.map((flow) => {
            const nodeCount = flow.nodes?.length || 0;

            return (
              <div
                key={flow.id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-blue)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: 'var(--accent-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <GitBranch size={20} />
                    </div>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: flow.is_published ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                      color: flow.is_published ? '#10b981' : '#94a3b8',
                      border: `1px solid ${flow.is_published ? '#10b98140' : '#94a3b840'}`,
                    }}>
                      {flow.is_published ? t.dashboard.published : t.dashboard.draft}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {flow.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '16px', minHeight: '34px' }}>
                    {flow.description || 'Sem descrição cadastrada.'}
                  </p>
                </div>

                <div>
                  {/* Meta Details */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginBottom: '16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={14} />
                      <span>{nodeCount} {t.dashboard.nodeCount}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} />
                      <span>{new Date(flow.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => onOpenFlowchart(flow)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: canEdit ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {canEdit ? <Edit3 size={14} /> : <Eye size={14} />}
                      {canEdit ? t.dashboard.edit : t.dashboard.viewOnly}
                    </button>

                    {canEdit && (
                      <button
                        onClick={() => {
                          if (confirm(`${t.dashboard.confirmDelete} "${flow.name}"?`)) {
                            onDeleteFlowchart(flow.id);
                          }
                        }}
                        style={{
                          padding: '8px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px dashed var(--border-color)',
          color: 'var(--text-muted)',
        }}>
          <GitBranch size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ fontSize: '14px', fontWeight: 600 }}>{t.dashboard.noFlows}</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>{t.dashboard.createFirst}</p>
        </div>
      )}
    </div>
  );
};
