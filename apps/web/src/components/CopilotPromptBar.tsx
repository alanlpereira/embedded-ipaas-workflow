import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { WorkflowNode, WorkflowEdge } from '@ipaas/shared-types';

interface CopilotPromptBarProps {
  onFlowGenerated: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
}

export const CopilotPromptBar: React.FC<CopilotPromptBarProps> = ({ onFlowGenerated }) => {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);

    try {
      const response = await fetch('/api/v1/ai/generate-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (data.nodes && data.edges) {
        onFlowGenerated(data.nodes, data.edges);
        setPrompt('');
      } else {
        alert('Não foi possível interpretar o prompt. Tente novamente.');
      }
    } catch (err: any) {
      alert(`Erro na geração com IA: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 25,
      width: '90%',
      maxWidth: '680px',
    }}>
      <form
        onSubmit={handleGenerate}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px 8px 16px',
          borderRadius: '28px',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 242, 254, 0.4)',
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 242, 254, 0.2)',
          transition: 'all 0.25s ease',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(79, 172, 254, 0.15))',
          color: 'var(--accent-cyan)',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap',
        }}>
          <Sparkles size={14} color="var(--accent-cyan)" />
          {t.copilot.badge}
        </div>

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t.copilot.placeholder}
          disabled={isGenerating}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
          }}
        />

        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
            color: '#0a0c10',
            fontWeight: 700,
            fontSize: '12px',
            border: 'none',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating || !prompt.trim() ? 0.6 : 1,
            boxShadow: '0 2px 10px rgba(0, 242, 254, 0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          {isGenerating ? (
            <>
              <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              {t.copilot.generating}
            </>
          ) : (
            <>
              {t.copilot.generateBtn}
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
