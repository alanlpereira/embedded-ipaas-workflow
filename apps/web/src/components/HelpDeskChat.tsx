import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { HelpCircle, Send, Bot, User, Loader2, Sparkles, ArrowLeft, Compass, Settings, KeyRound, FileSearch, Scale, CreditCard, ChevronRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const formatMessageText = (text: string) => {
  // 1. Clean up any raw internal tags if present
  let cleaned = text
    .replace(/\[Manual:[^\]]+\]/g, '')
    .replace(/Categoria:[^\n]+\n/g, '')
    .replace(/Com base na Base de Conhecimento RAG do Synapse:\s*/gi, '')
    .replace(/Aqui está a orientação da plataforma Synapse para você:\s*/gi, '')
    .trim();

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const lines = cleaned.split('\n');

  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={lineIdx} className="h-2" />;

    // Detect WhatsApp link
    if (trimmed.includes('wa.me') || trimmed.includes('whatsapp')) {
      const match = trimmed.match(urlRegex);
      const url = match ? match[0] : 'https://wa.me/5532988654825';
      return (
        <div key={lineIdx} className="my-2.5">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5"
          >
            <span>💬 Falar com Atendimento Humano no WhatsApp</span>
          </a>
        </div>
      );
    }

    // Bold parsing
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const formattedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} className="font-semibold text-cyan-300">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    // List item
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || /^\d+\./.test(trimmed)) {
      return (
        <div key={lineIdx} className="flex items-start gap-2 my-1 pl-1 text-slate-200">
          <span className="text-cyan-400 font-bold text-xs shrink-0 mt-0.5">•</span>
          <span className="flex-1">{formattedLine}</span>
        </div>
      );
    }

    return (
      <p key={lineIdx} className="my-1 leading-relaxed text-slate-200">
        {formattedLine}
      </p>
    );
  });
};

interface QuickTopic {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
}

const QUICK_TOPICS: QuickTopic[] = [
  {
    id: 'nav',
    title: 'Navegação no App',
    description: 'Telas, abas e menus',
    icon: <Compass className="w-4 h-4 text-cyan-400" />,
    prompt: 'Como navegar no sistema Synapse e quais são as principais telas?'
  },
  {
    id: 'cfg',
    title: 'Configurar OAB & Perfil',
    description: 'Preenchimento e preferências',
    icon: <Settings className="w-4 h-4 text-blue-400" />,
    prompt: 'Como configurar a minha OAB, perfil e preferências do sistema?'
  },
  {
    id: 'pwd',
    title: 'Resetar Senha',
    description: 'Passo a passo de troca',
    icon: <KeyRound className="w-4 h-4 text-purple-400" />,
    prompt: 'Como reseto a minha senha de acesso?'
  },
  {
    id: 'pje',
    title: 'Buscar Intimações PJe',
    description: 'Consultas no PJe Comunica',
    icon: <FileSearch className="w-4 h-4 text-emerald-400" />,
    prompt: 'Como consultar intimações e processos no PJe Comunica?'
  },
  {
    id: 'copilot',
    title: 'Legal Copilot (IA)',
    description: 'Peças com Claude 3.5',
    icon: <Scale className="w-4 h-4 text-amber-400" />,
    prompt: 'Como gerar peças jurídicas com o Legal Copilot (Claude 3.5)?'
  },
  {
    id: 'plan',
    title: 'Planos & Preços',
    description: 'Tabela de limites e valores',
    icon: <CreditCard className="w-4 h-4 text-pink-400" />,
    prompt: 'Quais são os planos de assinatura, preços e limites de IA?'
  }
];

interface HelpDeskChatProps {
  onBack?: () => void;
  isCompact?: boolean;
}

export const HelpDeskChat: React.FC<HelpDeskChatProps> = ({ onBack, isCompact = false }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Olá! Sou o **Assistente Virtual Synapse**.\n\nComo posso ajudar você hoje? Clique em um dos tópicos abaixo ou digite sua dúvida.',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const executeSend = async (userText: string) => {
    if (!userText.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText.trim(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('llm-router', {
        body: {
          action_type: 'help',
          prompt: userText.trim(),
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
        text: data.reply || 'Não foi possível obter a resposta.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Erro no Help Desk Chat:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ Desculpe, ocorreu uma falha temporária ao consultar o assistente: ${err.message || 'Tente novamente.'}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    executeSend(inputPrompt);
  };

  return (
    <div className={isCompact ? "h-full bg-slate-950 text-slate-100 flex flex-col font-sans p-3 overflow-hidden" : "min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col font-sans"}>
      <div className={isCompact ? "flex-1 flex flex-col space-y-3 overflow-hidden h-full" : "max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-4"}>
        
        {/* Header Corporativo (Full Page) */}
        {!isCompact && (
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-3.5">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Voltar"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400 shadow-inner">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
                  Central de Ajuda & Suporte
                  <span className="flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Orientação direta sobre uso, navegação e configurações do Synapse IPaaS Legal.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tópicos Rápidos Selecionáveis */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-md">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Assuntos Frequentes:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => executeSend(topic.prompt)}
                disabled={sending}
                className="flex items-center justify-between p-2.5 bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800/90 hover:border-blue-500/40 rounded-xl transition text-left group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-slate-900 group-hover:scale-105 transition-transform shrink-0">
                    {topic.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                      {topic.title}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {topic.description}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0 ml-1" />
              </button>
            ))}
          </div>
        </div>

        {/* Container Principal de Mensagens */}
        <div className="flex-1 bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between min-h-[380px] overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[520px] no-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-lg shadow-blue-600/20 font-medium'
                    : 'bg-slate-950/90 border border-slate-800/90 text-slate-100 rounded-tl-none shadow-md space-y-1'
                }`}>
                  {formatMessageText(msg.text)}
                  
                  <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400 opacity-75 pt-2 font-mono">
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5 shadow-md">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3 items-center text-slate-400 text-xs py-2">
                <div className="w-8 h-8 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <span className="font-medium text-slate-300 animate-pulse">Consultando assistente virtual...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Campo de Envio de Mensagem */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-3 border-t border-slate-800/80 mt-3">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Digite sua dúvida sobre o sistema..."
              disabled={sending}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
            />
            <button
              type="submit"
              disabled={sending || !inputPrompt.trim()}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white px-4 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center font-bold text-xs gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Enviar</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
