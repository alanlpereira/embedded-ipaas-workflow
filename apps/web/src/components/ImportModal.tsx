import React, { useState } from 'react';
import { Upload, X, CheckCircle, AlertTriangle, FileJson, ArrowRight } from 'lucide-react';
import { WorkflowNode, WorkflowEdge } from '@ipaas/shared-types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (nodes: WorkflowNode[], edges: WorkflowEdge[], name?: string) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportSuccess }) => {
  const [jsonText, setJsonText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateAndImportJSON = (content: string) => {
    setErrorMsg(null);
    try {
      const parsed = JSON.parse(content);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('O arquivo deve conter um objeto JSON válido.');
      }

      const nodes = parsed.nodes || parsed.flowchart?.nodes;
      const edges = parsed.edges || parsed.flowchart?.edges || [];
      const flowName = parsed.name || parsed.flowchart?.name;

      if (!Array.isArray(nodes) || nodes.length === 0) {
        throw new Error('Estrutura de JSON inválida: o objeto deve conter um array "nodes" com pelo menos um nó.');
      }

      for (const node of nodes) {
        if (!node.id || !node.type) {
          throw new Error(`Nó inválido no array: cada nó deve possuir pelo menos "id" e "type".`);
        }
      }

      onImportSuccess(nodes, edges, flowName);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao validar a estrutura do arquivo JSON.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonText(text);
      validateAndImportJSON(text);
    };
    reader.readAsText(file);
  };

  const handleManualImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonText.trim()) return;
    validateAndImportJSON(jsonText);
  };

  return (
    <div
      style={{
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
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: '540px',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileJson size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Importar Fluxograma (.json)</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Zona de Drop e Upload de Arquivo */}
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 20px',
            border: '2px dashed var(--accent-blue)',
            borderRadius: '16px',
            background: 'var(--bg-tertiary)',
            cursor: 'pointer',
            marginBottom: '20px',
            transition: 'all 0.2s',
          }}
        >
          <Upload size={32} color="var(--accent-blue)" style={{ marginBottom: '12px' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {fileName ? `Arquivo selecionado: ${fileName}` : 'Clique para selecionar ou arraste o arquivo .json'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Suporta arquivos exportados do NexusFlow iPaaS
          </span>
          <input type="file" accept=".json,application/json" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>

        {/* Separador OU */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>OU COLE O JSON ABAIXO</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        {/* Textarea Manual */}
        <form onSubmit={handleManualImportSubmit}>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{\n  "name": "Meu Fluxo",\n  "nodes": [...],\n  "edges": [...]\n}'
            rows={6}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--accent-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              outline: 'none',
              marginBottom: '16px',
            }}
          />

          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#f87171',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}>
              <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!jsonText.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                background: !jsonText.trim() ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                color: '#0a0c10',
                fontWeight: 800,
                fontSize: '12px',
                border: 'none',
                cursor: !jsonText.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Validar & Renderizar no Canvas
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
