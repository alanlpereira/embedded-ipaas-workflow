import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  HelpCircle, Send, Loader2, Sparkles, ArrowLeft, 
  Scale, Users, UserCheck, PhoneCall, ChevronRight, 
  Search, ExternalLink, RefreshCw, MessageSquare
} from 'lucide-react';
import { ViewTab } from './Navbar';

const WHATSAPP_HUMAN_SUPPORT_URL = 'https://wa.me/5532988654825?text=Ol%C3%A1!%20Gostaria%20de%20solicitar%20ajuda%20humana%20para%20o%20sistema%20Synapse.';

interface HelpSubTopic {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  targetTab?: ViewTab;
  isWhatsAppAction?: boolean;
}

interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  topics: HelpSubTopic[];
}

const FAQ_TREE: HelpCategory[] = [
  {
    id: 'pje',
    title: 'Portal de Processos (PJe)',
    description: 'Intimações, diários eletrônicos e sincronização',
    icon: <Scale className="w-4 h-4 text-cyan-400" />,
    badge: 'PJe Live',
    topics: [
      {
        id: 'pje-search',
        title: 'Como consultar minhas intimações ativas?',
        summary: 'Acesse o Portal de Processos para visualizar todas as intimações sincronizadas automaticamente do PJe Comunica.',
        steps: [
          'Clique na aba "Portal de Processos" no menu lateral.',
          'Utilize a barra de pesquisa superior para buscar por número do processo, advogado ou parte.',
          'Filtre os resultados por Tribunal (TJMG, TRT, STJ, etc.) ou Intervalo de Datas.'
        ],
        targetTab: 'dashboard'
      },
      {
        id: 'pje-tz',
        title: 'Qual é o fuso horário aplicado às intimações?',
        summary: 'Todas as datas e horas de publicação são padronizadas estritamente no Fuso Horário de Brasília (UTC-3).',
        steps: [
          'O robô de busca coleta os diários e ajusta automaticamente o horário para Brasília (UTC-3).',
          'Não é necessário alterar nenhuma configuração de fuso horário no seu dispositivo.'
        ],
        targetTab: 'dashboard'
      }
    ]
  },
  {
    id: 'copilot',
    title: 'Legal Copilot (IA)',
    description: 'Redação de peças com Anthropic Claude 3.5 Sonnet',
    icon: <Sparkles className="w-4 h-4 text-sky-400" />,
    badge: 'Claude 3.5',
    topics: [
      {
        id: 'copilot-write',
        title: 'Como gerar uma peça jurídica automatizada?',
        summary: 'O Legal Copilot utiliza a inteligência artificial Claude 3.5 Sonnet para redigir petições, contestações e pareceres com linguagem jurídica precisa.',
        steps: [
          'Acesse a aba "Legal Copilot (IA)" na barra lateral.',
          'Escolha o tipo de peça (Petição Inicial, Contestação, Recurso, etc.).',
          'Descreva os fatos ou anexe o PDF do processo para a IA fundamentar com a jurisprudência atualizada.'
        ],
        targetTab: 'copilot'
      },
      {
        id: 'copilot-privacy',
        title: 'Qual a garantia de sigilo das informações do cliente?',
        summary: 'Seus dados e documentos são processados em ambiente corporativo seguro com criptografia de ponta a ponta.',
        steps: [
          'Nenhum dado do seu processo é utilizado para treinar modelos públicos.',
          'O armazenamento segue rigorosamente as diretrizes da LGPD para advocacia.'
        ],
        targetTab: 'copilot'
      }
    ]
  },
  {
    id: 'clients',
    title: 'Clientes & Casos',
    description: 'Gestão de partes, contatos e processos vinculados',
    icon: <Users className="w-4 h-4 text-emerald-400" />,
    topics: [
      {
        id: 'clients-manage',
        title: 'Como cadastrar e vincular um novo cliente?',
        summary: 'Organize o cadastro dos seus clientes e associe os números de processos para acompanhamento unificado.',
        steps: [
          'Acesse a aba "Clientes & Casos".',
          'Clique no botão "Novo Cliente" e preencha nome, CPF/CNPJ e contato.',
          'Vincule os processos judiciais correspondentes para receber alertas unificados.'
        ],
        targetTab: 'clients'
      }
    ]
  },
  {
    id: 'profile',
    title: 'Meu Perfil Jurídico',
    description: 'Dados pessoais, foto e número de registro da OAB',
    icon: <UserCheck className="w-4 h-4 text-purple-400" />,
    topics: [
      {
        id: 'profile-photo',
        title: 'Como alterar minha foto e telefone de contato?',
        summary: 'Você pode personalizar seu perfil adicionando uma foto profissional e mantendo seu WhatsApp atualizado.',
        steps: [
          'Clique no menu lateral e selecione "Meu Perfil".',
          'Clique no ícone de câmera para carregar uma nova foto de perfil.',
          'Atualize seu telefone/WhatsApp e clique em "Salvar Alterações do Perfil".'
        ],
        targetTab: 'profile'
      },
      {
        id: 'profile-oab',
        title: 'Por que o número da OAB não pode ser alterado no meu perfil?',
        summary: 'O número e a UF da OAB são vinculados à assinatura da conta por motivos de segurança e compliance corporativo.',
        steps: [
          'Usuários da categoria Member possuem OAB estática associada ao contrato.',
          'Caso haja troca de OAB por mudança de seccional, o Administrador Master da organização pode realizar a atualização.'
        ],
        targetTab: 'profile'
      }
    ]
  },
  {
    id: 'human-support',
    title: 'Atendimento Humano no WhatsApp',
    description: 'Fale diretamente com nossa equipe (+55 32 98865-4825)',
    icon: <PhoneCall className="w-4 h-4 text-emerald-400" />,
    badge: 'WhatsApp',
    topics: [
      {
        id: 'support-direct',
        title: 'Solicite ajuda humana com um especialista no WhatsApp',
        summary: 'Sua dúvida não foi resolvida? Clique no botão abaixo para iniciar uma conversa imediata com um atendente no WhatsApp.',
        steps: [
          'Clique em "Solicite ajuda humana" para abrir a conversa no WhatsApp.',
          'Número de Atendimento: +55 (32) 98865-4825.',
          'Horário de Atendimento: Segunda a Sexta, das 09h às 18h.'
        ],
        isWhatsAppAction: true
      }
    ]
  }
];

interface HelpDeskChatProps {
  onBack?: () => void;
  isCompact?: boolean;
  onNavigate?: (tab: ViewTab) => void;
}

export const HelpDeskChat: React.FC<HelpDeskChatProps> = ({ onBack, isCompact = false, onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<HelpSubTopic | null>(null);
  
  // Modos de Busca por IA em Texto Livre
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const resetToRoot = () => {
    setSelectedCategory(null);
    setSelectedTopic(null);
    setIsSearchMode(false);
    setSearchQuery('');
    setAiAnswer(null);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isAiLoading) return;

    setIsAiLoading(true);
    setIsSearchMode(true);
    setAiAnswer(null);

    try {
      const { data, error } = await supabase.functions.invoke('llm-router', {
        body: {
          action_type: 'help',
          prompt: searchQuery.trim()
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Não foi possível consultar a base de conhecimento');
      }

      setAiAnswer(data.reply || 'Nenhuma informação encontrada.');
    } catch (err: any) {
      setAiAnswer(`⚠️ Ocorreu uma falha ao consultar o assistente: ${err.message || 'Tente novamente.'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExecuteNavigation = (targetTab?: ViewTab) => {
    if (!targetTab) return;
    if (onNavigate) {
      onNavigate(targetTab);
    } else if (typeof window !== 'undefined') {
      window.location.href = `/juridico`;
    }
  };

  return (
    <div className={isCompact ? "h-full bg-slate-950 text-slate-100 flex flex-col font-sans p-3 overflow-hidden" : "min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col font-sans"}>
      <div className={isCompact ? "flex-1 flex flex-col space-y-3 overflow-hidden h-full" : "max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-4"}>
        
        {/* Header Superior Principal */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 backdrop-blur-xl shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white flex items-center gap-2 tracking-tight">
                Central de Ajuda & Guia do Sistema
              </h1>
              <p className="text-xs text-slate-400">
                Navegue pelos tópicos ou solicite suporte humano diretamente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* BOTÃO OBRIGATÓRIO DE SUPORTE HUMANO NO HEADER */}
            <a
              href={WHATSAPP_HUMAN_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition transform hover:-translate-y-0.5 cursor-pointer shrink-0"
              title="Abrir WhatsApp corporativo (+55 32 98865-4825)"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline-block">Solicite ajuda humana</span>
            </a>

            {(selectedCategory || isSearchMode) && (
              <button
                type="button"
                onClick={resetToRoot}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Início</span>
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumb de Navegação */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 px-1">
          <button
            type="button"
            onClick={resetToRoot}
            className={`hover:text-cyan-400 transition cursor-pointer ${!selectedCategory && !isSearchMode ? 'text-cyan-400 font-bold' : ''}`}
          >
            Categorias Principais
          </button>
          
          {selectedCategory && (
            <>
              <span>/</span>
              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                className={`hover:text-cyan-400 transition cursor-pointer ${selectedCategory && !selectedTopic ? 'text-cyan-400 font-bold' : ''}`}
              >
                {selectedCategory.title}
              </button>
            </>
          )}

          {selectedTopic && (
            <>
              <span>/</span>
              <span className="text-slate-200 font-bold truncate max-w-[200px]">{selectedTopic.title}</span>
            </>
          )}

          {isSearchMode && (
            <>
              <span>/</span>
              <span className="text-cyan-400 font-bold">Busca Personalizada</span>
            </>
          )}
        </div>

        {/* CONTAINER DINÂMICO DE NAVEGAÇÃO */}
        <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto backdrop-blur-md shadow-2xl min-h-[360px] no-scrollbar">
          
          <div>
            {/* NÍVEL 1: SE NENHUMA CATEGORIA ESTIVER SELECIONADA E NÃO ESTIVER BUSCANDO */}
            {!selectedCategory && !isSearchMode && (
              <div className="space-y-3">
                
                {/* CARD DE DESTAQUE FIXO: SOLICITE AJUDA HUMANA */}
                <a
                  href={WHATSAPP_HUMAN_SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between p-4 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 rounded-xl transition text-left group cursor-pointer shadow-lg"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform shrink-0 border border-emerald-500/30">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                          Solicite ajuda humana
                        </h3>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.2 rounded font-bold">
                          WhatsApp (+55 32 98865-4825)
                        </span>
                      </div>
                      <p className="text-xs text-emerald-200/80 mt-1 leading-relaxed">
                        Prefere falar diretamente com um especialista? Clique aqui para mandar uma mensagem no WhatsApp.
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-emerald-400 shrink-0 ml-2 mt-1" />
                </a>

                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider my-2">
                  Ou explore os tópicos por módulo do sistema:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FAQ_TREE.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className="flex items-start justify-between p-4 bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl transition text-left group cursor-pointer shadow-md"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-slate-900 group-hover:scale-105 transition-transform shrink-0 border border-slate-800">
                          {cat.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                              {cat.title}
                            </h3>
                            {cat.badge && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded font-mono font-bold">
                                {cat.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {cat.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0 ml-2 mt-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* NÍVEL 2: CATEGORIA SELECIONADA, EXIBINDO SUBMENUS */}
            {selectedCategory && !selectedTopic && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      {selectedCategory.icon}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">{selectedCategory.title}</h2>
                      <p className="text-xs text-slate-400">{selectedCategory.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    ← Voltar às categorias
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedCategory.topics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopic(topic)}
                      className="w-full flex items-center justify-between p-3.5 bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl transition text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                          {topic.title}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* NÍVEL 3: TÓPICO SELECIONADO, EXIBINDO EXPLICAÇÃO SINTÉTICA + BOTÃO DE AÇÃO */}
            {selectedTopic && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    {selectedTopic.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedTopic(null)}
                    className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    ← Voltar aos tópicos
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                  {selectedTopic.summary}
                </p>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Passos Recomendados:
                  </div>
                  {selectedTopic.steps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-2.5 bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl text-xs text-slate-200">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">
                        {sIdx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>

                {/* BOTÕES DE AÇÃO DIRETA */}
                <div className="pt-2 flex flex-wrap gap-2">
                  {selectedTopic.targetTab && (
                    <button
                      type="button"
                      onClick={() => handleExecuteNavigation(selectedTopic.targetTab)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20 transition cursor-pointer transform hover:-translate-y-0.5"
                    >
                      <span>🚀 Ir para a Tela no Sistema</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <a
                    href={WHATSAPP_HUMAN_SUPPORT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer transform hover:-translate-y-0.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Solicite ajuda humana (WhatsApp)</span>
                  </a>
                </div>
              </div>
            )}

            {/* MODO BUSCA LIVRE EM TEXTO */}
            {isSearchMode && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                    <Search className="w-4 h-4 text-cyan-400" />
                    Resultado da Consulta: "{searchQuery}"
                  </div>
                  <button
                    type="button"
                    onClick={resetToRoot}
                    className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    ← Voltar
                  </button>
                </div>

                {isAiLoading ? (
                  <div className="flex items-center gap-3 p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300">
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span>Consultando os manuais da plataforma...</span>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {aiAnswer}
                  </div>
                )}

                <div className="pt-2">
                  <a
                    href={WHATSAPP_HUMAN_SUPPORT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Solicite ajuda humana no WhatsApp</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* RODAPÉ PERSISTENTE DE SUPORTE HUMANO (EXIBIDO EM TODAS AS NAVEGAÇÕES) */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] text-slate-400 font-medium">
              Precisa de atendimento personalizado?
            </span>
            <a
              href={WHATSAPP_HUMAN_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Solicite ajuda humana</span>
            </a>
          </div>

        </div>

        {/* CAMPO DE PESQUISA LIVRE NO RODAPÉ */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite uma dúvida específica (ex: como filtrar por tribunal)..."
              disabled={isAiLoading}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={isAiLoading || !searchQuery.trim()}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white px-3.5 py-2.5 rounded-xl transition flex items-center justify-center font-semibold text-xs gap-1.5 cursor-pointer disabled:cursor-not-allowed border border-slate-700 shrink-0"
          >
            <span>Buscar</span>
            <Send className="w-3 h-3" />
          </button>
        </form>

      </div>
    </div>
  );
};
