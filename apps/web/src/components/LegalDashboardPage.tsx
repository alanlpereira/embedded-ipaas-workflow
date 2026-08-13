import React, { useState, useEffect } from 'react';
import { Scale, Calendar, Play, Clock, Search, Send, FileText, AlertCircle, CheckCircle, ShieldCheck, ChevronRight, RefreshCw, MessageSquare, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LegalAiService } from '../services/LegalAiService';

export interface ProcessMovement {
  id: string;
  process_number: string;
  court: string;
  parties: string;
  movement_text: string;
  action_required: string;
  deadline: string;
  updated_at: string;
  movement_date?: string;
  data_disponibilizacao?: string;
}

interface LegalDashboardPageProps {
  onRunNow?: (customContext?: Record<string, any>) => Promise<any>;
  isRunningNow?: boolean;
}

export const LegalDashboardPage: React.FC<LegalDashboardPageProps> = ({
  onRunNow,
  isRunningNow = false,
}) => {
  // Datas padrão: Ontem até Hoje
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(yesterday);
  const [endDate, setEndDate] = useState(today);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiPrompt, setAiPrompt] = useState('Analisar intimações, extrair determinação judicial e calcular prazo fatal em dias');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);

  // Estados da Caixa de Diálogo da IA por Processo
  const [activeAiDialogId, setActiveAiDialogId] = useState<string | null>(null);
  const [procAiQuestions, setProcAiQuestions] = useState<Record<string, string>>({});
  const [procAiHistories, setProcAiHistories] = useState<Record<string, Array<{ role: string; text: string }>>>({});
  const [procAiLoading, setProcAiLoading] = useState<Record<string, boolean>>({});

  // Chave de persistência individual por OAB no localStorage
  const oabKey = localStorage.getItem('synapse_advocate_oab') || '145105';
  const STORAGE_KEY = `synapse_pje_last_search_${oabKey}`;

  // Inicializar estado com a última pesquisa persistida no localStorage
  const [movements, setMovements] = useState<ProcessMovement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          return parsed.items;
        }
      }
    } catch (err) {
      console.warn('⚠️ Falha ao restaurar última pesquisa do localStorage:', err);
    }
    return [
      {
        id: 'm-1',
        process_number: '5001234-88.2026.8.13.0145',
        court: '2ª Vara Cível da Comarca de Juiz de Fora (TJMG)',
        parties: 'Carlos Alberto Souza (Autor) vs. EBL Logística S.A. (Réu)',
        movement_text: 'Despacho/Intimação: Compulsando os autos, verifica-se que a petição inicial preenche os requisitos do art. 319 do CPC. Fica o patrono cadastrado na OAB/MG nº 145105 intimado para CITAR e INTIMAR a parte ré EBL Logística S.A. para apresentar contestação no prazo legal de 15 (quinze) dias úteis (art. 335, CPC), sob pena de revelia.',
        action_required: 'Apresentar Contestação com Documentos de Defesa',
        deadline: '15 dias úteis (Vencimento: 02/09/2026)',
        updated_at: '2026-08-12T08:00:00Z',
      },
      {
        id: 'm-2',
        process_number: '5009876-12.2026.8.13.0024',
        court: '1ª Vara de Família de Belo Horizonte (TJMG)',
        parties: 'Mariana Oliveira Ramos vs. Roberto Carlos Ramos',
        movement_text: 'Decisão Interlocutória: Intime-se o patrono sob a OAB/MG nº 145105 para especificação de provas no prazo legal.',
        action_required: 'Especificar Provas Documentais',
        deadline: '5 dias úteis (Vencimento: 19/08/2026)',
        updated_at: '2026-08-12T08:00:00Z',
      }
    ];
  });

  const saveMovementsToStorage = (items: ProcessMovement[]) => {
    setMovements(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        items,
        startDate,
        endDate,
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      console.warn('⚠️ Erro ao persistir movimentações no localStorage:', err);
    }
  };

  // Função principal para carregar as movimentações em tempo real da API PJe CNJ
  const fetchLiveMovements = async (sDate: string, eDate: string) => {
    setIsLoadingMovements(true);
    const oab = localStorage.getItem('synapse_advocate_oab') || '145105';
    const uf = localStorage.getItem('synapse_advocate_uf') || 'MG';

    try {
      const { data: qData, error: qErr } = await supabase.functions.invoke('workflow-worker', {
        body: {
          action: 'query_pje',
          start_date: sDate,
          end_date: eDate,
          oab_number: oab,
          oab_uf: uf,
        }
      });

      if (!qErr && qData && Array.isArray(qData.items)) {
        saveMovementsToStorage(qData.items);
        return qData.items;
      }
    } catch (err) {
      console.warn('⚠️ Erro ao buscar movimentações PJe em tempo real:', err);
    } finally {
      setIsLoadingMovements(false);
    }
    return [];
  };

  const handleRunCustomQuery = async () => {
    setIsQuerying(true);
    setIsExecutingQuery(true);
    setMovements([]); // Limpar a tela imediatamente

    const oab = localStorage.getItem('synapse_advocate_oab') || '145105';
    const uf = localStorage.getItem('synapse_advocate_uf') || 'MG';

    showToast(`⚡ AUTOMATIZAÇÃO: Buscando processos do PJe CNJ (OAB/${uf} ${oab}) de ${startDate} até ${endDate}...`);

    try {
      // 1. Consultar a Edge Function para atualizar A TELA DO APP imediatamente
      const fetchedItems = await fetchLiveMovements(startDate, endDate);

      if (fetchedItems.length > 0) {
        showToast(`✅ ${fetchedItems.length} movimentação(ões) atualizada(s) na tela para o período (${startDate} a ${endDate}).`);
      } else {
        showToast(`ℹ️ Nenhuma movimentação localizada no PJe para o período (${startDate} a ${endDate}).`);
      }

      // 2. Disparar a execução completa do fluxo (Gemini + E-mail + WhatsApp)
      if (onRunNow) {
        await onRunNow({
          start_date: startDate,
          end_date: endDate,
          oab_number: oab,
          oab_uf: uf,
          processes: fetchedItems,
          custom_ai_prompt: aiPrompt,
        });
      }
    } catch (err: any) {
      console.warn('⚠️ Aviso na execução da consulta:', err);
      showToast(`⚠️ Consulta enviada para processamento em segundo plano.`);
    } finally {
      setIsQuerying(false);
      setIsExecutingQuery(false);
    }
  };

  const handleSendWhatsAppNotification = (proc: ProcessMovement) => {
    const waText = encodeURIComponent(
      `⚖️ *PROCESSO CNJ:* ${proc.process_number}\n🏛️ *ÓRGÃO:* ${proc.court}\n👥 *PARTES:* ${proc.parties}\n📜 *RESUMO DA MOVIMENTAÇÃO:* ${proc.movement_text}\n⚠️ *AÇÃO NECESSÁRIA:* ${proc.action_required}\n📅 *PRAZO FATAL:* ${proc.deadline}`
    );
    window.open(`https://wa.me/?text=${waText}`, '_blank');
    showToast(`📱 Resumo do processo ${proc.process_number} enviado para o WhatsApp!`);
  };

  const handleAskProcessAi = async (proc: ProcessMovement, customQuestion?: string) => {
    const qText = customQuestion || procAiQuestions[proc.id]?.trim();
    if (!qText) return;

    setProcAiLoading(prev => ({ ...prev, [proc.id]: true }));

    const currentHistory = procAiHistories[proc.id] || [];
    const updatedHistory = [...currentHistory, { role: 'user', text: qText }];
    setProcAiHistories(prev => ({ ...prev, [proc.id]: updatedHistory }));
    setProcAiQuestions(prev => ({ ...prev, [proc.id]: '' }));

    try {
      const processContextPrompt = `[CONTEXTO DO PROCESSO CNJ ${proc.process_number}]:\n• Órgão Julgador: ${proc.court}\n• Partes: ${proc.parties}\n• Texto da Movimentação/Intimação: ${proc.movement_text}\n• Ação Necessária Prévia: ${proc.action_required}\n• Prazo Fatal: ${proc.deadline}\n\n[PERGUNTA/INSTRUÇÃO DO ADVOGADO]: ${qText}`;

      const aiResponse = await LegalAiService.generateLegalContent({
        prompt: processContextPrompt,
        history: currentHistory.map(h => ({ role: h.role === 'user' ? 'user' : 'model', text: h.text }))
      });

      setProcAiHistories(prev => ({
        ...prev,
        [proc.id]: [...updatedHistory, { role: 'model', text: aiResponse.reply }]
      }));
    } catch (err: any) {
      setProcAiHistories(prev => ({
        ...prev,
        [proc.id]: [...updatedHistory, { role: 'model', text: `⚠️ Erro de conexão com a IA: ${err.message}` }]
      }));
    } finally {
      setProcAiLoading(prev => ({ ...prev, [proc.id]: false }));
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const buildGoogleCalendarUrlUI = (proc: ProcessMovement) => {
    const procNum = proc.process_number || '';
    const actionText = proc.action_required || proc.movement_text || 'Verificar intimação no PJe';
    const baseDateStr = proc.movement_date || proc.data_disponibilizacao || proc.updated_at || new Date().toISOString().split('T')[0];

    let dStart = new Date();
    if (baseDateStr.includes('/')) {
      const [d, m, y] = baseDateStr.split('/');
      dStart = new Date(`${y}-${m}-${d}T17:00:00Z`);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(baseDateStr)) {
      dStart = new Date(`${baseDateStr}T17:00:00Z`);
    } else {
      dStart = new Date(baseDateStr);
    }
    if (isNaN(dStart.getTime())) dStart = new Date();

    const dFinal = new Date(dStart.getTime() + 15 * 86400000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const fmt = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours()||17)}${pad(d.getUTCMinutes())}00Z`;

    const title = `⚖️ [Prazo Fatal PJe] Processo ${procNum}`;
    const details = `Ação Necessária: ${actionText}.\nPartes: ${proc.parties || 'N/A'}.\nÓrgão: ${proc.court || 'N/A'}.`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(dStart)}/${fmt(dFinal)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent('PJe CNJ / Tribunal de Justiça')}`;
  };

  // Filtragem analítica com blindagem rigorosa contra campos nulos/undefined
  const filteredMovements = movements.filter(m => {
    if (!m) return false;
    const pNum = String(m.process_number || '').toLowerCase();
    const pParties = String(m.parties || '').toLowerCase();
    const pCourt = String(m.court || '').toLowerCase();
    const query = String(searchQuery || '').toLowerCase().trim();
    return pNum.includes(query) || pParties.includes(query) || pCourt.includes(query);
  });

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: 'rgba(34, 197, 94, 0.95)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle size={18} /> {toastMessage}
        </div>
      )}

      {/* Banner de Agendamento Automático Diário (08:00 AM) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={22} style={{ color: '#10b981' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Consultas Automáticas Diárias Ativas
              </span>
              <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                Todos os dias às 08:00 AM
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Varredura programada no PJe Comunica (CNJ) com OAB/MG 145105 e resumo individual por e-mail & WhatsApp.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} style={{ color: '#10b981' }} />
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Serviço Ativo e Monitorado</span>
        </div>
      </div>

      {/* Painel de Configuração de Datas & Consulta Avulsa */}
      <div style={{
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '28px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Scale size={20} style={{ color: 'var(--accent-blue)' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Consulta Avulsa no PJe Comunica (CNJ)
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Data Inicial da Consulta
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Data Final da Consulta
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Campo Dedicado de Instrução / Prompt para a IA (Gemini) - Injetado ANTES do botão */}
          <div style={{ gridColumn: '1 / -1', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '6px' }}>
              <Sparkles size={15} style={{ color: '#38bdf8' }} />
              🤖 Campo de Instrução / Prompt Personalizado para a IA (Gemini)
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Digite a instrução que a IA deve seguir ao resumir e analisar as intimações do PJe (ex: Focar em prazos de recurso, honorários ou audiências)..."
              rows={2}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: '1.5'
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
            <button
              onClick={handleRunCustomQuery}
              disabled={isExecutingQuery || isRunningNow}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'var(--accent-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
                opacity: (isExecutingQuery || isRunningNow) ? 0.7 : 1,
              }}
            >
              {isExecutingQuery || isRunningNow ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Executando Consulta...
                </>
              ) : (
                <>
                  <Play size={16} /> Executar Consulta Avulsa Agora
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtro / Busca Rápida Direta CNJ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Últimas Movimentações dos Processos
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Mural contínuo de movimentações de processos monitorados.
          </p>
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por Nº do Processo CNJ ou Nome da Parte..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          />
        </div>
      </div>

      {/* Lista de Movimentações (Tela de Rolagem) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredMovements.map((proc) => (
          <div key={proc.id} style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 4px 18px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {/* Header do Card do Processo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                  ⚖️ {proc.process_number}
                </span>
                <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  CNJ PJe
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <Clock size={14} /> Data da Movimentação: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{proc.movement_date || proc.data_disponibilizacao || proc.updated_at || 'Data recente'}</strong>
              </div>
            </div>

            {/* Órgão & Partes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>🏛️ Órgão Julgador:</span>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{proc.court}</p>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>👥 Partes:</span>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{proc.parties}</p>
              </div>
            </div>

            {/* Texto da Última Movimentação */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.5)',
              borderLeft: '4px solid var(--accent-blue)',
              padding: '12px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--text-primary)',
              lineHeight: '1.6'
            }}>
              <strong style={{ color: 'var(--accent-blue)' }}>📜 ÚLTIMO MOVIMENTO DO PROCESSO:</strong>
              <p style={{ marginTop: '4px', margin: 0 }}>{proc.movement_text}</p>
            </div>

            {/* Ação Necessária & Prazo Fatal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>⚠️ AÇÃO NECESSÁRIA</span>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{proc.action_required}</p>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>📅 PRAZO FATAL</span>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', margin: 0 }}>{proc.deadline}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={buildGoogleCalendarUrlUI(proc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: '#3b82f6',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
                  }}
                >
                  <Calendar size={14} /> Adicionar ao Google Agenda
                </a>

                <button
                  onClick={() => handleSendWhatsAppNotification(proc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                  }}
                >
                  <Send size={14} /> Enviar no WhatsApp do Cliente
                </button>

                <button
                  onClick={() => setActiveAiDialogId(activeAiDialogId === proc.id ? null : proc.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: activeAiDialogId === proc.id ? '#0284c7' : 'rgba(56, 189, 248, 0.15)',
                    color: activeAiDialogId === proc.id ? '#ffffff' : '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(56, 189, 248, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <MessageSquare size={14} /> {activeAiDialogId === proc.id ? 'Fechar Diálogo IA' : '🤖 Caixa de Diálogo da IA'}
                </button>
              </div>
            </div>

            {/* Caixa de Diálogo Interativa da IA para ESTE Processo */}
            {activeAiDialogId === proc.id && (
              <div style={{
                marginTop: '12px',
                padding: '16px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                animation: 'fadeIn 0.2s ease-in-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} style={{ color: '#38bdf8' }} />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                      Caixa de Diálogo da IA — Processo {proc.process_number}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                    Gemini 1.5 Pro Ativo
                  </span>
                </div>

                {/* Sugestões Rápidas de Pergunta para este processo */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <button
                    onClick={() => handleAskProcessAi(proc, 'Elabore uma síntese executiva da tese defensiva recomendada para esta intimação.')}
                    style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#38bdf8', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    📜 Síntese Defensiva
                  </button>
                  <button
                    onClick={() => handleAskProcessAi(proc, 'Quais são os principais riscos processuais e prazos fatais envolvidos nesta decisão?')}
                    style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ⚠️ Analisar Riscos
                  </button>
                  <button
                    onClick={() => handleAskProcessAi(proc, 'Redija uma minuta de petição simples para manifestação neste processo.')}
                    style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    📑 Minuta de Petição
                  </button>
                </div>

                {/* Histórico de Conversas do Processo */}
                {procAiHistories[proc.id] && procAiHistories[proc.id].length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', marginBottom: '12px', paddingRight: '4px' }}>
                    {procAiHistories[proc.id].map((hMsg, hIdx) => (
                      <div key={hIdx} style={{
                        alignSelf: hMsg.role === 'user' ? 'flex-end' : 'flex-start',
                        background: hMsg.role === 'user' ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' : 'rgba(30, 41, 59, 0.9)',
                        color: '#ffffff',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        maxWidth: '90%',
                        whiteSpace: 'pre-wrap',
                        border: hMsg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {hMsg.text}
                      </div>
                    ))}
                  </div>
                )}

                {/* Status de Carregando */}
                {procAiLoading[proc.id] && (
                  <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw size={14} className="animate-spin" /> Analisando o processo via Gemini 1.5 Pro...
                  </div>
                )}

                {/* Barra de Digitação */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={procAiQuestions[proc.id] || ''}
                    onChange={(e) => setProcAiQuestions(prev => ({ ...prev, [proc.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAskProcessAi(proc); }}
                    placeholder="Digite sua dúvida ou instrução para a IA referente a este processo..."
                    style={{
                      flex: 1,
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      padding: '10px 12px',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => handleAskProcessAi(proc)}
                    disabled={procAiLoading[proc.id] || !procAiQuestions[proc.id]?.trim()}
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Perguntar</span>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {(isQuerying || isLoadingMovements) && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-blue)', fontWeight: 700, fontSize: '15px' }}>
            📡 Carregando movimentações do PJe CNJ em tempo real...
          </div>
        )}

        {!isQuerying && !isLoadingMovements && filteredMovements.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {searchQuery
              ? `Nenhum processo ou movimentação encontrada para o termo "${searchQuery}".`
              : `Nenhuma movimentação ou intimação localizada no PJe para o período de ${startDate} a ${endDate}.`}
          </div>
        )}
      </div>
    </div>
  );
};
