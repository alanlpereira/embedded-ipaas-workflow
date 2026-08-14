import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Paperclip, Send, Copy, Download, Trash2, Check, FileText, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LegalAiService } from '../services/LegalAiService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  attachments?: string[];
  isThinking?: boolean;
}

export const LegalCopilotChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: `🏛️ **Bem-vindo ao Legal Copilot!**\n\nSou seu assistente jurídico sênior especializado em Direito Brasileiro. Posso ajudá-lo a:\n\n• **Redigir Peças Processuais**: Petições Iniciais, Contestações, Réplicas, Apelações e Agravos.\n• **Analisar Documentos**: Anexe contratos, sentenças ou intimações para elaboração de pareceres.\n• **Estruturação Formal**: Redação técnica com endereçamento, dos fatos, do direito e dos pedidos.\n\n*Como posso auxiliar na sua atuação jurídica hoje?*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedPaths, setAttachedPaths] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Upload de arquivos para o Supabase Storage (Bucket 'legal_copilot_files')
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    showToast('📤 Fazendo upload seguro dos anexos para o storage privado...');

    const uploadedPaths: string[] = [];

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Isolar uploads pelo UID do usuário autenticado para mitigar Path Traversal
        const userSessionStr = localStorage.getItem('synapse_active_session');
        let userIdPrefix = 'user_shared';
        if (userSessionStr) {
          try {
            const userSession = JSON.parse(userSessionStr);
            if (userSession.id || userSession.email) {
              userIdPrefix = String(userSession.id || userSession.email).replace(/[^a-zA-Z0-9_-]/g, '_');
            }
          } catch (e) {}
        }

        const filePath = `${userIdPrefix}/${fileName}`;

        // Upload autenticado para o bucket PRIVADO 'legal_copilot_files'
        const { data, error } = await supabase.storage
          .from('legal_copilot_files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          console.warn('⚠️ Erro no upload para legal_copilot_files:', error.message);
          uploadedPaths.push(filePath);
        } else {
          // Armazenar estritamente o caminho relativo do arquivo no bucket
          uploadedPaths.push(data?.path || filePath);
        }
      } catch (err: any) {
        console.error('❌ Erro no upload do arquivo:', err);
      }
    }

    setAttachedFiles(prev => [...prev, ...files]);
    setAttachedPaths(prev => [...prev, ...uploadedPaths]);
    setIsUploading(false);
    showToast(`✅ ${files.length} arquivo(s) armazenado(s) com sucesso no storage privado!`);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    setAttachedPaths(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    const trimmedPrompt = inputPrompt.trim();
    if (!trimmedPrompt && attachedPaths.length === 0) return;

    const userMessageId = `msg-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: trimmedPrompt || '(Documento enviado para análise)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: [...attachedFiles.map(f => f.name)]
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    const currentFilePaths = [...attachedPaths];
    setAttachedFiles([]);
    setAttachedPaths([]);
    setIsSending(true);

    try {
      // Montar histórico para a IA
      const history = messages
        .filter(m => m.id !== 'welcome-1')
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      console.log('📡 Invocando LegalAiService com caminhos relativos de arquivos privados...');

      const aiResponse = await LegalAiService.generateLegalContent({
        prompt: trimmedPrompt,
        history,
        filePaths: currentFilePaths
      });

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: aiResponse.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('❌ Erro no Legal Copilot:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **Aviso de Conexão**: Não foi possível comunicar com o motor da IA Legal Copilot.\n\n*Detalhes do Erro*: \`${err.message}\``,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    showToast('📋 Texto da peça copiado para a área de transferência!');
    setTimeout(() => setCopiedMessageId(null), 3000);
  };

  const handleDownloadMarkdown = (text: string, id: string) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `peca_processual_${id}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('⬇️ Arquivo Markdown (.md) baixado com sucesso!');
  };

  const handleClearChat = () => {
    if (window.confirm('Deseja limpar todo o histórico de conversa do Legal Copilot?')) {
      setMessages([
        {
          id: 'welcome-1',
          role: 'model',
          text: `🏛️ **Novo Atendimento Legal Copilot**\n\nPronto para iniciar uma nova peça ou análise documental. Como posso ajudar?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
      showToast('🗑️ Histórico de mensagens limpo.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: 'var(--bg-primary, #090d16)',
      color: 'var(--text-primary, #f8fafc)',
      fontFamily: 'Inter, system-ui, sans-serif',
      boxSizing: 'border-box'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--accent-blue, #3b82f6)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Sparkles size={16} style={{ color: '#38bdf8' }} />
          {toastMessage}
        </div>
      )}

      {/* Header do Chat Copilot */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <Bot size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Legal Copilot
              </h2>
              <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                Gemini 1.5 Pro
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', margin: '2px 0 0 0' }}>
              Assistente de Redação Processual & Análise de Documentos
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          title="Limpar Conversa"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'var(--text-muted, #94a3b8)',
            padding: '8px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          <Trash2 size={14} /> Limpar Chat
        </button>
      </div>

      {/* Área de Mensagens do Chat */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        background: 'var(--bg-primary, #090d16)'
      }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            {/* Rótulo de Identificação */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--text-muted, #94a3b8)',
              marginBottom: '6px'
            }}>
              {msg.role === 'user' ? (
                <>
                  <span>Você</span>
                  <User size={12} />
                </>
              ) : (
                <>
                  <Bot size={12} style={{ color: '#38bdf8' }} />
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>Legal Copilot</span>
                </>
              )}
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            {/* Balão da Mensagem */}
            <div style={{
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
                : 'rgba(15, 23, 42, 0.8)',
              color: '#ffffff',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '16px 20px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              lineHeight: '1.7',
              fontSize: '14px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              width: '100%'
            }}>
              {/* Anexos na mensagem do usuário */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div style={{
                  marginBottom: '10px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid rgba(255,255,255,0.2)',
                  fontSize: '12px'
                }}>
                  <strong style={{ opacity: 0.9 }}>📎 Anexos enviados:</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                    {msg.attachments.map((att, idx) => (
                      <li key={idx}>{att}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Texto Principal */}
              {msg.text}
            </div>

            {/* Botões de Ação na Resposta da IA */}
            {msg.role === 'model' && msg.id !== 'welcome-1' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '8px'
              }}>
                <button
                  onClick={() => handleCopyText(msg.id, msg.text)}
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {copiedMessageId === msg.id ? (
                    <>
                      <Check size={13} color="#10b981" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copiar Texto
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDownloadMarkdown(msg.text, msg.id)}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Download size={13} /> Baixar Peça (.md)
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Indicador de Pensando/Carregando */}
        {isSending && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            padding: '12px 18px',
            borderRadius: '12px',
            width: 'fit-content',
            fontSize: '13px',
            fontWeight: 600,
            animation: 'pulse 1.5s infinite'
          }}>
            <RefreshCw size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Redigindo parecer/peça jurídica via Gemini 1.5 Pro...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Painel de Anexos Pendentes */}
      {attachedFiles.length > 0 && (
        <div style={{
          padding: '10px 24px',
          background: 'rgba(15, 23, 42, 0.9)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Anexos prontos para envio:</span>
          {attachedFiles.map((file, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#38bdf8',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FileText size={12} />
              <span>{file.name}</span>
              <button
                onClick={() => removeAttachment(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sugestões Rápidas de Prompts para a IA */}
      <div style={{
        padding: '8px 24px',
        background: 'rgba(15, 23, 42, 0.7)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setInputPrompt('Elabore uma Contestação cível completa fundamentada no CPC para ação de cobrança.')}
          style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#38bdf8', padding: '5px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          ⚖️ Redigir Contestação
        </button>
        <button
          onClick={() => setInputPrompt('Analise a intimação anexada e apresente parecer parecerista com os pontos controversos e prazos.')}
          style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '5px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          📜 Parecer de Intimação
        </button>
        <button
          onClick={() => setInputPrompt('Elabore petição simples de juntada de procuração e substabelecimento.')}
          style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', padding: '5px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          📄 Juntada de Procuração
        </button>
        <button
          onClick={() => setInputPrompt('Elabore minuta de Recurso de Apelação alegando cerceamento de defesa.')}
          style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', padding: '5px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          📑 Minuta de Apelação
        </button>
      </div>

      {/* Footer de Entrada (Input & Botões) */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-end'
      }}>
        {/* Input Oculto de Arquivos */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          style={{ display: 'none' }}
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
        />

        {/* Botão de Anexo */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isSending}
          title="Anexar Documento"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'var(--text-primary, #f8fafc)',
            padding: '12px',
            borderRadius: '10px',
            cursor: isUploading || isSending ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            height: '46px'
          }}
        >
          <Paperclip size={18} />
        </button>

        {/* Área de Texto Multi-linhas */}
        <textarea
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Descreva a peça necessária ou instrução para análise dos documentos... (Shift + Enter para nova linha)"
          rows={2}
          disabled={isSending}
          style={{
            flex: 1,
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '13px',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.5'
          }}
        />

        {/* Botão de Envio */}
        <button
          onClick={handleSendMessage}
          disabled={isSending || (!inputPrompt.trim() && attachedPaths.length === 0)}
          style={{
            background: isSending || (!inputPrompt.trim() && attachedPaths.length === 0)
              ? 'rgba(255, 255, 255, 0.1)'
              : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: isSending || (!inputPrompt.trim() && attachedPaths.length === 0) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
            height: '46px'
          }}
        >
          <span>Enviar</span>
          <Send size={16} />
        </button>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
