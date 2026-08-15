import React, { useState, useEffect } from 'react';
import { Scale, Calendar, Play, Clock, Search, Send, FileText, AlertCircle, CheckCircle, ShieldCheck, ChevronRight, RefreshCw, MessageSquare, Sparkles, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LegalAiService } from '../services/LegalAiService';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';

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
  currentProfile?: any;
  onRunNow?: (customContext?: Record<string, any>) => Promise<any>;
  isRunningNow?: boolean;
}

export const LegalDashboardPage: React.FC<LegalDashboardPageProps> = ({
  currentProfile,
  onRunNow,
  isRunningNow = false,
}) => {
  // Injeção Real de Dados (Context Hydration do Supabase sem Fallbacks Falsos)
  const [profileState, setProfileState] = useState<{
    email: string;
    fullName: string;
    oabNumber: string;
    oabUf: string;
  }>({
    email: currentProfile?.email || '',
    fullName: currentProfile?.full_name || '',
    oabNumber: currentProfile?.oab_number || (typeof window !== 'undefined' ? localStorage.getItem('synapse_advocate_oab') || '' : ''),
    oabUf: currentProfile?.oab_uf || (typeof window !== 'undefined' ? localStorage.getItem('synapse_advocate_uf') || 'MG' : 'MG'),
  });

  useEffect(() => {
    async function loadRealProfileFromSupabase() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, oab_number, oab_uf, email')
            .eq('id', user.id)
            .single();

          if (prof) {
            setProfileState({
              email: prof.email || user.email || '',
              fullName: prof.full_name || '',
              oabNumber: prof.oab_number || '',
              oabUf: prof.oab_uf || 'MG',
            });
          }
        }
      } catch (err) {
        console.warn('⚠️ Erro ao hidratar perfil do advogado no Supabase:', err);
      }
    }
    loadRealProfileFromSupabase();
  }, [currentProfile]);

  const lawyerEmail = profileState.email || currentProfile?.email || '';
  const lawyerName = profileState.fullName || currentProfile?.full_name || '';
  const lawyerOab = profileState.oabNumber || currentProfile?.oab_number || '';
  const lawyerUf = profileState.oabUf || currentProfile?.oab_uf || 'MG';

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
  const STORAGE_KEY = `synapse_pje_last_search_${lawyerOab}`;

  // Inicializar estado com a última pesquisa persistida no localStorage (padrão: array vazio)
  const [movements, setMovements] = useState<ProcessMovement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.items)) {
          return parsed.items;
        }
      }
    } catch (err) {
      console.warn('⚠️ Falha ao restaurar última pesquisa do localStorage:', err);
    }
    return [];
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

  // Função principal para carregar as movimentações em tempo real da API PJe CNJ (com Injeção Automática de Dados)
  const fetchLiveMovements = async (sDate: string, eDate: string) => {
    setIsLoadingMovements(true);
    // Limpar o estado local imediatamente antes de buscar novos dados para evitar acumular itens antigos
    setMovements([]);

    try {
      console.log(`📡 [PJE CNJ CLIENT] Solicitando busca para OAB/${lawyerUf} ${lawyerOab} (Email: ${lawyerEmail})...`);
      const { data: qData, error: qErr } = await supabase.functions.invoke('workflow-worker', {
        body: {
          action: 'query_pje',
          start_date: sDate,
          end_date: eDate,
          oab_number: lawyerOab,
          oab_uf: lawyerUf,
          lawyer_email: lawyerEmail,
          lawyer_name: lawyerName
        }
      });

      if (qErr) {
        console.error('❌ [PJE CNJ CLIENT ERROR] Erro na requisição à Edge Function:', qErr);
        showToast(`❌ Erro na consulta do PJe: ${qErr.message || 'Falha de comunicação com o servidor'}`);
        return [];
      }

      if (qData && Array.isArray(qData.items)) {
        // DEDUPLICAÇÃO NO FRONTEND: Filtrar itens repetidos por processo + data + trecho da movimentação
        const seen = new Set<string>();
        const uniqueItems = qData.items.filter((item: ProcessMovement) => {
          if (!item || !item.process_number) return false;
          const key = `${item.process_number}_${item.movement_date || item.data_disponibilizacao}_${String(item.movement_text || '').slice(0, 40)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        console.log(`✅ [PJE CNJ CLIENT SUCCESS] ${uniqueItems.length} movimentações únicas obtidas (após deduplicação).`);
        saveMovementsToStorage(uniqueItems);
        return uniqueItems;
      }
    } catch (err: any) {
      console.error('❌ [PJE CNJ CLIENT EXCEPTION] Exceção na busca em tempo real:', err);
      showToast(`⚠️ Erro ao conectar ao PJe CNJ: ${err.message || 'Falha de rede'}`);
    } finally {
      setIsLoadingMovements(false);
    }
    return [];
  };

  const handleRunCustomQuery = async () => {
    setIsQuerying(true);
    setIsExecutingQuery(true);
    setMovements([]); // Limpar a tela imediatamente

    showToast(`⚡ AUTOMATIZAÇÃO: Buscando processos do PJe CNJ (OAB/${lawyerUf} ${lawyerOab}) de ${startDate} até ${endDate}...`);

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
          oab_number: lawyerOab,
          oab_uf: lawyerUf,
          lawyer_email: lawyerEmail,
          lawyer_name: lawyerName,
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

  // 📱 CRUZAMENTO DINÂMICO DE DADOS DE CLIENTES PARA WHATSAPP
  const handleSendWhatsAppNotification = async (proc: ProcessMovement) => {
    let targetPhone = '';
    let matchedClientName = '';

    try {
      // Buscar clientes cadastrados na tabela do PostgreSQL ou localStorage
      const { data: dbClients } = await supabase.from('clients').select('*');
      let clientList: any[] = dbClients || [];

      if (clientList.length === 0 && typeof window !== 'undefined') {
        const saved = localStorage.getItem('synapse_clients_data');
        if (saved) {
          try { clientList = JSON.parse(saved); } catch (e) {}
        }
      }

      // Cruzamento de dados entre o nome das partes (proc.parties) e o nome do cliente cadastrado
      const lowerParties = proc.parties.toLowerCase();
      const matchedClient = clientList.find((c) => {
        if (!c.name || c.name.trim().length < 3) return false;
        return lowerParties.includes(c.name.toLowerCase().trim());
      });

      if (matchedClient && matchedClient.phone) {
        targetPhone = matchedClient.phone.replace(/\D/g, '');
        matchedClientName = matchedClient.name;
        console.log(`🎯 [CLIENT MATCH WHATSAPP] Correspondência encontrada: ${matchedClient.name} (${matchedClient.phone})`);
      }
    } catch (err) {
      console.warn('⚠️ Erro ao efetuar cruzamento de clientes para WhatsApp:', err);
    }

    const waText = encodeURIComponent(
      `⚖️ *PROCESSO CNJ:* ${proc.process_number}\n🏛️ *ÓRGÃO:* ${proc.court}\n👥 *PARTES:* ${proc.parties}\n📜 *RESUMO DA MOVIMENTAÇÃO:* ${proc.movement_text}\n⚠️ *AÇÃO NECESSÁRIA:* ${proc.action_required}\n📅 *PRAZO FATAL:* ${proc.deadline}\n\n👨‍💼 *ADVOGADO RESPONSÁVEL:* ${lawyerName} (OAB/${lawyerUf} ${lawyerOab})`
    );

    const waUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${waText}` : `https://wa.me/?text=${waText}`;
    window.open(waUrl, '_blank');

    if (matchedClientName) {
      showToast(`📱 Resumo do processo enviado diretamente para o WhatsApp de ${matchedClientName} (${targetPhone})!`);
    } else {
      showToast(`📱 Resumo do processo ${proc.process_number} preparado para envio no WhatsApp!`);
    }
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
      const processContextPrompt = `[CONTEXTO DO PROCESSO CNJ ${proc.process_number}]:
• Advogado Responsável: ${lawyerName} (OAB/${lawyerUf} ${lawyerOab})
• E-mail do Advogado: ${lawyerEmail}
• Órgão Julgador: ${proc.court}
• Partes: ${proc.parties}
• Texto da Movimentação/Intimação: ${proc.movement_text}
• Ação Necessária Prévia: ${proc.action_required}
• Prazo Fatal: ${proc.deadline}

[PERGUNTA/INSTRUÇÃO DO ADVOGADO]: ${qText}`;

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

  const buildAgnosticCalendarUrlsUI = (proc: ProcessMovement) => {
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
    const location = 'PJe CNJ / Tribunal de Justiça';

    const cleanNum = procNum.replace(/\D/g, '') || 'proc';
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Synapse IPaaS Legal//PT',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:pje-${cleanNum}-${Date.now()}@synapse.legal`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(dStart)}`,
      `DTEND:${fmt(dFinal)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details.replace(/\n/g, '\\n')}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(dStart)}/${fmt(dFinal)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
    const outlookWebUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(title)}&startdt=${dStart.toISOString()}&enddt=${dFinal.toISOString()}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
    const icsDataUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;

    return {
      gCalUrl,
      outlookWebUrl,
      icsDataUrl,
      icsFileName: `prazo_processo_${cleanNum}.ics`
    };
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

  const handlePullRefresh = async () => {
    setIsExecutingQuery(true);
    await fetchLiveMovements(startDate, endDate);
    showToast('✨ Dados e movimentações do CNJ recarregados com sucesso!');
    setIsExecutingQuery(false);
  };

  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handlePullRefresh,
  });

  return (
    <div ref={containerRef} className="w-full max-w-full overflow-x-hidden min-w-0 box-border" style={{ flex: 1, padding: '24px', width: '100%', maxWidth: '100%', overflowX: 'hidden', overflowY: 'auto', background: 'var(--bg-primary)', boxSizing: 'border-box' }}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
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
              Varredura programada no PJe Comunica (CNJ) com {lawyerOab ? `OAB/${lawyerUf} ${lawyerOab}` : 'sua OAB cadastrada'} e resumo individual por e-mail & WhatsApp.
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

          {/* Indicador Visual Silencioso do Destinatário Automático do Resumo */}
          <div style={{
            gridColumn: '1 / -1',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12.5px',
            color: '#38bdf8',
            fontWeight: 600,
            marginTop: '4px'
          }}>
            <Mail size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
            <span>
              📧 O resumo das movimentações será enviado automaticamente para o seu e-mail registrado (<strong>{lawyerEmail || 'advogado@synapse.law'}</strong>) para revisão.
            </span>
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
                transition: 'all 0.2s ease',
              }}
            >
              {(isExecutingQuery || isRunningNow) ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Consultando PJe CNJ e Gerando Resumo...</span>
                </>
              ) : (
                <>
                  <Play size={18} />
                  <span>Executar Consulta PJe & Disparar Automação</span>
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
        {filteredMovements.length === 0 ? (
          <div style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 18px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <Scale size={32} style={{ color: 'var(--accent-blue)' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Nenhuma intimação ou processo localizado
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '460px', margin: '6px auto 0' }}>
                Digite o período inicial e final no painel acima e clique em <strong>Executar Consulta Avulsa Agora</strong> para varrer o PJe CNJ da sua OAB.
              </p>
            </div>
          </div>
        ) : (
          filteredMovements.map((proc) => (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '100%', overflow: 'hidden' }}>
                <span className="truncate break-all" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-blue)', fontFamily: 'monospace', wordBreak: 'break-all', overflowWrap: 'anywhere', maxWidth: '100%' }}>
                  ⚖️ {proc.process_number}
                </span>
                <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600, flexShrink: 0 }}>
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
                {(() => {
                  const calUrls = buildAgnosticCalendarUrlsUI(proc);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <a
                        href={calUrls.icsDataUrl}
                        download={calUrls.icsFileName}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          background: '#0284c7',
                          color: '#fff',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
                        }}
                        title="Baixar convite .ics (compatível com Apple Calendar, Outlook, Thunderbird, iOS e Android)"
                      >
                        <Calendar size={14} /> 🍏 Apple / iCal (.ics)
                      </a>

                      <a
                        href={calUrls.gCalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          background: '#3b82f6',
                          color: '#fff',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
                        }}
                        title="Adicionar diretamente no Google Agenda Web"
                      >
                        🌐 Google Agenda
                      </a>

                      <a
                        href={calUrls.outlookWebUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          background: '#0078d4',
                          color: '#fff',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 2px 8px rgba(0, 120, 212, 0.4)',
                        }}
                        title="Adicionar diretamente no Outlook / Office 365 Web"
                      >
                        💻 Outlook
                      </a>
                    </div>
                  );
                })()}

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
        )))}

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
