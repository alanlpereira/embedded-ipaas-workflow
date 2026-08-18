import React, { useState } from 'react';
import { X, Maximize2, Sparkles, Bot } from 'lucide-react';
import { HelpDeskChat } from './HelpDeskChat';
import { ViewTab } from './Navbar';

interface FloatingHelpWidgetProps {
  onOpenFullHelpDesk?: () => void;
  onNavigate?: (tab: ViewTab) => void;
}

export const FloatingHelpWidget: React.FC<FloatingHelpWidgetProps> = ({ onOpenFullHelpDesk, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-sans">
      {/* Window / Popup do Chat de Ajuda IA */}
      {isOpen && (
        <div className="mb-3 w-[95vw] sm:w-[480px] h-[620px] max-h-[85vh] bg-slate-950/95 border border-cyan-500/20 rounded-2xl shadow-2xl shadow-blue-950/80 backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header Superior do Widget */}
          <div className="bg-slate-900/90 border-b border-slate-800 p-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 shadow-md flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-cyan-400">
                    <Bot className="w-4 h-4" />
                  </div>
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5 tracking-tight">
                  Guia Interativo Synapse
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono font-bold">
                    Online
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Navegue por tópicos ou consulte o assistente</p>
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
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition cursor-pointer"
                  title="Expandir para tela cheia"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition cursor-pointer"
                title="Fechar Guia de Ajuda"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Corpo do Guia Interativo Integrado */}
          <div className="flex-1 overflow-hidden">
            <HelpDeskChat
              isCompact={true}
              onNavigate={(targetTab) => {
                setIsOpen(false);
                if (onNavigate) onNavigate(targetTab);
              }}
            />
          </div>
        </div>
      )}

      {/* Botão Flutuante (Floating Trigger) */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-full shadow-2xl shadow-blue-600/40 border border-cyan-400/30 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        title="Guia Interativo de Ajuda"
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
