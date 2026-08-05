import React, { useState, useEffect } from 'react';
import { X, History, RotateCcw, Calendar, User, Layers, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export interface FlowchartVersionItem {
  id: string;
  flowchart_id: string;
  version_number: number;
  created_by_email?: string;
  nodes: any[];
  edges: any[];
  created_at: string;
}

interface VersionHistoryModalProps {
  flowchartId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestoreVersion: (nodes: any[], edges: any[]) => Promise<void>;
  canEdit: boolean;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  flowchartId,
  isOpen,
  onClose,
  onRestoreVersion,
  canEdit,
}) => {
  const { t } = useLanguage();

  const [versions, setVersions] = useState<FlowchartVersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && flowchartId) {
      setIsLoading(true);
      fetch(`/api/flowcharts/${flowchartId}/versions`)
        .then((res) => res.json())
        .then((data) => {
          if (data.versions) {
            setVersions(data.versions);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, flowchartId]);

  if (!isOpen) return null;

  const handleRollback = async (ver: FlowchartVersionItem) => {
    if (!canEdit) {
      alert(t.messages.accessDenied);
      return;
    }

    setRestoringId(ver.id);
    try {
      await fetch(`/api/flowcharts/${flowchartId}/versions/${ver.id}/rollback`, {
        method: 'POST',
      });
      await onRestoreVersion(ver.nodes, ver.edges);
      alert(t.messages.versionRestored);
      onClose();
    } catch (err: any) {
      alert(`Erro ao restaurar versão: ${err.message}`);
    } finally {
      setRestoringId(null);
    }
  };

  return (
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
      zIndex: 100,
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '560px',
        maxHeight: '80vh',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
            }}>
              <History size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {t.versionModal.title}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {t.versionModal.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Versions List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : versions.length > 0 ? (
            versions.map((ver, idx) => {
              const isRestoring = restoringId === ver.id;
              const nodeCount = ver.nodes?.length || 0;

              return (
                <div
                  key={ver.id}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: idx === 0 ? 'rgba(0, 242, 254, 0.15)' : 'var(--bg-tertiary)',
                        color: idx === 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        border: `1px solid ${idx === 0 ? 'rgba(0, 242, 254, 0.3)' : 'var(--border-color)'}`,
                      }}>
                        v{ver.version_number} {idx === 0 ? '(Atual)' : ''}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <Layers size={13} />
                        <span>{nodeCount} {t.versionModal.nodesCount}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={13} />
                        <span>{ver.created_by_email || 'alan.pereira@alp-nexus.com'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} />
                        <span>{new Date(ver.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {canEdit && (
                    <button
                      onClick={() => handleRollback(ver)}
                      disabled={isRestoring || idx === 0}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: idx === 0 ? 'var(--bg-tertiary)' : 'rgba(59, 130, 246, 0.15)',
                        border: `1px solid ${idx === 0 ? 'var(--border-color)' : 'rgba(59, 130, 246, 0.3)'}`,
                        color: idx === 0 ? 'var(--text-muted)' : 'var(--accent-blue)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: idx === 0 || isRestoring ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isRestoring ? (
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      {isRestoring ? t.versionModal.restoring : t.versionModal.restoreBtn}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Nenhuma versão anterior gravada. Salve alterações no editor para gerar a primeira versão.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {t.versionModal.close}
          </button>
        </div>
      </div>
    </div>
  );
};
