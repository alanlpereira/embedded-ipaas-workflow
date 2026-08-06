import React, { useState, useEffect } from 'react';
import { Plus, Search, GitBranch, Edit3, Trash2, Eye, Calendar, Layers, ShieldAlert, Folder as FolderIcon, FolderPlus, MoreVertical, MoveRight, FileText, DollarSign, Key, ShoppingCart, UserPlus, X } from 'lucide-react';
import { Flowchart, Profile, Folder } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';

interface DashboardPageProps {
  currentProfile: Profile;
  flowcharts: Flowchart[];
  onOpenFlowchart: (flowchart: Flowchart) => void;
  onCreateFlowchart: (folderId?: string) => void;
  onDeleteFlowchart: (id: string) => void;
  onMoveFlowchart?: (flowchartId: string, targetFolderId: string) => void;
}

const DEFAULT_FOLDERS: Folder[] = [
  { id: 'folder-jur', name: 'Jurídico', icon: 'FileText' },
  { id: 'folder-fin', name: 'Financeiro', icon: 'DollarSign' },
  { id: 'folder-ti', name: 'TI & Infraestrutura', icon: 'Key' },
  { id: 'folder-sup', name: 'Suprimentos & Logística', icon: 'ShoppingCart' },
  { id: 'folder-rh', name: 'Recursos Humanos', icon: 'UserPlus' },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentProfile,
  flowcharts,
  onOpenFlowchart,
  onCreateFlowchart,
  onDeleteFlowchart,
  onMoveFlowchart,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [folders, setFolders] = useState<Folder[]>(DEFAULT_FOLDERS);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Estados de Modais
  const [isNewAreaModalOpen, setIsNewAreaModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [movingFlowchart, setMovingFlowchart] = useState<Flowchart | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const canEdit = currentProfile.role === 'Master' || currentProfile.role === 'Admin';

  // Carregar Pastas
  useEffect(() => {
    fetch('/api/v1/folders')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.folders) && data.folders.length > 0) {
          setFolders(data.folders);
        }
      })
      .catch(() => {});
  }, []);

  // Handler para criar nova área/pasta
  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: newAreaName.trim(),
      icon: 'Folder',
    };

    setFolders((prev) => [...prev, newFolder]);
    setNewAreaName('');
    setIsNewAreaModalOpen(false);

    try {
      await fetch('/api/v1/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolder.name, icon: newFolder.icon }),
      });
    } catch (err) {}
  };

  // Handler para mover fluxo para outra pasta
  const handleConfirmMove = async (targetFolderId: string) => {
    if (!movingFlowchart) return;

    if (onMoveFlowchart) {
      onMoveFlowchart(movingFlowchart.id, targetFolderId);
    }

    try {
      await fetch(`/api/v1/flowcharts/${movingFlowchart.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: targetFolderId }),
      });
    } catch (err) {}

    setMovingFlowchart(null);
    setActiveMenuId(null);
  };

  // Filtragem dos fluxos por busca e por pasta selecionada
  const filteredFlowcharts = flowcharts.filter((flow) => {
    const matchesSearch =
      flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flow.description && flow.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!selectedFolderId) return matchesSearch;

    // Se estiver em uma pasta específica (ex: Jurídico), filtra por folder_id ou por fallback de nome
    if (selectedFolderId === 'folder-jur') {
      return matchesSearch && (flow.folder_id === 'folder-jur' || flow.name.toLowerCase().includes('intimações') || flow.name.toLowerCase().includes('jurídico'));
    }

    return matchesSearch && flow.folder_id === selectedFolderId;
  });

  const getFolderIcon = (iconName?: string) => {
    switch (iconName) {
      case 'FileText': return <FileText size={16} />;
      case 'DollarSign': return <DollarSign size={16} />;
      case 'Key': return <Key size={16} />;
      case 'ShoppingCart': return <ShoppingCart size={16} />;
      case 'UserPlus': return <UserPlus size={16} />;
      default: return <FolderIcon size={16} />;
    }
  };

  const selectedFolderName = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)?.name || 'Área Selecionada'
    : 'Todas as Áreas';

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* 2. BARRA LATERAL ESQUERDA: LISTAGEM DE PASTAS / ÁREAS */}
      <aside style={{
        width: '260px',
        borderRight: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        gap: '20px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
            Áreas & Disciplinas
          </h2>
          {canEdit && (
            <button
              onClick={() => setIsNewAreaModalOpen(true)}
              title="Nova Área"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(0, 242, 254, 0.1)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                color: 'var(--accent-cyan)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <FolderPlus size={14} />
              Nova Área
            </button>
          )}
        </div>

        {/* Lista de Pastas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1 }}>
          <button
            onClick={() => setSelectedFolderId(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '8px',
              background: selectedFolderId === null ? 'var(--bg-tertiary)' : 'transparent',
              color: selectedFolderId === null ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: selectedFolderId === null ? '1px solid var(--border-color)' : '1px solid transparent',
              fontWeight: selectedFolderId === null ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={16} />
              <span>Todas as Áreas</span>
            </div>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>{flowcharts.length}</span>
          </button>

          {folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            const count = flowcharts.filter((f) =>
              folder.id === 'folder-jur'
                ? f.folder_id === 'folder-jur' || f.name.toLowerCase().includes('intimações') || f.name.toLowerCase().includes('jurídico')
                : f.folder_id === folder.id
            ).length;

            return (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                  color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid var(--border-color)' : '1px solid transparent',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {getFolderIcon(folder.icon)}
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                    {folder.name}
                  </span>
                </div>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>{count}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* 3. PAINEL CENTRAL DO DASHBOARD */}
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        {/* Header Central */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              <FolderIcon size={14} />
              <span>{selectedFolderName}</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              {t.dashboard.title}
            </h1>
          </div>

          {/* 4. BOTÃO NOVO FLUXO AUTO-ASSOCIADO À PASTA SELECIONADA */}
          {canEdit ? (
            <button
              onClick={() => onCreateFlowchart(selectedFolderId || undefined)}
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
              const isMenuOpen = activeMenuId === flow.id;
              const currentFolderName = folders.find((f) => f.id === flow.folder_id)?.name || (flow.name.includes('Intimações') ? 'Jurídico' : 'Geral');

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
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'var(--bg-tertiary)',
                          color: 'var(--accent-cyan)',
                          border: '1px solid var(--border-color)',
                        }}>
                          {currentFolderName}
                        </span>
                      </div>

                      {/* Menu de 3 Pontos (...) */}
                      {canEdit && (
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setActiveMenuId(isMenuOpen ? null : flow.id)}
                            style={{
                              padding: '4px',
                              borderRadius: '6px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '28px',
                              width: '160px',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                              zIndex: 50,
                              padding: '4px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                            }}>
                              {/* 5. OPÇÃO MOVER PARA... */}
                              <button
                                onClick={() => {
                                  setMovingFlowchart(flow);
                                  setActiveMenuId(null);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 10px',
                                  fontSize: '12px',
                                  color: 'var(--text-primary)',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <MoveRight size={14} color="var(--accent-cyan)" />
                                Mover para...
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm(`${t.dashboard.confirmDelete} "${flow.name}"?`)) {
                                    onDeleteFlowchart(flow.id);
                                  }
                                  setActiveMenuId(null);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 10px',
                                  fontSize: '12px',
                                  color: '#ef4444',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <Trash2 size={14} />
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      )}
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

                    {/* Action Button */}
                    <button
                      onClick={() => onOpenFlowchart(flow)}
                      style={{
                        width: '100%',
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
            <p style={{ fontSize: '14px', fontWeight: 600 }}>Nenhum fluxo encontrado nesta Área.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Clique em "+ Novo Fluxo" para cadastrar um processo nesta pasta.</p>
          </div>
        )}
      </main>

      {/* MODAL: CRIAR NOVA ÁREA */}
      {isNewAreaModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
        }}>
          <form onSubmit={handleCreateArea} style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Nova Área / Disciplina
              </h3>
              <button
                type="button"
                onClick={() => setIsNewAreaModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Nome da Área
            </label>
            <input
              type="text"
              placeholder="Ex: Controladoria, Marketing, Logística..."
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                marginBottom: '20px',
              }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsNewAreaModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                  border: 'none',
                  color: '#0a0c10',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Criar Área
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. MODAL: MOVER FLUXO PARA OUTRA PASTA */}
      {movingFlowchart && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Mover Fluxo de Área
              </h3>
              <button
                type="button"
                onClick={() => setMovingFlowchart(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Selecione a nova pasta de destino para <strong>"{movingFlowchart.name}"</strong>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto', marginBottom: '20px' }}>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleConfirmMove(f.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: movingFlowchart.folder_id === f.id ? 'rgba(0, 242, 254, 0.15)' : 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {getFolderIcon(f.icon)}
                    <span>{f.name}</span>
                  </div>
                  {movingFlowchart.folder_id === f.id && (
                    <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 800 }}>Atual</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setMovingFlowchart(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
