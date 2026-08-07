import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useLanguage } from '../i18n/LanguageContext';
import { AIErrorBoundary } from './AIErrorBoundary';
import { WorkflowNode, WorkflowEdge } from '@ipaas/shared-types';

interface CopilotPromptBarProps {
  onFlowGenerated?: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  style?: React.CSSProperties;
}

const CopilotPromptBarInner: React.FC<CopilotPromptBarProps> = ({ onFlowGenerated, style }) => {
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('AIzaSyDummyDevKey123');

  useEffect(() => {
    const key = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY || '';
    if (key && !key.includes('YourGeminiApiKeyHere') && key.trim() !== '') {
      setApiKey(key.trim());
    }
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const promptText = textareaRef.current?.value?.trim() || '';
    if (!promptText || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const activeKey = apiKey || 'AIzaSyDummyDevKey123';
      const genAI = new GoogleGenerativeAI(activeKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const fullPrompt = `Você é um arquiteto especialista em automação e iPaaS corporativo.
Crie um fluxograma de automação em formato JSON válido para a seguinte solicitação do usuário:
"${promptText}"

Retorne APENAS um objeto JSON válido na seguinte estrutura sem markdown:
{
  "nodes": [
    { "id": "n1", "type": "trigger", "position": { "x": 250, "y": 50 }, "data": { "label": "Nome do Gatilho", "type": "trigger", "description": "Descrição" } },
    { "id": "n2", "type": "action", "position": { "x": 250, "y": 180 }, "data": { "label": "Nome da Ação", "type": "action", "description": "Descrição" } }
  ],
  "edges": [
    { "id": "e1-2", "source": "n1", "target": "n2", "animated": true }
  ]
}`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      let rawText = response.text();

      if (!rawText || rawText.trim() === '') {
        setErrorMessage('A IA não conseguiu gerar um fluxo válido. Tente detalhar mais o seu pedido.');
        return;
      }

      // Sanitização de Markdown
      rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

      let parsedData: any = {};
      try {
        parsedData = JSON.parse(rawText);
      } catch (jsonErr) {
        console.error('🚨 [JSON PARSE ERROR] Resposta não-JSON recebida da IA:', jsonErr, rawText);
        parsedData = {};
      }

      // Fallbacks Seguros
      const safeNodes = (parsedData && Array.isArray(parsedData.nodes)) ? parsedData.nodes : [];
      const safeEdges = (parsedData && Array.isArray(parsedData.edges)) ? parsedData.edges : [];

      if (safeNodes.length === 0) {
        setErrorMessage('A IA não conseguiu gerar um fluxo válido. Tente detalhar mais o seu pedido.');
        return;
      }

      if (onFlowGenerated) {
        onFlowGenerated(safeNodes, safeEdges);
        if (textareaRef.current) {
          textareaRef.current.value = '';
          textareaRef.current.style.height = 'auto';
        }
      }
    } catch (err: any) {
      console.error('🚨 [GEMINI SDK ERROR] Falha na comunicação com o Google Gemini:', {
        message: err?.message,
        status: err?.status || 'UNKNOWN_STATUS',
        error: err,
      });

      const exactError = err?.message || 'Falha de comunicação com o Google Gemini SDK';
      setErrorMessage(`Erro de Comunicação com a IA: ${exactError}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      maxWidth: '680px',
      ...style,
    }}>
      {/* BARRA DE PROMPT DA IA (ISOLADA COM useRef) */}
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
          border: errorMessage ? '1px solid #ef4444' : '1px solid rgba(0, 242, 254, 0.4)',
          boxShadow: errorMessage
            ? '0 10px 35px rgba(239, 68, 68, 0.3)'
            : '0 10px 35px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 242, 254, 0.2)',
          transition: 'all 0.25s ease',
          width: '100%',
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
          flexShrink: 0,
        }}>
          <Sparkles size={14} color="var(--accent-cyan)" />
          {t.copilot.badge}
        </div>

        <textarea
          ref={textareaRef}
          defaultValue=""
          placeholder={t.copilot.placeholder}
          disabled={isGenerating}
          spellCheck="false"
          rows={1}
          onInput={(e) => {
            const target = e.currentTarget;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleGenerate(e);
            }
          }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            resize: 'none',
            minHeight: '38px',
            maxHeight: '160px',
            overflowY: 'auto',
            lineHeight: '1.4',
            padding: '8px 4px',
          }}
        />

        <button
          type="submit"
          disabled={isGenerating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '20px',
            background: isGenerating ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
            color: '#0a0c10',
            fontWeight: 700,
            fontSize: '12px',
            border: 'none',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.6 : 1,
            boxShadow: '0 2px 10px rgba(0, 242, 254, 0.3)',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
        >
          {isGenerating ? (
            <>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              {t.copilot.generating}
            </>
          ) : (
            <>
              <Send size={14} />
              {t.copilot.generateBtn}
            </>
          )}
        </button>
      </form>

      {/* ALERTA VISUAL DE ERRO DE EXECUÇÃO */}
      {errorMessage && (
        <div style={{
          marginTop: '8px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          borderRadius: '12px',
          padding: '8px 14px',
          color: '#f87171',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export const CopilotPromptBar: React.FC<CopilotPromptBarProps> = (props) => (
  <AIErrorBoundary>
    <CopilotPromptBarInner {...props} />
  </AIErrorBoundary>
);
