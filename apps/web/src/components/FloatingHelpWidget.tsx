import React, { useState } from 'react';
import { HelpCircle, MessageSquare, X, Maximize2, Sparkles, Bot } from 'lucide-react';
import { HelpDeskChat } from './HelpDeskChat';

interface FloatingHelpWidgetProps {
  onOpenFullHelpDesk?: () => void;
}

export const FloatingHelpWidget: React.FC<FloatingHelpWidgetProps> = ({ onOpenFullHelpDesk }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-sans">
      {/* Drawer / Popup do Chat de Ajuda IA */}
      {isOpen && (
        <div className="mb-3 w-[92vw] sm:w-[440px] h-[580px] max-h-[82vh] bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Top Header do Widget */}
          <div className="bg-slate-900/90 border-b border-slate-800 p-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Help Desk & Suporte IA
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                    RAG 768d
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Navegação, configurações e dúvidas</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenFullHelpDesk && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullHelpDesk();
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Expandir para tela cheia"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Fechar Chat de Ajuda"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Corpo do Chat Integrado */}
          <div className="flex-1 overflow-hidden">
            <HelpDeskChat isCompact={true} />
          </div>
        </div>
      )}

      {/* Botão Flutuante (Floating Trigger) */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="group relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-full shadow-2xl shadow-blue-600/40 border border-cyan-400/30 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        title="Ajuda com IA & Suporte RAG"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
        </div>
        <span className="text-xs font-extrabold tracking-wide hidden sm:inline-block">
          💬 Help com IA
        </span>
        <Sparkles className="w-3.5 h-3.5 text-cyan-200 group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  );
};
