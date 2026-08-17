import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { HelpCircle, Send, Bot, User, Loader2, Sparkles, BookOpen, ArrowLeft } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  provider?: string;
  model?: string;
}

const renderFormattedText = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(/https?:\/\/[^\s]+/)) {
      const isWhatsApp = part.includes('wa.me') || part.includes('whatsapp');
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isWhatsApp
              ? "inline-flex items-center gap-1.5 px-3 py-1.5 my-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition"
              : "text-blue-400 hover:underline font-medium"
          }
        >
          {isWhatsApp ? '💬 Falar com Especialista no WhatsApp' : part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

interface HelpDeskChatProps {
  onBack?: () => void;
}

export const HelpDeskChat: React.FC<HelpDeskChatProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Olá! Sou o Assistente Virtual do Help Desk Synapse. Como posso ajudar com dúvidas sobre a plataforma, manuais ou procedimentos?',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      provider: 'google_gemini_rag',
      model: 'gemini-1.5-flash'
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || sending) return;

    const userText = inputPrompt.trim();
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setSending(true);

    try {
      // Invocação da Edge Function llm-router com action_type: 'help'
      const { data, error } = await supabase.functions.invoke('llm-router', {
        body: {
          action_type: 'help',
          prompt: userText,
          history: messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            text: m.text
          }))
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Erro ao processar consulta de ajuda');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Não foi possível obter a resposta do manual.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        provider: data.providerUsed || 'google_gemini_rag',
        model: data.modelUsed || 'gemini-1.5-flash'
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Erro no Help Desk Chat:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ Desculpe, ocorreu um erro ao consultar os manuais: ${err.message || 'Tente novamente.'}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col font-sans">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-4">
        
        {/* Header Corporativo do Help Desk */}
        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onBack) {
                  onBack();
                } else if (typeof window !== 'undefined') {
                  window.history.back();
                }
              }}
              className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Help Desk & Suporte RAG
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
                  Gemini 768d RAG
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Tire dúvidas sobre uso da plataforma, manuais e procedimentos com suporte de inteligência vetorial.
              </p>
            </div>
          </div>
        </div>

        {/* Caixas de Chat e Histórico */}
        <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 md:p-6 flex flex-col justify-between space-y-4 min-h-[500px] backdrop-blur-sm shadow-xl">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[580px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[80%] rounded-2xl p-4 space-y-2 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/20'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                }`}>
                  <p className="whitespace-pre-wrap">{renderFormattedText(msg.text)}</p>
                  
                  <div className="flex items-center justify-between gap-4 text-[10px] opacity-70 border-t border-white/10 pt-1.5 font-mono">
                    <span>{msg.timestamp}</span>
                    {msg.provider && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <BookOpen className="w-3 h-3" /> {msg.provider} ({msg.model})
                      </span>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3 items-center text-slate-400 text-xs py-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <span>Buscando manuais vetoriais no PostgreSQL...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form de envio de mensagem */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Digite sua dúvida (Ex: Como reseto a minha senha?)..."
              disabled={sending}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              disabled={sending || !inputPrompt.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
