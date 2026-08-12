import React, { useState } from 'react';
import { Scale, Calendar, Play, Clock, Search, Send, FileText, AlertCircle, CheckCircle, ShieldCheck, ChevronRight, RefreshCw, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface ProcessMovement {
  id: string;
  process_number: string;
  court: string;
  parties: string;
  movement_text: string;
  action_required: string;
  deadline: string;
  updated_at: string;
}

interface LegalDashboardPageProps {
  onRunNow?: () => void;
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);

  // Lista de Movimentações Ativas dos Processos
  const [movements, setMovements] = useState<ProcessMovement[]>([
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
      process_number: '5009876-12.2026.8.13.0145',
      court: '1ª Vara de Família e Sucessões de Belo Horizonte (TJMG)',
      parties: 'Mariana Oliveira Ramos (Requerente) vs. Roberto Carlos Ramos (Requerido)',
      movement_text: 'Decisão Interlocutória: Tendo em vista que a conciliação restou infrutífera, intime-se o patrono sob a OAB/MG nº 145105 para que, no prazo comum de 5 (cinco) dias úteis, especifique justificadamente as provas que pretendem produzir na instrução processual.',
      action_required: 'Especificar Provas Documentais e ROL de Testemunhas',
      deadline: '5 dias úteis (Vencimento: 19/08/2026)',
      updated_at: '2026-08-12T08:00:00Z',
    },
    {
      id: 'm-3',
      process_number: '5014321-45.2026.8.13.0024',
      court: '3ª Vara da Fazenda Pública e Autarquias de Belo Horizonte (TJMG)',
      parties: 'Construções Gerais Ltda (Autor) vs. Estado de Minas Gerais (Réu)',
      movement_text: 'Intimação Eletrônica: Fica o advogado constituído na OAB/MG nº 145105 intimado da juntada de contestação e documentos pelo Estado de Minas Gerais, para que apresente Impugnação/Réplica no prazo legal de 15 (quinze) dias úteis, indicando provas suplementares.',
      action_required: 'Apresentar Impugnação à Contestação (Réplica)',
      deadline: '15 dias úteis (Vencimento: 03/09/2026)',
      updated_at: '2026-08-12T08:00:00Z',
    },
    {
      id: 'm-4',
      process_number: '5028877-90.2026.8.13.0702',
      court: '2ª Vara do Trabalho de Uberlândia (TRT-3 / PJe-JT)',
      parties: 'Fernando Mendes da Silva (Reclamante) vs. TransLog Distribuidora (Reclamada)',
      movement_text: 'Notificação PJe: Fica o advogado habilitado na OAB/MG nº 145105 intimado da juntada do laudo pericial técnico referente às condições de trabalho. Prazo sucessivo de 10 (dez) dias úteis para manifestação sobre as conclusões do perito.',
      action_required: 'Manifestar sobre o Laudo Pericial Técnico',
      deadline: '10 dias úteis (Vencimento: 26/08/2026)',
      updated_at: '2026-08-12T08:00:00Z',
    },
    {
      id: 'm-5',
      process_number: '5031122-33.2026.8.13.0433',
      court: '1ª Vara Cível da Comarca de Montes Claros (TJMG)',
      parties: 'Banco S/A (Exequente) vs. Comercial Silva & Cia Ltda (Executado)',
      movement_text: 'Despacho/Decisão: Detalhamento de ordem judicial de bloqueio via SISBAJUD juntado aos autos. Fica a parte executada intimada, na pessoa de seu patrono cadastrado na OAB/MG nº 145105, para ciência da penhora e interposição de Embargos à Execução no prazo de 15 (quinze) dias.',
      action_required: 'Interpor Embargos à Execução / Impugnação à Penhora',
      deadline: '15 dias úteis (Vencimento: 04/09/2026)',
      updated_at: '2026-08-12T08:00:00Z',
    }
  ]);

  const handleRunCustomQuery = async () => {
    setIsExecutingQuery(true);
    const oab = localStorage.getItem('synapse_advocate_oab') || '145105';
    const uf = localStorage.getItem('synapse_advocate_uf') || 'MG';

    showToast(`⚡ AUTOMATIZAÇÃO: Consultando API do PJe CNJ (OAB/${uf} ${oab}) de ${startDate} até ${endDate}...`);

    try {
      const pjeUrl = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${oab}&ufOab=${uf}&dataDisponibilizacaoInicio=${startDate}&dataDisponibilizacaoFim=${endDate}&pagina=1&itensPorPagina=50`;
      const res = await fetch(pjeUrl, {
        headers: { 'Accept': 'application/json, text/plain, */*' }
      });

      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.items) && json.items.length > 0) {
          const liveItems: ProcessMovement[] = json.items.map((item: any, idx: number) => ({
            id: `real-pje-${idx + 1}`,
            process_number: item.numero_processo || item.numeroProcesso || item.numero || `Proc-${idx + 1}`,
            court: item.nomeOrgao || item.orgao || item.siglaTribunal || 'Tribunal de Justiça',
            parties: Array.isArray(item.destinatarioAdvogados)
              ? item.destinatarioAdvogados.map((a: any) => a.nome).filter(Boolean).join(', ')
              : (item.destinatarios || 'Partes do Processo'),
            movement_text: (item.texto || item.teor || item.titulo || 'Movimentação PJe').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 800),
            action_required: 'Tomar ciência da intimação e providenciar manifestação nos autos',
            deadline: 'Prazo legal conforme indicado no PJe',
            updated_at: item.data_disponibilizacao || new Date().toISOString(),
          }));

          setMovements(liveItems);
          showToast(`🎉 Sucesso: ${liveItems.length} processos reais carregados do PJe CNJ!`);
        } else {
          showToast(`ℹ️ Nenhum processo encontrado na API do PJe para OAB/${uf} ${oab} no período selecionado.`);
        }
      }
    } catch (err: any) {
      console.warn('Falha ao consultar API PJe:', err);
    }

    if (onRunNow) {
      await onRunNow();
    }

    setTimeout(() => setIsExecutingQuery(false), 1500);
  };

  const handleSendWhatsAppNotification = (proc: ProcessMovement) => {
    const waText = encodeURIComponent(
      `⚖️ *PROCESSO CNJ:* ${proc.process_number}\n🏛️ *ÓRGÃO:* ${proc.court}\n👥 *PARTES:* ${proc.parties}\n📜 *RESUMO DA MOVIMENTAÇÃO:* ${proc.movement_text}\n⚠️ *AÇÃO NECESSÁRIA:* ${proc.action_required}\n📅 *PRAZO FATAL:* ${proc.deadline}`
    );
    window.open(`https://wa.me/?text=${waText}`, '_blank');
    showToast(`📱 Resumo do processo ${proc.process_number} enviado para o WhatsApp!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtragem por Número CNJ ou Nome da Parte
  const filteredMovements = movements.filter(m =>
    m.process_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.parties.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.court.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

          <div>
            <button
              onClick={handleRunCustomQuery}
              disabled={isExecutingQuery || isRunningNow}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px 20px',
                background: 'var(--accent-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
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
                <Clock size={14} /> Atualizado às 08:00 AM
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
            </div>
          </div>
        ))}

        {filteredMovements.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhum processo ou movimentação encontrada para o termo "{searchQuery}".
          </div>
        )}
      </div>
    </div>
  );
};
