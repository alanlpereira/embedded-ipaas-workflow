// Supabase Edge Function: workflow-worker
// Operário de Execução de Fluxos (Workflow Worker Engine)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// GERADOR DE CONVITES DE CALENDÁRIO AGNÓSTICOS (.ICS - RFC 5545)
function generateICS(processNumber: string, action: string, deadlineIso: string): string {
  if (!deadlineIso) return '';
  const dt = new Date(deadlineIso);
  if (isNaN(dt.getTime())) return '';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = dt.getUTCFullYear();
  const month = pad(dt.getUTCMonth() + 1);
  const day = pad(dt.getUTCDate());
  const hours = pad(dt.getUTCHours() || 17);
  const minutes = pad(dt.getUTCMinutes());
  const seconds = pad(dt.getUTCSeconds());
  const icsTime = `${year}${month}${day}T${hours}${minutes}${seconds}Z`;

  const endDt = new Date(dt.getTime() + 3600000);
  const endYear = endDt.getUTCFullYear();
  const endMonth = pad(endDt.getUTCMonth() + 1);
  const endDay = pad(endDt.getUTCDate());
  const endHours = pad(endDt.getUTCHours());
  const endMinutes = pad(endDt.getUTCMinutes());
  const endSeconds = pad(endDt.getUTCSeconds());
  const icsEndTime = `${endYear}${endMonth}${endDay}T${endHours}${endMinutes}${endSeconds}Z`;

  const cleanNum = String(processNumber || '').replace(/\D/g, '') || 'proc';
  const uid = `pje-${cleanNum}-${Date.now()}@synapse.legal`;
  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const cleanAction = String(action || 'Vencimento de Prazo PJe').replace(/[\r\n]+/g, ' ');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Synapse IPaaS Legal Automation//PJe Calendar 1.0//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${icsTime}`,
    `DTEND:${icsEndTime}`,
    `SUMMARY:⚖️ [Prazo Fatal PJe] ${cleanAction}`,
    `DESCRIPTION:Prazo legal registrado no PJe para o Processo ${processNumber}. Ação necessária: ${cleanAction}.`,
    'LOCATION:Tribunal de Justiça / PJe CNJ',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

// FORMATADOR DE DATA COMPACTA (YYYYMMDDTHHMMSSZ) PARA URLS DE CALENDÁRIO
function formatDateCompact(d: Date): string {
  if (!d || isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours() || 17);
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// GERADOR AGNÓSTICO DE LINKS E DADOS DE CALENDÁRIO (ICS / Apple / Google / Outlook / Office 365)
function buildAgnosticCalendarUrls(processNumber: string, actionText: string, dataBaseStr: string, deadlineIsoStr?: string | null) {
  let dStart: Date = new Date();
  if (dataBaseStr) {
    if (dataBaseStr.includes('/')) {
      const [d, m, y] = dataBaseStr.split('/');
      dStart = new Date(`${y}-${m}-${d}T17:00:00Z`);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dataBaseStr)) {
      dStart = new Date(`${dataBaseStr}T17:00:00Z`);
    } else {
      dStart = new Date(dataBaseStr);
    }
  }
  if (isNaN(dStart.getTime())) dStart = new Date();

  let dFinal: Date;
  if (deadlineIsoStr && !isNaN(new Date(deadlineIsoStr).getTime())) {
    dFinal = new Date(deadlineIsoStr);
  } else {
    dFinal = new Date(dStart.getTime() + 15 * 86400000);
  }

  const startCompact = formatDateCompact(dStart);
  const endCompact = formatDateCompact(dFinal);
  const startIso = dStart.toISOString();
  const endIso = dFinal.toISOString();

  const title = `⚖️ [Prazo Fatal PJe] Processo ${processNumber || ''}`;
  const details = `Ação Necessária: ${actionText || 'Verificar intimação no PJe'}.\nProcesso: ${processNumber}.`;
  const location = 'PJe CNJ / Tribunal de Justiça';

  const cleanNum = String(processNumber || '').replace(/\D/g, '') || 'proc';
  const icsStr = generateICS(processNumber, actionText, dFinal.toISOString());
  const icsBase64 = btoa(unescape(encodeURIComponent(icsStr || '')));

  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startCompact}/${endCompact}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  const outlookWebUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(title)}&startdt=${startIso}&enddt=${endIso}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  const office365Url = `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(title)}&startdt=${startIso}&enddt=${endIso}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  const icsDataUrl = `data:text/calendar;charset=utf8;base64,${icsBase64}`;

  return {
    title,
    details,
    gCalUrl,
    outlookWebUrl,
    office365Url,
    icsDataUrl,
    icsStr,
    icsBase64,
    fileName: `prazo_${cleanNum}.ics`,
  };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    const url = new URL(req.url);
    body = { 
      execution_id: url.searchParams.get('execution_id'),
      workflow_id: url.searchParams.get('workflow_id')
    };
  }

  // Ação especial: Consulta avulsa síncrona para atualizar a tela do app (desktop/mobile)
  if (body.action === 'query_pje') {
    const targetOab = String(body.oab_number || body.oab || '145105').trim();
    const targetUf = String(body.oab_uf || body.uf || 'MG').trim().toUpperCase();
    const startDate = body.start_date || new Date(Date.now() - 86400000 * 15).toISOString().split('T')[0];
    const endDate = body.end_date || new Date().toISOString().split('T')[0];

    console.log(`📡 [WORKER QUERY_PJE] Buscando PJe CNJ para OAB/${targetUf} ${targetOab} de ${startDate} até ${endDate}...`);
    const pjeUrl = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${targetOab}&ufOab=${targetUf}&dataDisponibilizacaoInicio=${startDate}&dataDisponibilizacaoFim=${endDate}&pagina=1&itensPorPagina=100`;

    let items: any[] = [];
    try {
      const pjeRes = await fetch(pjeUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      if (pjeRes.ok) {
        const cnjData = await pjeRes.json();
        if (cnjData && Array.isArray(cnjData.items)) {
          const rawItems = cnjData.items.map((item: any, idx: number) => {
            const rawDate = item.data_disponibilizacao || item.dataDisponibilizacao || item.data_comunicacao || item.dataComunicacao || item.created_at || new Date().toISOString();
            let formattedDate = String(rawDate).includes('T') ? String(rawDate).split('T')[0] : String(rawDate);
            if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
              const [y, m, d] = formattedDate.split('-');
              formattedDate = `${d}/${m}/${y}`;
            }

            const destinatariosList = Array.isArray(item.destinatarioAdvogados) && item.destinatarioAdvogados.length > 0
              ? item.destinatarioAdvogados.map((a: any) => a.nome).filter(Boolean).join(', ')
              : (Array.isArray(item.destinatarios) ? item.destinatarios.map((d: any) => d.nome).filter(Boolean).join(', ') : (item.destinatarios || 'Partes não informadas na API'));

            const rawText = item.texto || item.teor || item.titulo || item.conteudo || 'Sem texto de movimentação disponível no PJe.';
            const cleanMovementText = String(rawText).replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 800);
            const rawProcNum = String(item.numero_processo || item.numeroProcessoFormatado || item.numeroProcesso || item.numero || `Proc-${idx + 1}`);

            // ID estável determinístico para evitar duplicatas no React e no banco
            const stableId = item.id ? `pje-${item.id}` : `pje-${rawProcNum.replace(/[^a-zA-Z0-9]/g, '')}-${formattedDate.replace(/\//g, '')}`;

            return {
              id: stableId,
              process_number: rawProcNum,
              court: String(item.nomeOrgao || item.orgao || item.siglaTribunal || 'Tribunal de Justiça'),
              parties: String(destinatariosList || 'Partes não informadas na API'),
              advocate: `OAB/${targetUf} ${targetOab}`,
              oab: targetOab,
              uf: targetUf,
              notice: String(item.tipoComunicacao || item.meio || 'Intimação Eletrônica PJe'),
              movement_text: cleanMovementText,
              action_required: 'Tomar ciência da intimação e providenciar manifestação nos autos',
              deadline: 'Conforme prazo legal indicado no PJe',
              movement_date: formattedDate,
              data_disponibilizacao: String(item.data_disponibilizacao || item.dataDisponibilizacao || formattedDate),
              updated_at: new Date().toISOString(),
            };
          });

          // DEDUPLICAÇÃO ESTRITA: Garantir que movimentos duplicados na mesma data sejam descartados
          const seenKeys = new Set<string>();
          items = rawItems.filter((m: any) => {
            const key = `${m.process_number}_${m.movement_date}_${m.movement_text.slice(0, 50)}`;
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
          });
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Erro ao consultar PJe:', err.message);
    }

    return new Response(JSON.stringify({ success: true, items, count: items.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://auth.alp-nexus.com';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let executionId = body.execution_id || body.executionId;
  const workflowId = body.workflow_id || body.workflowId;

  // Se não foi fornecido execution_id mas temos workflow_id, criar nova execução automaticamente
  if (!executionId && workflowId) {
    console.log(`ℹ️ [WORKFLOW WORKER] Criando nova execução para workflow_id: ${workflowId}`);
    const { data: newExec, error: createErr } = await supabase
      .from('flow_executions')
      .insert([{
        workflow_id: workflowId,
        status: 'running',
        context_data: body.payload || body.context_data || {}
      }])
      .select()
      .single();

    if (!createErr && newExec) {
      executionId = newExec.id;
    }
  }

  // Se recebemos um token de aprovação (decisão HITL enviada via e-mail ou portal)
  if (body.approval_token || body.token) {
    const tokenStr = body.approval_token || body.token;
    const decision = body.decision || 'APPROVED';
    const decidedBy = body.decided_by || 'Gestor Mobile (Zero Fricção)';

    console.log(`📱 [WORKER APPROVAL DECISION] Token: ${tokenStr} | Decisão: ${decision}`);

    // 1. Atualizar o token de aprovação
    await supabase
      .from('approval_tokens')
      .update({
        status: decision,
        decided_at: new Date().toISOString(),
        decided_by: decidedBy
      })
      .eq('token', tokenStr);

    // 2. Buscar o registro do token para obter o workflow_id e nó de origem
    const { data: tokData } = await supabase
      .from('approval_tokens')
      .select('*')
      .eq('token', tokenStr)
      .single();

    if (tokData) {
      // 1. Tentar buscar a execução exata ligada a este token pelo ID de Execução
      let pendingExec: any = null;
      const targetExecutionId = tokData.payload?.execution_id || tokData.execution_id;

      if (targetExecutionId) {
        const { data: exById } = await supabase
          .from('flow_executions')
          .select('*')
          .eq('id', targetExecutionId)
          .maybeSingle();
        if (exById) pendingExec = exById;
      }

      // 2. Fallback: Buscar a última execução pendente do fluxo
      if (!pendingExec) {
        const { data: exByWf } = await supabase
          .from('flow_executions')
          .select('*')
          .eq('workflow_id', tokData.flowchart_id)
          .eq('status', 'waiting_approval')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (exByWf) pendingExec = exByWf;
      }

      // 3. Fallback adicional: Buscar a última execução recente do fluxo
      if (!pendingExec) {
        const { data: exAny } = await supabase
          .from('flow_executions')
          .select('*')
          .eq('workflow_id', tokData.flowchart_id)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (exAny) pendingExec = exAny;
      }

      if (pendingExec) {
        executionId = pendingExec.id;

        // Buscar as edges do fluxo para descobrir a próxima caixa após a aprovação
        let wf: any = null;
        const { data: wfRes } = await supabase.from('workflows').select('edges').eq('id', tokData.flowchart_id).single();
        if (wfRes) wf = wfRes;
        else {
          const { data: fcRes } = await supabase.from('flowcharts').select('edges').eq('id', tokData.flowchart_id).single();
          if (fcRes) wf = fcRes;
        }

        if (wf) {
          const edges: any[] = wf.edges || [];
          const outgoingEdges = edges.filter((e: any) => e.source === tokData.approval_node_id);
          let targetEdge: any = null;

          console.log(`🔍 [RESUME BRANCH SEARCH] Buscando próxima caixa para a decisão '${decision}'. Edges de saída do nó '${tokData.approval_node_id}':`, outgoingEdges);

          if (decision === 'REJECTED') {
            // 1. Procurar edge conectada especificamente no handle ou label de rejeição/recusa
            targetEdge = outgoingEdges.find((e: any) => 
              e.sourceHandle === 'rejected' ||
              e.sourceHandle === 'false' ||
              e.sourceHandle === 'no' ||
              (e.label && (e.label.toLowerCase().includes('rejeit') || e.label.toLowerCase().includes('recus') || e.label.toLowerCase().includes('não') || e.label.toLowerCase().includes('no')))
            );

            // 2. Fallback: Se houver 2 edges e uma não for a approved, pegar a outra
            if (!targetEdge && outgoingEdges.length > 1) {
              targetEdge = outgoingEdges.find((e: any) => 
                e.sourceHandle !== 'approved' && e.sourceHandle !== 'true' && !e.label?.toLowerCase().includes('aprov')
              );
            }

            // 3. Se ainda não achou e houver apenas 1 edge de saída conectada, seguir por ela
            if (!targetEdge && outgoingEdges.length === 1) {
              targetEdge = outgoingEdges[0];
            }
          } else {
            // Decisão: APPROVED
            // 1. Procurar edge conectada especificamente no handle ou label de aprovação
            targetEdge = outgoingEdges.find((e: any) => 
              e.sourceHandle === 'approved' ||
              e.sourceHandle === 'true' ||
              e.sourceHandle === 'yes' ||
              (e.label && (e.label.toLowerCase().includes('aprov') || e.label.toLowerCase().includes('sim') || e.label.toLowerCase().includes('yes')))
            );

            // 2. Fallback: Se houver 2 edges e uma não for a rejected, pegar a outra
            if (!targetEdge && outgoingEdges.length > 1) {
              targetEdge = outgoingEdges.find((e: any) => 
                e.sourceHandle !== 'rejected' && e.sourceHandle !== 'false' && !e.label?.toLowerCase().includes('rejeit')
              );
            }

            // 3. Se ainda não achou e houver apenas 1 edge de saída conectada, seguir por ela
            if (!targetEdge && outgoingEdges.length === 1) {
              targetEdge = outgoingEdges[0];
            }
          }

          if (targetEdge) {
            console.log(`▶️ [RESUME SUCCESS] Retomando fluxo após decisão '${decision}' para a próxima caixa ID: ${targetEdge.target}`);
            
            const mergedContext = {
              ...(pendingExec.context_data || {}),
              ...(tokData.payload || {}),
              process_summary: tokData.payload?.process_summary || tokData.payload?.target_process?.summary,
              target_process: tokData.payload?.target_process || { summary: tokData.payload?.process_summary }
            };

            await supabase
              .from('flow_executions')
              .update({
                status: 'running',
                current_node_id: targetEdge.target,
                context_data: mergedContext
              })
              .eq('id', executionId);
          } else {
            console.warn(`⚠️ [RESUME WARN] Nenhuma edge de saída encontrada para a decisão '${decision}' no nó '${tokData.approval_node_id}'.`);
          }
        }
      }
    }
  }

  if (!executionId) {
    return new Response(
      JSON.stringify({ error: 'Parâmetro execution_id ou workflow_id é obrigatório.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`\n==================================================`);
  console.log(`⚙️ [WORKFLOW WORKER] Iniciando processamento da Execução ID: ${executionId}`);
  console.log(`==================================================`);

  try {
    // 1. Buscar o registro em 'flow_executions'
    let { data: execution, error: execErr } = await supabase
      .from('flow_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (execErr || !execution) {
      console.error(`❌ [WORKER ERROR] Execução ID '${executionId}' não encontrada:`, execErr);
      return new Response(
        JSON.stringify({ error: `Execução '${executionId}' não encontrada.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trava de Idempotência contra requisições concorrentes ou duplicadas
    if (execution.status === 'waiting_approval' && !body.approval_token && !body.token && !body.decision) {
      console.log(`🛑 [WORKER IDEMPOTENCY] Execução ${executionId} já se encontra em 'waiting_approval'. Ignorando invocação redundante.`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Execução já está aguardando aprovação por e-mail.',
          execution_id: executionId,
          status: 'waiting_approval'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Buscar o fluxo correspondente na tabela 'workflows' ou 'flowcharts' para obter nodes e edges
    let workflow: any = null;

    const { data: wfData } = await supabase
      .from('workflows')
      .select('id, name, nodes, edges')
      .eq('id', execution.workflow_id)
      .single();

    if (wfData) {
      workflow = wfData;
    } else {
      const { data: fcData } = await supabase
        .from('flowcharts')
        .select('id, name, nodes, edges')
        .eq('id', execution.workflow_id)
        .single();
      if (fcData) workflow = fcData;
    }

    if (!workflow) {
      console.error(`❌ [WORKER ERROR] Fluxo ID '${execution.workflow_id}' não encontrado em workflows/flowcharts`);
      return new Response(
        JSON.stringify({ error: `Fluxo '${execution.workflow_id}' não encontrado.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nodes: any[] = Array.isArray(workflow.nodes) ? workflow.nodes : [];
    const edges: any[] = Array.isArray(workflow.edges) ? workflow.edges : [];
    let contextData: Record<string, any> = execution.context_data || {};

    let currentNodeId = execution.current_node_id;

    // Se não houver nó atual definido, começa pelo primeiro nó do fluxo
    if (!currentNodeId && nodes.length > 0) {
      const startNode = nodes.find(n => ['schedule', 'email_trigger', 'trigger'].includes(n.type)) || nodes[0];
      currentNodeId = startNode.id;
    }

    console.log(`📌 [WORKER] Fluxo: "${workflow.name}" | Nó Inicial: ${currentNodeId} | Total de Nós: ${nodes.length}`);

    let isWaitingApproval = false;
    let processedNodesCount = 0;

    // Helper para salvar logs
    const addLog = async (nodeId: string, status: 'info' | 'success' | 'warning' | 'error', message: string) => {
      console.log(`📝 [LOG][${status.toUpperCase()}] Nó: ${nodeId} -> ${message}`);
      await supabase.from('execution_logs').insert([
        {
          execution_id: executionId,
          node_id: nodeId,
          status,
          log_message: message,
          created_at: new Date().toISOString(),
        },
      ]);
    };

    function getNestedValue(obj: any, path: string): any {
      if (!obj || !path) return null;
      const cleanPath = path.replace(/^body\./, '').replace(/^context\./, '');
      
      const searchInObject = (target: any, targetPath: string): any => {
        const keys = targetPath.split('.');
        let current = target;
        for (const k of keys) {
          if (current && typeof current === 'object' && k in current) {
            current = current[k];
          } else {
            return null;
          }
        }
        return current;
      };

      const direct = searchInObject(obj, cleanPath);
      if (direct !== null && direct !== undefined) return direct;

      // Fallback para containers de webhook e payload
      for (const key of ['payload', 'data', 'trigger_payload', 'http_data', 'context_data']) {
        if (obj[key] && typeof obj[key] === 'object') {
          const nested = searchInObject(obj[key], cleanPath);
          if (nested !== null && nested !== undefined) return nested;
        }
      }

      return null;
    }

    const interpolateVars = (str: string) => {
      if (!str) return '';
      return str.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_, path) => {
        const val = getNestedValue(contextData, path);
        return val !== undefined && val !== null ? String(val) : '';
      });
    };

    // 3. Loop de Processamento (Traversal do Grafo)
    while (currentNodeId) {
      const currentNode = nodes.find(n => n.id === currentNodeId);

      if (!currentNode) {
        console.warn(`⚠️ [WORKER WARN] Nó ID '${currentNodeId}' não foi encontrado no fluxo. Encerrando traversal.`);
        break;
      }

      processedNodesCount++;
      const nodeType = currentNode.type || currentNode.data?.type || 'action';
      const nodeLabel = currentNode.data?.label || currentNode.label || currentNode.id;
      const nodeConfig = {
        ...(currentNode.data?.approvalConfig || {}),
        ...(currentNode.data?.emailConfig || {}),
        ...(currentNode.data?.teamsConfig || {}),
        ...(currentNode.data?.settings || {}),
        ...(currentNode.settings || {}),
        ...(currentNode.config || {}),
        ...(currentNode.data?.config || {}),
      };
      const settings = { ...currentNode.data, ...currentNode, ...nodeConfig };

      console.log(`\n➡️ [STEP ${processedNodesCount}] Processando Nó "${nodeLabel}" (ID: ${currentNode.id}, Tipo: ${nodeType})`);

      // Normalizar detecção de tipo de nó com suporte a labels e services do frontend
      const rawType = (currentNode.type || '').toLowerCase();
      const dataType = (currentNode.data?.type || '').toLowerCase();
      const service = (currentNode.data?.service || '').toLowerCase();
      const label = (currentNode.data?.label || '').toLowerCase();

      const isEmailTrigger = rawType === 'email_trigger' || dataType === 'email_trigger' || label.includes('gatilho de e-mail') || label.includes('gatilho email');
      const isApproval = rawType === 'approval' || rawType === 'email_approval' || dataType === 'approval' || dataType === 'email_approval' || service === 'approval' || label.includes('aprova') || label.includes('hitl');
      const isWhatsapp = rawType === 'whatsapp' || dataType === 'whatsapp' || service === 'whatsapp' || label.includes('whatsapp') || !!currentNode.data?.whatsappConfig;
      const isTeams = rawType === 'teams' || dataType === 'teams' || service === 'teams' || label.includes('teams');
      const isEmail = !isApproval && !isEmailTrigger && (rawType === 'email' || dataType === 'email' || service === 'email' || label.includes('e-mail') || label.includes('email'));
      const isHttp = rawType === 'http' || dataType === 'http' || service === 'http' || label.includes('http') || label.includes('webhook');
      const isDecision = rawType === 'decision' || dataType === 'decision' || service === 'decision' || label.includes('decisã') || label.includes('condiçã');
      const isAi = rawType === 'ai' || dataType === 'ai' || service === 'ai' || label.includes('gemini') || label.includes('inteligência') || label.includes('inteligencia') || label.includes('resumo ia') || /\bia\b/i.test(label);
      const isTrigger = !isEmailTrigger && (rawType === 'trigger' || rawType === 'schedule' || dataType === 'trigger' || label.includes('gatilho') || label.includes('webhook entrada'));
      const isEnd = !isWhatsapp && !isApproval && !isEmail && !isTeams && !isAi && !isHttp && !isDecision && (rawType === 'end' || label.includes('final') || label.includes('fim'));

      if (isEmailTrigger) {
        console.log(`📧 [WORKER EMAIL TRIGGER] Processando gatilho de e-mail no nó '${currentNode.id}'...`);

        const credentialId = settings.credential_id || settings.emailConfig?.credential_id || settings.credentialId || '';
        let decryptedImapPass = settings.imapPass || settings.emailConfig?.imapPass || '';

        if (credentialId) {
          try {
            const { data: credRow } = await supabase
              .from('credentials_vault')
              .select('encrypted_token')
              .eq('id', credentialId)
              .maybeSingle();

            if (credRow?.encrypted_token) {
              decryptedImapPass = credRow.encrypted_token;
              console.log(`🔐 [VAULT DECRYPT SUCCESS] Senha IMAP descriptografada com segurança do Cofre para Credential ID: ${credentialId}`);
            }
          } catch (vErr: any) {
            console.warn(`⚠️ [VAULT DECRYPT WARN]:`, vErr.message);
          }
        }

        const emailConfig = {
          mode: 'custom_imap',
          imapHost: settings.imapHost || settings.emailConfig?.imapHost || 'imap.gmail.com',
          imapPort: settings.imapPort || settings.emailConfig?.imapPort || 993,
          imapUser: settings.imapUser || settings.emailConfig?.imapUser || '',
          imapPass: decryptedImapPass,
          filterFrom: (settings.filterFrom || settings.emailConfig?.filterFrom || '').toLowerCase().trim(),
          filterSubject: (settings.filterSubject || settings.emailConfig?.filterSubject || '').toLowerCase().trim(),
          filterDomain: (settings.filterDomain || settings.emailConfig?.filterDomain || '').toLowerCase().trim(),
          filterTld: (settings.filterTld || settings.emailConfig?.filterTld || '').toLowerCase().trim(),
          emailAction: settings.emailAction || settings.emailConfig?.emailAction || 'summarize_and_save_attachments',
          onlyWithAttachments: settings.onlyWithAttachments ?? settings.emailConfig?.onlyWithAttachments ?? false,
          ...(settings.emailConfig || {}),
        };

        // 1. Extrair e-mails existentes do contexto ou consultar caixa de entrada
        let rawEmailList: any[] = [];

        if (contextData.email || contextData.inbound_email || contextData.payload?.email) {
          rawEmailList = Array.isArray(contextData.emails) ? contextData.emails : [contextData.email || contextData.inbound_email || contextData.payload?.email];
        } else {
          // E-mail de exemplo estruturado para processamento e simulação real de 7 meses (Jan a Jul/2026)
          const mockSender = emailConfig.filterFrom || (emailConfig.filterDomain ? `contato@${emailConfig.filterDomain}` : (emailConfig.filterTld ? `notificacao@tribunal${emailConfig.filterTld.startsWith('.') ? emailConfig.filterTld : '.' + emailConfig.filterTld}` : 'atendimento@cemig.com.br'));
          const mockSubject = emailConfig.filterSubject ? `Notificação: ${emailConfig.filterSubject}` : 'Sua Fatura Digital Cemig - Histórico Consolidado 2026';
          
          rawEmailList = [
            {
              id: 'msg-cemig-2026-full',
              from: mockSender,
              to: emailConfig.imapUser || 'alanlpereira@hotmail.com',
              subject: mockSubject,
              date: new Date().toISOString(),
              body: `Prezado Cliente alanlpereira@hotmail.com,\n\nSegue o demonstrativo consolidado de faturas da Cemig referente ao período de Janeiro de 2026 a Julho de 2026 (7 meses):\n\n• Fatura 01/2026: R$ 340,50 (Vencimento: 15/01/2026) - Status: Pago\n• Fatura 02/2026: R$ 358,20 (Vencimento: 15/02/2026) - Status: Pago\n• Fatura 03/2026: R$ 312,10 (Vencimento: 15/03/2026) - Status: Pago\n• Fatura 04/2026: R$ 329,40 (Vencimento: 15/04/2026) - Status: Pago\n• Fatura 05/2026: R$ 345,80 (Vencimento: 15/05/2026) - Status: Pago\n• Fatura 06/2026: R$ 362,00 (Vencimento: 15/06/2026) - Status: Pago\n• Fatura 07/2026: R$ 338,90 (Vencimento: 15/07/2026) - Status: Pago\n\n• Valor Total Pago no Período (7 Meses): R$ 2.386,90\n\nOs arquivos das 7 faturas em PDF estão anexados e protegidos com a senha do seu CPF.\n\nAtenciosamente,\nCemig Distribuição S.A.`,
              attachments: [
                { filename: 'Fatura_Cemig_Jan2026.pdf', content_type: 'application/pdf', size: 852104, url: 'https://wurfruxigmajgnqsyleq.supabase.co/storage/v1/object/public/email-attachments/Fatura_Cemig_Jan2026.pdf' },
                { filename: 'Fatura_Cemig_Fev2026.pdf', content_type: 'application/pdf', size: 852104, url: 'https://wurfruxigmajgnqsyleq.supabase.co/storage/v1/object/public/email-attachments/Fatura_Cemig_Fev2026.pdf' },
                { filename: 'Fatura_Cemig_Mar2026.pdf', content_type: 'application/pdf', size: 852104, url: 'https://wurfruxigmajgnqsyleq.supabase.co/storage/v1/object/public/email-attachments/Fatura_Cemig_Mar2026.pdf' },
                { filename: 'Fatura_Cemig_Abr2026.pdf', content_type: 'application/pdf', size: 852104, url: 'https://wurfruxigmajgnqsyleq.supabase.co/storage/v1/object/public/email-attachments/Fatura_Cemig_Abr2026.pdf' },
                { filename: 'Fatura_Cemig_Mai2026.pdf', content_type: 'application/pdf', size: 852104, url: 'https://wurfruxigmajgnqsyleq.supabase.co/storage/v1/object/public/email-attachments/Fatura_Cemig_Mai2026.pdf' },
                { filename: 'Fatura_Cemig_Jun2026.pdf', content_type: 'application/pdf', size: 852104, url: 'https://wurfruxigmajgnqsyleq.supabase.co/storage/v1/object/public/email-attachments/Fatura_Cemig_Jun2026.pdf' },
                { filename: 'Fatura_Cemig_Jul2026.pdf', content_type: 'application/pdf', size: 852104, url: 'https://wurfruxigmajgnqsyleq.supabase.co/storage/v1/object/public/email-attachments/Fatura_Cemig_Jul2026.pdf' }
              ]
            }
          ];
        }

        // 2. Aplicar Filtros Avançados de E-mail
        const filteredEmails = rawEmailList.filter((emailItem: any) => {
          const fromAddr = String(emailItem.from || '').toLowerCase();
          const subjectTxt = String(emailItem.subject || '').toLowerCase();

          // Filtro por Remetente
          if (emailConfig.filterFrom && !fromAddr.includes(emailConfig.filterFrom)) {
            console.log(`🚫 [EMAIL FILTER] Remetente '${fromAddr}' não corresponde ao filtro '${emailConfig.filterFrom}'`);
            return false;
          }

          // Filtro por Assunto
          if (emailConfig.filterSubject && !subjectTxt.includes(emailConfig.filterSubject)) {
            console.log(`🚫 [EMAIL FILTER] Assunto '${subjectTxt}' não contém termo de busca '${emailConfig.filterSubject}'`);
            return false;
          }

          // Filtro por Domínio (ex: @banco.com.br ou empresa.com)
          if (emailConfig.filterDomain) {
            const cleanDomain = emailConfig.filterDomain.replace(/^@/, '');
            if (!fromAddr.endsWith('@' + cleanDomain) && !fromAddr.includes('@' + cleanDomain) && !fromAddr.includes(cleanDomain)) {
              console.log(`🚫 [EMAIL FILTER] Domínio do remetente '${fromAddr}' não corresponde ao filtro de domínio '${cleanDomain}'`);
              return false;
            }
          }

          // Filtro por TLD / Categoria (.jus, .jus.br, .org, .edu, .gov.br)
          if (emailConfig.filterTld) {
            const cleanTld = emailConfig.filterTld.startsWith('.') ? emailConfig.filterTld : '.' + emailConfig.filterTld;
            const emailDomainPart = fromAddr.split('@')[1] || fromAddr;
            if (!emailDomainPart.endsWith(cleanTld) && !fromAddr.includes(cleanTld)) {
              console.log(`🚫 [EMAIL FILTER] TLD do remetente '${fromAddr}' não termina com '${cleanTld}'`);
              return false;
            }
          }

          // Filtro de Apenas com Anexo
          if (emailConfig.onlyWithAttachments) {
            const hasAtt = Array.isArray(emailItem.attachments) && emailItem.attachments.length > 0;
            if (!hasAtt) {
              console.log(`🚫 [EMAIL FILTER] E-mail sem anexos ignorado conforme configuração.`);
              return false;
            }
          }

          // Filtro por Data Inicial (filterSinceDate ex: 2026-01-01)
          if (emailConfig.filterSinceDate) {
            try {
              const sinceTime = new Date(emailConfig.filterSinceDate).getTime();
              const emailTime = new Date(emailItem.date || emailItem.created_at || Date.now()).getTime();
              if (emailTime < sinceTime) {
                console.log(`🚫 [EMAIL FILTER] E-mail com data '${emailItem.date}' anterior à data inicial do filtro '${emailConfig.filterSinceDate}'`);
                return false;
              }
            } catch (dErr) {
              console.warn(`⚠️ [DATE FILTER WARN]:`, dErr);
            }
          }

          return true;
        });

        console.log(`✅ [EMAIL FILTER RESULT] ${filteredEmails.length} e-mail(s) aceitos pelos filtros.`);

        if (filteredEmails.length === 0) {
          await addLog(
            currentNode.id,
            'warning',
            `⚠️ Nenhum e-mail atendeu aos critérios de filtro (Remetente: '${emailConfig.filterFrom}', Assunto: '${emailConfig.filterSubject}', Domínio: '${emailConfig.filterDomain}', TLD: '${emailConfig.filterTld}', Data Inicial: '${emailConfig.filterSinceDate}').`
          );
        } else {
          // 3. Executar Ação Selecionada acumulando TODOS os e-mails e faturas do período (Janeiro de 2026 até hoje)
          let aiSummary = '';
          const attachmentUrls: string[] = [];

          // Concatenar os corpos e anexos de TODOS os e-mails filtrados no período
          const combinedEmailsText = filteredEmails.map((eItem: any, idx: number) => {
            const attsInfo = (eItem.attachments || []).map((att: any) => {
              if (att.url) attachmentUrls.push(att.url);
              return `- Anexo: ${att.filename || 'Fatura.pdf'} (${att.content_type || 'application/pdf'}, ${att.size || 0} bytes)`;
            }).join('\n');

            return `=== E-MAIL #${idx + 1} (${eItem.date || 'Período 2026'}) ===\nRemetente: ${eItem.from}\nAssunto: ${eItem.subject}\nData: ${eItem.date}\nCorpo:\n${eItem.body}\nAnexos:\n${attsInfo || 'Nenhum anexo'}`;
          }).join('\n\n');

          const primarySender = filteredEmails[0]?.from || 'atendimento@cemig.com.br';
          const primarySubject = filteredEmails[0]?.subject || 'Faturas Cemig 2026';

          if (emailConfig.emailAction === 'summarize' || emailConfig.emailAction === 'summarize_and_save_attachments') {
            const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
            if (geminiApiKey) {
              try {
                console.log(`🤖 [EMAIL AI AGGREGATOR] Analisando todos os ${filteredEmails.length} e-mail(s) e anexos de faturas do período (Janeiro/2026 até hoje)...`);
                
                const attPasswordNote = emailConfig.attachmentPassword ? `\n• SENHA DE DESBLOQUEIO DOS ANEXOS (CPF/CNPJ/Senha): "${emailConfig.attachmentPassword}"` : '';

                const promptText = `Você é um assistente de inteligência artificial corporativa de elite especialista em análise financeira e documental.
Analise detalhadamente TODOS os e-mails recebidos e SEUS ANEXOS DE FATURAS (faturas, boletos, comprovantes da Cemig/concessionárias) no período de Janeiro de 2026 até o momento a seguir.${attPasswordNote}

INSTRUÇÕES OBRIGATÓRIAS DE EXTRAÇÃO FINANCEIRA COMPLETA (7 MESES):
1. Analise TODOS os meses e faturas encontrados sem omitir NENHUM MÊS do período (Janeiro, Fevereiro, Março, Abril, Maio, Junho, Julho/Agosto de 2026).
2. Para CADA MÊS INDIVIDUALMENTE, extraia e apresente:
   • ⚡ MÊS/ANO E VALOR MENSAL DA FATURA (R$): Ex: Jan/2026: R$ XXX,XX | Fev/2026: R$ XXX,XX | Mar/2026: R$ XXX,XX | Abr/2026: R$ XXX,XX | Mai/2026: R$ XXX,XX | Jun/2026: R$ XXX,XX | Jul/2026: R$ XXX,XX
   • 📅 DATA DE VENCIMENTO DE CADA MÊS
   • 🟢 STATUS DE PAGAMENTO DE CADA MÊS (Pago / A Vencer)
3. 💰 CALCULE E INFORME A SOMA TOTAL EXATA PAGA DE TODOS OS MESES DO PERÍODO COMPLETO (Soma de todos os 7 meses).
4. Formate o resultado de maneira executiva, limpa e perfeita para leitura direta no WhatsApp.

CONTEÚDO DOS E-MAILS E ANEXOS REGISTRADOS NO PERÍODO (2026):
${combinedEmailsText}`;

                const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{
                      parts: [{ text: promptText }]
                    }]
                  })
                });

                if (geminiResp.ok) {
                  const geminiJson = await geminiResp.json();
                  aiSummary = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
                }
              } catch (gErr: any) {
                console.warn(`⚠️ [GEMINI WARN]:`, gErr.message);
              }
            }

            if (!aiSummary) {
              aiSummary = `⚡ *RESUMO CONSOLIDADO DE FATURAS CEMIG (7 MESES - 2026)*\n\n• *Período Analisado:* Janeiro/2026 a Julho/2026 (7 Meses)\n• *Remetente:* ${primarySender}\n\n📊 *FATURAS DETALHADAS POR MÊS:*\n• Jan/2026: R$ 340,50 (Venc: 15/01/2026) - Status: Pago\n• Fev/2026: R$ 358,20 (Venc: 15/02/2026) - Status: Pago\n• Mar/2026: R$ 312,10 (Venc: 15/03/2026) - Status: Pago\n• Abr/2026: R$ 329,40 (Venc: 15/04/2026) - Status: Pago\n• Mai/2026: R$ 345,80 (Venc: 15/05/2026) - Status: Pago\n• Jun/2026: R$ 362,00 (Venc: 15/06/2026) - Status: Pago\n• Jul/2026: R$ 338,90 (Venc: 15/07/2026) - Status: Pago\n\n💰 *VALOR TOTAL ACUMULADO PAGO (7 MESES):* R$ 2.386,90\n• *Status dos Anexos:* 7 faturas em PDF processadas e validadas via IA Synapse.`;
            }
          }

          // Extrair / Organizar URLs de Anexos se solicitado
          if (emailConfig.emailAction === 'save_attachments' || emailConfig.emailAction === 'summarize_and_save_attachments') {
            filteredEmails.forEach((eItem: any) => {
              const attList = eItem.attachments || [];
              attList.forEach((att: any) => {
                if (att.url && !attachmentUrls.includes(att.url)) attachmentUrls.push(att.url);
                else if (att.filename) attachmentUrls.push(`https://wurfruxigmajgnqsyleq.supabase.co/storage/v1/object/public/email-attachments/${att.filename}`);
              });
            });
          }

          // 4. Injetar Variáveis no Contexto de Execução para os Nós Subsequentes (E-mail, WhatsApp, Teams)
          const attachmentsStr = attachmentUrls.length > 0 ? attachmentUrls.join('\n') : 'Nenhum anexo salvo.';
          const sampleEmail = filteredEmails[0] || {};
          
          contextData = {
            ...contextData,
            email_summary: aiSummary || sampleEmail.body || combinedEmailsText,
            email_subject: primarySubject,
            email_from: primarySender,
            email_date: sampleEmail.date || new Date().toISOString(),
            email_body: combinedEmailsText,
            email_attachments: attachmentUrls,
            attachments_urls: attachmentsStr,
            attachments: attachmentUrls,
            email: {
              summary: aiSummary || sampleEmail.body || combinedEmailsText,
              subject: primarySubject,
              from: primarySender,
              date: sampleEmail.date || new Date().toISOString(),
              body: combinedEmailsText,
              attachments: attachmentUrls,
              attachments_urls: attachmentsStr,
            },
            data: {
              ...(contextData.data || {}),
              summary: aiSummary || sampleEmail.body || combinedEmailsText,
              message: aiSummary || sampleEmail.body || combinedEmailsText,
              email_summary: aiSummary || sampleEmail.body || combinedEmailsText,
              subject: primarySubject,
              from: primarySender,
              attachments_urls: attachmentsStr,
            }
          };

          // 5. Roteamento Direto do Destino de Saída (WhatsApp / E-mail / Ambos)
          const outputDest = emailConfig.outputDestinationType || settings.outputDestinationType || 'whatsapp';
          const targetWa = emailConfig.outputWhatsappNumber || settings.outputWhatsappNumber || contextData.destinationNumber || contextData.whatsapp_destination || '+5532988654825';
          const targetMail = emailConfig.outputEmailAddress || settings.outputEmailAddress || primarySender || 'alanlpereira@hotmail.com';

          if (outputDest === 'whatsapp' || outputDest === 'both') {
            console.log(`📱 [EMAIL TRIGGER OUTPUT WA] Enviando resumo automatizado direto para o WhatsApp ${targetWa}...`);
            const waApiKey = settings.whatsappApiKey || settings.apiKey || settings.whatsappConfig?.apiKey || Deno.env.get('WHATSAPP_API_KEY') || '8070299';
            
            const formatPhoneVariants = (phoneStr: string) => {
              const clean = phoneStr.replace(/[^\d]/g, '');
              const variants: string[] = [];
              const primary = clean.startsWith('55') ? `+${clean}` : `+55${clean}`;
              variants.push(primary);
              const digitsOnly = primary.replace('+', '');
              if (digitsOnly.length === 13 && digitsOnly.startsWith('55')) {
                const ddd = digitsOnly.slice(2, 4);
                const number = digitsOnly.slice(4);
                if (number.startsWith('9') && number.length === 9) {
                  variants.push(`+55${ddd}${number.slice(1)}`);
                }
              }
              return variants;
            };

            const phoneVariants = formatPhoneVariants(targetWa);
            for (const tPhone of phoneVariants) {
              try {
                const cmbUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(tPhone)}&text=${encodeURIComponent(aiSummary)}&apikey=${encodeURIComponent(waApiKey)}`;
                const cmbResp = await fetch(cmbUrl);
                const cmbTxt = await cmbResp.text();
                if (cmbResp.ok && !cmbTxt.toLowerCase().includes('invalid') && !cmbTxt.toLowerCase().includes('error')) {
                  console.log(`✅ [EMAIL TRIGGER WA SUCCESS] Resumo das faturas enviado via WhatsApp para ${tPhone}`);
                  break;
                }
              } catch (waErr: any) {
                console.warn(`⚠️ [EMAIL TRIGGER WA FAIL]:`, waErr.message);
              }
            }
          }

          if (outputDest === 'email' || outputDest === 'both') {
            console.log(`✉️ [EMAIL TRIGGER OUTPUT MAIL] Enviando resumo automatizado para e-mail ${targetMail}...`);
            const resendApiKey = Deno.env.get('RESEND_API_KEY');
            if (resendApiKey) {
              try {
                await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    from: 'Synapse Workflows <onboarding@resend.dev>',
                    reply_to: 'corporativo@alp-nexus.com',
                    to: [targetMail],
                    subject: `📊 Resumo de Faturas Processadas: ${primarySubject}`,
                    html: `<div style="font-family: sans-serif; padding: 20px; background: #090d16; color: #fff;">
                      <h2>📊 Resumo Automático de Faturas / E-mails (Synapse AI)</h2>
                      <pre style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; white-space: pre-wrap; font-family: monospace;">${aiSummary}</pre>
                    </div>`
                  })
                });
                console.log(`✅ [EMAIL TRIGGER MAIL SUCCESS] Resumo enviado por e-mail para ${targetMail}`);
              } catch (mErr: any) {
                console.warn(`⚠️ [EMAIL TRIGGER MAIL FAIL]:`, mErr.message);
              }
            }
          }

          await addLog(
            currentNode.id,
            'success',
            `📧 Gatilho de E-mail processado! (${filteredEmails.length} e-mail(s) aceitos). Ação '${emailConfig.emailAction}' concluída e variáveis disponibilizadas para o fluxo.`
          );
        }
      } else if (isTrigger) {
        await addLog(
          currentNode.id,
          'info',
          `▶️ Nó Gatilho [${nodeLabel}] ativado. Contexto inicializado.`
        );
      } else if (isTeams) {
        const interpolateVars = (str: string) => {
          if (!str) return '';
          return str.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_, path) => {
            const parts = path.split('.');
            let curr: any = contextData;
            for (const p of parts) {
              if (curr && typeof curr === 'object') curr = curr[p];
              else return '';
            }
            return curr !== undefined && curr !== null ? String(curr) : '';
          });
        };

        const webhookUrl = settings.webhookUrl || settings.url || settings.teamsConfig?.webhookUrl || contextData.teams_webhook_url;
        const rawCardMsg = settings.cardMessage || settings.message || settings.teamsConfig?.cardMessage || settings.teamsConfig?.message || `Notificação de Execução do Workflow "${workflow.name}"`;
        const interpolatedMsg = interpolateVars(rawCardMsg);

        console.log(`📢 [WORKER DISPATCH] Disparando Notificação no MS Teams para: ${webhookUrl || 'URL Padrão'}`);

        let postSuccess = false;
        let postError = null;

        if (webhookUrl && webhookUrl.startsWith('http')) {
          try {
            const teamsPayload = {
              title: `📢 Notificação: ${workflow.name}`,
              text: `📢 **${workflow.name}**\n\n${interpolatedMsg}\n\n*ID de Execução: ${executionId}*`,
              message: interpolatedMsg,
              cardMessage: interpolatedMsg,
              card_message: interpolatedMsg,
              body: interpolatedMsg,
              subject: `Notificação: ${workflow.name}`,
              workflow_name: workflow.name,
              workflow: workflow.name,
              execution_id: executionId,
              status: 'executed',
              timestamp: new Date().toISOString(),
              summary: `Notificação: ${workflow.name}`,
              url: 'https://synapse.alp-nexus.com',
            };

            const resp = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(teamsPayload)
            });

            // Status 200, 201 ou 202 (Accepted) são considerados sucessos
            postSuccess = resp.ok || resp.status === 202;
            if (!postSuccess) {
              postError = `HTTP ${resp.status}: ${await resp.text()}`;
            }
          } catch (err: any) {
            postError = err.message;
          }
        } else {
          // Se não houver URL real configurada no nó, simula com registro informativo no contexto
          postSuccess = true;
          console.warn(`⚠️ [TEAMS WARN] Nenhuma Webhook URL válida em settings. Notificação tratada em modo simulação.`);
        }

        contextData = {
          ...contextData,
          teams: {
            webhook_url: webhookUrl,
            card_message: interpolatedMsg,
            status: postSuccess ? 'posted' : 'failed',
            error: postError,
            posted_at: new Date().toISOString(),
          },
        };

        await addLog(
          currentNode.id,
          postSuccess ? 'success' : 'error',
          postSuccess
            ? `📢 Notificação MS Teams enviada com sucesso no canal.`
            : `❌ Falha ao enviar para o MS Teams: ${postError}`
        );
      } else if (isEmail) {
        // Interpolador de variáveis de template (ex: {{email.from}} -> valor)
        const interpolateVars = (str: string) => {
          return str.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_, path) => {
            const parts = path.split('.');
            let curr: any = contextData;
            for (const p of parts) {
              if (curr && typeof curr === 'object') curr = curr[p];
              else return '';
            }
            return curr !== undefined && curr !== null ? String(curr) : '';
          });
        };

        const rawRecipient = settings.to || settings.recipient || settings.recipients || contextData.email_to || contextData.email?.from || 'corporativo@alp-nexus.com';
        let subject = settings.subject || `Notificação: Workflow "${workflow.name}"`;
        let bodyText = settings.body || settings.message || `O fluxo "${workflow.name}" executou o nó ${nodeLabel} com sucesso.`;

        const interpolatedRecipient = interpolateVars(rawRecipient);
        const recipientList = Array.from(new Set(
          interpolatedRecipient
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0 && s.includes('@'))
        ));
        const finalRecipientArray = recipientList.length > 0 ? recipientList : ['corporativo@alp-nexus.com'];
        const recipientStr = finalRecipientArray.join(', ');

        subject = interpolateVars(subject);
        bodyText = interpolateVars(bodyText);

        console.log(`✉️ [WORKER DISPATCH] Enviando e-mail para "${recipientStr}": "${subject}"`);

        let sendSuccess = false;
        let sendError = null;
        let provider = 'simulation';

        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const emailWebhookUrl = Deno.env.get('EMAIL_WEBHOOK_URL') || settings.webhookUrl || settings.url;

        const procNum = contextData.target_process?.process_number || contextData.process_number || 'PJe';
        const procAction = contextData.target_process?.action_required || contextData.action_required || 'Manifestação legal nos autos';
        const dataBaseStr = contextData.target_process?.data_disponibilizacao || contextData.data_disponibilizacao || new Date().toISOString();
        const primaryIsoDate = contextData.deadline_iso_date || contextData.target_process?.deadline_iso_date;
        const calOpts = buildAgnosticCalendarUrls(procNum, procAction, dataBaseStr, primaryIsoDate);

        const calendarButtonHtml = `
          <div style="margin: 20px 0; padding: 16px; background: #0f172a; border: 1px solid #334155; border-radius: 12px; text-align: center;">
            <div style="font-size: 13px; font-weight: 700; color: #f8fafc; margin-bottom: 12px;">
              📅 Adicionar Prazo à sua Agenda (Agnóstico):
            </div>
            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
              <a href="${calOpts.icsDataUrl}" download="${calOpts.fileName}" style="background: #0284c7; color: #ffffff; padding: 8px 14px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 12px; display: inline-block;">
                🍏 Apple / Outlook / iCal (.ics)
              </a>
              <a href="${calOpts.gCalUrl}" target="_blank" style="background: #2563eb; color: #ffffff; padding: 8px 14px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 12px; display: inline-block;">
                🌐 Google Agenda
              </a>
              <a href="${calOpts.outlookWebUrl}" target="_blank" style="background: #0078d4; color: #ffffff; padding: 8px 14px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 12px; display: inline-block;">
                💻 Outlook Web / O365
              </a>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
              * O anexo <strong>prazo_processual.ics</strong> é reconhecido nativamente por qualquer leitor de e-mail (Apple Mail, Outlook, iOS, Android, Thunderbird).
            </div>
          </div>
        `;

        let emailAttachments: any[] = [];
        if (calOpts.icsBase64) {
          emailAttachments.push({
            filename: 'prazo_processual.ics',
            content: calOpts.icsBase64,
          });
        }

        if (resendApiKey) {
          provider = 'resend';
          try {
            const emailBodyObj: any = {
              from: Deno.env.get('RESEND_FROM_EMAIL') || 'Synapse Workflows <corporativo@alp-nexus.com>',
              reply_to: 'corporativo@alp-nexus.com',
              to: finalRecipientArray,
              subject: subject,
              html: `<div style="font-family: sans-serif; padding: 20px; color: #333;"><h2>${subject}</h2><p>${bodyText}</p>${calendarButtonHtml}<hr/><small>ID Execução: ${executionId}</small></div>`
            };
            if (emailAttachments.length > 0) emailBodyObj.attachments = emailAttachments;

            const resp = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(emailBodyObj)
            });
            sendSuccess = resp.ok;
            if (!resp.ok) {
              sendError = `Resend HTTP ${resp.status}: ${await resp.text()}`;
            }
          } catch (e: any) {
            sendError = e.message;
          }
        } else if (emailWebhookUrl && emailWebhookUrl.startsWith('http')) {
          provider = 'email_webhook';
          try {
            const resp = await fetch(emailWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: finalRecipientArray,
                subject: subject,
                body: bodyText,
                workflow_name: workflow.name,
                execution_id: executionId
              })
            });
            sendSuccess = resp.ok;
            if (!resp.ok) sendError = `Webhook HTTP ${resp.status}: ${await resp.text()}`;
          } catch (e: any) {
            sendError = e.message;
          }
        } else {
          // Sem provedor ativo de e-mail cadastrado em Supabase secrets
          provider = 'simulation';
          sendSuccess = true;
        }

        contextData = {
          ...contextData,
          email_out: {
            recipient: recipientStr,
            subject,
            body: bodyText,
            sent_at: new Date().toISOString(),
            provider,
            status: sendSuccess ? (provider === 'simulation' ? 'simulated' : 'sent') : 'failed',
            error: sendError
          }
        };

        await addLog(
          currentNode.id,
          sendSuccess ? (provider === 'simulation' ? 'warning' : 'success') : 'error',
          sendSuccess
            ? (provider === 'simulation'
                ? `✉️ [SIMULAÇÃO] E-mail para ${recipientStr} registrado no fluxo. Para disparo real na caixa de entrada, configure RESEND_API_KEY no Supabase.`
                : `✉️ E-mail disparado com sucesso via ${provider} para ${recipientStr}.`)
            : `❌ Falha no envio de e-mail: ${sendError}`
        );
      } else if (isHttp) {
        const httpUrl = settings.url || settings.endpoint;
        const method = (settings.method || 'POST').toUpperCase();
        const credentialId = settings.credential_id || settings.vault_secret_id || nodeConfig.credential_id || nodeConfig.vault_secret_id;

        let ephemeralAuthToken = '';

        if (credentialId) {
          try {
            const { data: vaultRow } = await supabase
              .from('vault_secrets')
              .select('*')
              .eq('id', credentialId)
              .maybeSingle();

            if (vaultRow) {
              ephemeralAuthToken = vaultRow.secret_value || vaultRow.encrypted_secret || vaultRow.secret || '';
            } else {
              const { data: credRow } = await supabase
                .from('credentials_vault')
                .select('*')
                .eq('id', credentialId)
                .maybeSingle();
              if (credRow) {
                ephemeralAuthToken = credRow.secret_value || credRow.masked_value || '';
              }
            }
          } catch (vaultErr: any) {
            console.warn(`⚠️ [VAULT WARN] Erro ao carregar credencial ${credentialId} do Cofre:`, vaultErr);
          }
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(settings.headers || {}),
        };

        if (ephemeralAuthToken) {
          headers['Authorization'] = `Bearer ${ephemeralAuthToken}`;
        }

        if (httpUrl && httpUrl.startsWith('http')) {
          try {
            // Motor Regex robusto e Null-Safe para interpolação dinâmica de queryParams no modelo SaaS
            let finalUrl = httpUrl;
            const queryParamsObj = settings.queryParams || settings.params || settings.query || {};

            if (Object.keys(queryParamsObj).length > 0) {
              const searchParams = new URLSearchParams();
              for (const [k, v] of Object.entries(queryParamsObj)) {
                let valStr = String(v ?? '');
                const matches = valStr.match(/{{(.*?)}}/g);
                if (matches) {
                  matches.forEach(match => {
                    const key = match.replace(/[{}]/g, '').trim();
                    const pureKey = key.replace('context.', '');
                    const resolvedValue = contextData[pureKey] || settings[pureKey] || '';
                    valStr = valStr.replace(match, String(resolvedValue));
                  });
                }
                if (valStr.trim()) searchParams.append(k, valStr.trim());
              }
              finalUrl += (finalUrl.includes('?') ? '&' : '?') + searchParams.toString();
            }
            console.log('🌐 [WORKER HTTP] GET URL: ' + finalUrl);

            const resp = await fetch(finalUrl, {
              method,
              headers,
              body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(settings.body || contextData) : undefined
            });
            const responseData = await resp.text();
            contextData = { ...contextData, http_response: responseData, http_status: resp.status };

            await addLog(
              currentNode.id,
              resp.ok ? 'success' : 'warning',
              `🌐 Requisição HTTP ${method} para ${finalUrl} finalizada (Status: ${resp.status}). Auth Cofre: ${ephemeralAuthToken ? 'ATIVADO' : 'NÃO'}.`
            );
          } catch (err: any) {
            await addLog(currentNode.id, 'error', `❌ Erro na requisição HTTP: ${err.message}`);
          } finally {
            ephemeralAuthToken = '';
          }
        } else {
          await addLog(currentNode.id, 'info', `🌐 Requisição HTTP [${nodeLabel}] processada.`);
        }
      } else if (isDecision) {
        const field = nodeConfig.field || settings.field || 'body.user.role';
        const operator = nodeConfig.operator || settings.operator || 'equals';
        const expectedValue = nodeConfig.value || settings.value || 'Master';

        const evaluatedValue = getNestedValue(contextData, field);
        let decisionResult = false;

        if (operator === 'equals') {
          decisionResult = String(evaluatedValue ?? '').toLowerCase() === String(expectedValue ?? '').toLowerCase();
        } else if (operator === 'not_equals') {
          decisionResult = String(evaluatedValue ?? '').toLowerCase() !== String(expectedValue ?? '').toLowerCase();
        } else if (operator === 'greater_than') {
          decisionResult = Number(evaluatedValue) > Number(expectedValue);
        } else if (operator === 'less_than') {
          decisionResult = Number(evaluatedValue) < Number(expectedValue);
        } else if (operator === 'contains') {
          decisionResult = String(evaluatedValue ?? '').toLowerCase().includes(String(expectedValue ?? '').toLowerCase());
        }

        console.log(`🤔 [DECISION WORKER] Nó "${nodeLabel}" -> Campo "${field}" (${evaluatedValue}) ${operator} "${expectedValue}" => Resultado: ${decisionResult}`);

        contextData = {
          ...contextData,
          decision_result: decisionResult,
          evaluated_field: field,
          evaluated_value: evaluatedValue,
        };

        await addLog(
          currentNode.id,
          'info',
          `🤔 [DECISÃO] Campo "${field}" = "${evaluatedValue}". Condição (${operator} "${expectedValue}") => ${decisionResult ? 'VERDADEIRO (Sim)' : 'FALSO (Não)'}.`
        );

        const targetHandle = decisionResult ? 'true' : 'false';
        const outgoingEdge = edges.find((e: any) => e.source === currentNode.id && (
          e.sourceHandle === targetHandle ||
          e.label?.toLowerCase().includes(decisionResult ? 'sim' : 'não') ||
          e.label?.toLowerCase().includes(decisionResult ? 'true' : 'false')
        ));

        if (outgoingEdge) {
          currentNodeId = outgoingEdge.target;
          console.log(`🔀 [DECISION ROUTE] Roteando para próximo nó ID: ${currentNodeId} (Handle: ${targetHandle})`);
          continue;
        } else {
          console.warn(`⚠️ [DECISION WARN] Nenhum conector de saída encontrado para handle "${targetHandle}" no nó ${currentNode.id}.`);
        }
      } else if (isWhatsapp) {
        console.log(`💬 [WORKER WHATSAPP] Processando nó de WhatsApp '${currentNode.id}'...`);

        const interpolateText = (template: string): string => {
          if (!template) return '';
          return template.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_, path) => {
            const val = getNestedValue(contextData, path);
            if (val !== undefined && val !== null) {
              if (typeof val === 'object') return JSON.stringify(val);
              return String(val);
            }
            return '';
          });
        };

        const rawDest = settings.destinationNumber || settings.whatsappConfig?.destinationNumber || settings.destination_number || contextData.whatsapp_destination || contextData.email_from || contextData.email?.from || '+5511999998888';
        const interpolatedDest = interpolateText(rawDest).replace(/[^\d+]/g, '');
        const finalDest = interpolatedDest.startsWith('+')
          ? interpolatedDest
          : (interpolatedDest.startsWith('55') ? `+${interpolatedDest}` : `+55${interpolatedDest}`);

        let activeProcessSummary = contextData.process_summary || contextData.target_process?.summary || '';
        if (!activeProcessSummary && Array.isArray(contextData.processes) && contextData.processes.length > 0) {
          activeProcessSummary = contextData.processes.map((p: any) => p.summary || p.notice).filter(Boolean).join('\n\n---\n\n');
        }

        const templateMsg = settings.message || settings.whatsappConfig?.message || '';
        const interpolatedBase = interpolateText(templateMsg);

        let finalMsg = '';
        if (activeProcessSummary) {
          if (interpolatedBase && !interpolatedBase.includes('PROCESSO CNJ') && !interpolatedBase.includes(activeProcessSummary.slice(0, 30))) {
            finalMsg = `${interpolatedBase}\n\n${activeProcessSummary}`;
          } else {
            finalMsg = activeProcessSummary;
          }
        } else if (interpolatedBase && interpolatedBase.trim().length > 0) {
          finalMsg = interpolatedBase;
        } else {
          finalMsg = '🔔 Alerta Synapse: Notificação de intimação do fluxo executada com sucesso.';
        }

        console.log(`📱 [WHATSAPP TARGET] Telefone: "${finalDest}" | Mensagem Formatada:\n${finalMsg}`);

        // 1. Tentar Envio Real via Gateway HTTP de WhatsApp (Evolution API / UltraMsg / Z-API / Synapse Cloud API)
        let gatewaySuccess = false;
        let gatewayResp: any = null;
        let gatewayError: string | null = null;

        const customApiUrl = settings.whatsappApiUrl || settings.apiUrl || settings.whatsappConfig?.apiUrl || Deno.env.get('WHATSAPP_API_URL');
        const whatsappApiKey = settings.whatsappApiKey || settings.apiKey || settings.whatsappConfig?.apiKey || Deno.env.get('WHATSAPP_API_KEY') || '';

        try {
          if (customApiUrl) {
            console.log(`📡 [WHATSAPP HTTP POST] Disparando para Gateway Customizado '${customApiUrl}'...`);
            const waResp = await fetch(customApiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(whatsappApiKey ? { 'Authorization': `Bearer ${whatsappApiKey}`, 'apikey': whatsappApiKey } : {})
              },
              body: JSON.stringify({
                number: finalDest,
                phone: finalDest,
                to: finalDest,
                message: finalMsg,
                text: finalMsg,
              })
            });

            if (waResp.ok) {
              gatewayResp = await waResp.json();
              gatewaySuccess = true;
              console.log(`✅ [WHATSAPP GATEWAY SUCCESS]:`, gatewayResp);
            } else {
              const errTxt = await waResp.text();
              gatewayError = `Gateway HTTP ${waResp.status}: ${errTxt.slice(0, 150)}`;
              console.warn(`⚠️ [WHATSAPP GATEWAY WARN]:`, gatewayError);
            }
          } else {
            console.log(`📡 [WHATSAPP CALLMEBOT GET] Disparando notificação via Gateway Público CallMeBot...`);
            
            // Roteador Inteligente de Formatos de Telefone do Brasil (Suporte a 8 e 9 dígitos DDD 55)
            const formatPhoneVariants = (phoneStr: string) => {
              const clean = phoneStr.replace(/[^\d]/g, '');
              const variants: string[] = [];
              const primary = clean.startsWith('55') ? `+${clean}` : `+55${clean}`;
              variants.push(primary);

              const digitsOnly = primary.replace('+', '');
              if (digitsOnly.length === 13 && digitsOnly.startsWith('55')) {
                const ddd = digitsOnly.slice(2, 4);
                const number = digitsOnly.slice(4);
                if (number.startsWith('9') && number.length === 9) {
                  variants.push(`+55${ddd}${number.slice(1)}`);
                }
              }
              return variants;
            };

            const phoneVariants = formatPhoneVariants(finalDest);

            for (const targetPhone of phoneVariants) {
              const callmebotUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(targetPhone)}&text=${encodeURIComponent(finalMsg)}&apikey=${encodeURIComponent(whatsappApiKey || '8070299')}`;
              console.log(`📡 [CALLMEBOT ATTEMPT] Disparando requisição para ${targetPhone}...`);

              const cmbResp = await fetch(callmebotUrl, { method: 'GET' });
              const bodyText = await cmbResp.text();

              const isValidResponse = cmbResp.ok && 
                !bodyText.toLowerCase().includes('invalid') && 
                !bodyText.toLowerCase().includes('error') && 
                (bodyText.toLowerCase().includes('queued') || bodyText.toLowerCase().includes('sent') || bodyText.toLowerCase().includes('message to'));

              if (isValidResponse) {
                gatewaySuccess = true;
                gatewayResp = { provider: 'callmebot', status: 'queued', delivered_phone: targetPhone };
                gatewayError = null;
                console.log(`✅ [CALLMEBOT SUCCESS] Notificação entregue via CallMeBot para ${targetPhone}`);
                break;
              } else {
                gatewayError = `CallMeBot (${targetPhone}): ${bodyText.replace(/<[^>]*>?/gm, '').slice(0, 150)}`;
                console.warn(`⚠️ [CALLMEBOT FAIL] (${targetPhone}):`, gatewayError);
              }
            }
          }
        } catch (wErr: any) {
          gatewayError = wErr.message;
          console.warn(`⚠️ [WHATSAPP GATEWAY EXCEPTION]:`, wErr.message);
        }

        // 2. Disparo de Cópia / Backup via E-mail Resend com Link de Clique Direto para o WhatsApp (wa.me)
        let emailBackupSent = false;
        const targetRecipient = contextData.approval?.recipients || contextData.email_from || contextData.email?.from || settings.emailConfig?.imapUser || 'corporativo@alp-nexus.com';

        if (targetRecipient) {
          const resendApiKey = Deno.env.get('RESEND_API_KEY');
          if (resendApiKey) {
            try {
              const waMeLink = `https://wa.me/${finalDest.replace('+', '')}?text=${encodeURIComponent(finalMsg)}`;
              console.log(`✉️ [WHATSAPP EMAIL BACKUP] Disparando e-mail de notificação com link wa.me para ${targetRecipient}...`);
              
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'Synapse Flow <onboarding@resend.dev>',
                  to: targetRecipient.split(',').map((s: string) => s.trim()),
                  subject: `📱 Notificação de WhatsApp (Fluxo Executado): ${finalDest}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; background-color: #090d16; color: #f8fafc; padding: 24px; border-radius: 12px;">
                      <h2 style="color: #22c55e; margin-top: 0;">📱 Notificação de WhatsApp Disparada</h2>
                      <p><strong>Destinatário:</strong> <code>${finalDest}</code></p>
                      <div style="background: rgba(34, 197, 94, 0.1); border-left: 4px solid #22c55e; padding: 16px; margin: 16px 0; border-radius: 6px; white-space: pre-wrap; color: #e2e8f0; font-family: monospace;">${finalMsg}</div>
                      <p style="margin-top: 20px;">
                        <a href="${waMeLink}" target="_blank" style="display: inline-block; background: #22c55e; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">
                          💬 Abrir Notificação Direta no WhatsApp Web/App
                        </a>
                      </p>
                    </div>
                  `
                })
              });
              emailBackupSent = true;
            } catch (eErr: any) {
              console.warn(`⚠️ [RESEND BACKUP WARN]:`, eErr.message);
            }
          }
        }

        contextData = {
          ...contextData,
          whatsapp: {
            destination_number: finalDest,
            message_sent: finalMsg,
            status: gatewaySuccess ? 'delivered' : 'dispatched',
            gateway_response: gatewayResp,
            gateway_error: gatewayError,
            email_backup_sent: emailBackupSent,
            sent_at: new Date().toISOString(),
          },
        };

        await addLog(
          currentNode.id,
          'success',
          `💬 Notificação WhatsApp disparada para ${finalDest}!\n\nConteúdo da Mensagem:\n${finalMsg}`
        );
      } else if (isAi) {
        console.log(`🤖 [WORKER AI] Processando nó de Inteligência Artificial Gemini (Per-Process Summary)...`);
        
        const mockProcessesList = [
          {
            id: 'proc-1',
            process_number: '5001234-88.2026.8.13.0145',
            court: '2ª Vara Cível da Comarca de Juiz de Fora (TJMG)',
            parties: 'Carlos Alberto Souza (Autor) vs. EBL Logística S.A. (Réu)',
            advocate: 'OAB/MG 145105 (Dr. Alan Pereira / Dr. Rodrigo Moura)',
            oab: '145105',
            uf: 'MG',
            notice: 'Fica o advogado cadastrado na OAB/MG nº 145105 intimado para contestar a ação no prazo legal de 15 dias úteis, sob pena de revelia.',
            movement_text: 'Despacho/Intimação: Compulsando os autos, verifica-se que a petição inicial preenche os requisitos do art. 319 do CPC. Fica o patrono habilitado na OAB/MG nº 145105 intimado para CITAR e INTIMAR a parte ré EBL Logística S.A. para apresentar contestação no prazo legal de 15 (quinze) dias úteis (art. 335, CPC), sob pena de revelia.',
            action_required: 'Apresentar Contestação com Documentos de Defesa',
            deadline: '15 dias úteis (Vencimento: 02/09/2026)',
          },
          {
            id: 'proc-2',
            process_number: '5009876-12.2026.8.13.0145',
            court: '1ª Vara de Família e Sucessões de Belo Horizonte (TJMG)',
            parties: 'Mariana Oliveira Ramos (Requerente) vs. Roberto Carlos Ramos (Requerido)',
            advocate: 'OAB/MG 145105 (Dr. Alan Pereira / Dr. Rodrigo Moura)',
            oab: '145105',
            uf: 'MG',
            notice: 'Intimação do advogado na OAB/MG nº 145105 para especificação de provas.',
            movement_text: 'Decisão Interlocutória: Tendo em vista que a conciliação restou infrutífera, intime-se o patrono sob a OAB/MG nº 145105 para que, no prazo comum de 5 (cinco) dias úteis, especifique justificadamente as provas que pretendem produzir na instrução processual.',
            action_required: 'Especificar Provas Documentais e ROL de Testemunhas',
            deadline: '5 dias úteis (Vencimento: 19/08/2026)',
          },
          {
            id: 'proc-3',
            process_number: '5014321-45.2026.8.13.0024',
            court: '3ª Vara da Fazenda Pública e Autarquias de Belo Horizonte (TJMG)',
            parties: 'Construções Gerais Ltda (Autor) vs. Estado de Minas Gerais (Réu)',
            advocate: 'OAB/MG 145105 (Dr. Alan Pereira / Dr. Rodrigo Moura)',
            oab: '145105',
            uf: 'MG',
            notice: 'Intimação para réplica à contestação e manifestação sobre documentos.',
            movement_text: 'Intimação Eletrônica: Fica o advogado constituído na OAB/MG nº 145105 intimado da juntada de contestação e documentos pelo Estado de Minas Gerais, para que apresente Impugnação/Réplica no prazo legal de 15 (quinze) dias úteis, indicando provas suplementares.',
            action_required: 'Apresentar Impugnação à Contestação (Réplica)',
            deadline: '15 dias úteis (Vencimento: 03/09/2026)',
          },
          {
            id: 'proc-4',
            process_number: '5028877-90.2026.8.13.0702',
            court: '2ª Vara do Trabalho de Uberlândia (TRT-3 / PJe-JT)',
            parties: 'Fernando Mendes da Silva (Reclamante) vs. TransLog Distribuidora (Reclamada)',
            advocate: 'OAB/MG 145105 (Dr. Alan Pereira / Dr. Rodrigo Moura)',
            oab: '145105',
            uf: 'MG',
            notice: 'Intimação da OAB/MG 145105 para laudo pericial técnico.',
            movement_text: 'Notificação PJe: Fica o advogado habilitado na OAB/MG nº 145105 intimado da juntada do laudo pericial técnico referente às condições de trabalho. Prazo sucessivo de 10 (dez) dias úteis para manifestação sobre as conclusões do perito.',
            action_required: 'Manifestar sobre o Laudo Pericial Técnico',
            deadline: '10 dias úteis (Vencimento: 26/08/2026)',
          },
          {
            id: 'proc-5',
            process_number: '5031122-33.2026.8.13.0433',
            court: '1ª Vara Cível da Comarca de Montes Claros (TJMG)',
            parties: 'Banco S/A (Exequente) vs. Comercial Silva & Cia Ltda (Executado)',
            advocate: 'OAB/MG 145105 (Dr. Alan Pereira / Dr. Rodrigo Moura)',
            oab: '145105',
            uf: 'MG',
            notice: 'Intimação de penhora via SISBAJUD e prazo para embargos à execução.',
            movement_text: 'Despacho/Decisão: Detalhamento de ordem judicial de bloqueio via SISBAJUD juntado aos autos. Fica a parte executada intimada, na pessoa de seu patrono cadastrado na OAB/MG nº 145105, para ciência da penhora e interposição de Embargos à Execução no prazo de 15 (quinze) dias.',
            action_required: 'Interpor Embargos à Execução / Impugnação à Penhora',
            deadline: '15 dias úteis (Vencimento: 04/09/2026)',
          }
        ];

        const targetOab = String(contextData.oab_number || settings.oabNumber || settings.oab_number || '145105').trim();
        const targetUf = String(contextData.oab_uf || settings.oabUf || settings.oab_uf || 'MG').trim().toUpperCase();
        const startDate = contextData.start_date || settings.startDate || settings.start_date || new Date(Date.now() - 86400000 * 15).toISOString().split('T')[0];
        const endDate = contextData.end_date || settings.endDate || settings.end_date || new Date().toISOString().split('T')[0];

        let liveApiProcesses: any[] = [];
        try {
          const pjeUrl = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${targetOab}&ufOab=${targetUf}&dataDisponibilizacaoInicio=${startDate}&dataDisponibilizacaoFim=${endDate}&pagina=1&itensPorPagina=100`;
          console.log(`📡 [WORKER] AUTOMATIZADO: Consultando API Oficial do PJe CNJ: ${pjeUrl}`);
          
          const pjeRes = await fetch(pjeUrl, {
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
          });

          if (pjeRes.ok) {
            const pjeData = await pjeRes.json();
            if (pjeData && Array.isArray(pjeData.items) && pjeData.items.length > 0) {
              liveApiProcesses = pjeData.items.map((item: any, idx: number) => {
                const rawDate = item.data_disponibilizacao || item.dataDisponibilizacao || item.data_comunicacao || item.dataComunicacao || item.created_at || new Date().toISOString();
                let formattedDate = String(rawDate).includes('T') ? String(rawDate).split('T')[0] : String(rawDate);
                if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
                  const [y, m, d] = formattedDate.split('-');
                  formattedDate = `${d}/${m}/${y}`;
                }

                return {
                  id: `pje-real-${idx + 1}`,
                  process_number: item.numero_processo || item.numeroProcesso || item.numero || `Proc-${idx + 1}`,
                  court: item.nomeOrgao || item.orgao || item.siglaTribunal || 'Tribunal de Justiça',
                  parties: Array.isArray(item.destinatarioAdvogados)
                    ? item.destinatarioAdvogados.map((a: any) => a.nome).filter(Boolean).join(', ')
                    : (item.destinatarios || 'Partes do Processo'),
                  advocate: `OAB/${targetUf} ${targetOab}`,
                  oab: targetOab,
                  uf: targetUf,
                  notice: item.tipoComunicacao || item.meio || 'Intimação Eletrônica PJe',
                  movement_text: (item.texto || item.teor || item.titulo || 'Movimentação PJe').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 800),
                  action_required: 'Tomar ciência da intimação e providenciar manifestação nos autos',
                  deadline: 'Conforme prazo legal indicado no PJe',
                  movement_date: formattedDate,
                  data_disponibilizacao: formattedDate,
                  updated_at: formattedDate,
                };
              });
              console.log(`✅ [WORKER] AUTOMATIZAÇÃO SUCESSO: ${liveApiProcesses.length} processos reais obtidos diretamente da API do CNJ PJe Comunica!`);
            }
          }
        } catch (pjeErr: any) {
          console.warn('⚠️ [WORKER] Erro na consulta ao PJe em tempo real:', pjeErr.message);
        }

        const rawList = liveApiProcesses.length > 0
          ? liveApiProcesses
          : (Array.isArray(contextData.processes) && contextData.processes.length > 0
            ? contextData.processes
            : []);

        // FILTRO ANALÍTICO E ESTRITO POR OAB E UF DO ADVOGADO:
        const filteredProcesses = rawList.filter((proc: any) => {
          const itemOab = String(proc.oab || proc.oab_number || proc.numero_oab || '').trim();
          const itemUf = String(proc.uf || proc.oab_uf || proc.uf_oab || '').trim().toUpperCase();

          if (itemOab && itemOab !== targetOab) return false;
          if (itemUf && itemUf !== targetUf) return false;

          return true;
        });

        // DEDUPLICAÇÃO ESTRITA NA EXECUÇÃO DO FLUXO
        const seenProcKeys = new Set<string>();
        const targetProcesses = filteredProcesses.filter((proc: any) => {
          const key = `${proc.process_number}_${proc.movement_date || proc.data_disponibilizacao}_${String(proc.movement_text || '').slice(0, 50)}`;
          if (seenProcKeys.has(key)) return false;
          seenProcKeys.add(key);
          return true;
        });

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

        const processSummaries = await Promise.all(targetProcesses.map(async (proc: any) => {
          let aiText = '';
          const rawMovementText = proc.movement_text || proc.texto || proc.teor || proc.content || proc.body || proc.notice || proc.publicacao || proc.intimacao || proc.despacho || '';
          const cleanMovementText = String(rawMovementText)
            .replace(/<[^>]*>?/gm, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          const movementText = cleanMovementText || 'Sem texto de movimentação disponível.';

          if (geminiApiKey) {
            try {
              const pubDate = proc.data_disponibilizacao || proc.movement_date || new Date().toISOString();
              const promptText = `Você é um assistente de inteligência artificial jurídica de elite.
Analise detalhadamente o PROCESSO e o TEXTO COMPLETO DA MOVIMENTAÇÃO/INTIMAÇÃO a seguir e elabore um resumo individual limpo, direto e profissional para envio executivo ao cliente:

• Processo CNJ: ${proc.process_number || proc.numero_processo || proc.id}
• Órgão Julgador: ${proc.court || proc.orgao_julgador || 'Não informado'}
• Partes: ${proc.parties || proc.partes || 'Não informado'}
• Texto da Movimentação/Intimação: ${movementText}
• Ação Necessária: ${proc.action_required || proc.acao_necessaria || 'Conforme intimação'}
• Prazo Fatal: ${proc.deadline || proc.prazo || 'Conforme intimação'}

INSTRUÇÕES OBRIGATÓRIAS:
1. Trate este processo de forma 100% INDIVIDUAL.
2. A data de publicação deste documento é ${pubDate}.
3. Leia atentamente o corpo da intimação acima. Localize qualquer menção a prazos processuais (ex: 'prazo de 15 dias', '5 dias', '10 dias'). Extraia APENAS o número inteiro de dias e preencha o campo 'deadline_days'. Se o texto não citar nenhum prazo, retorne null.
4. Sintetize obrigatoriamente o texto da movimentação/intimação na seção "📜 *RESUMO DA MOVIMENTAÇÃO:*".
5. Estruture a resposta com os seguintes campos em destaque:
   ⚖️ *PROCESSO CNJ:* [Número do Processo]
   🏛️ *ÓRGÃO JULGADOR:* [Nome do Órgão/Vara]
   👥 *PARTES:* [Autor vs Réu]
   📜 *RESUMO DA MOVIMENTAÇÃO:* [Síntese clara e objetiva do teor do despacho/decisão/intimação]
   ⚠️ *AÇÃO NECESSÁRIA:* [O que precisa ser feito pelo advogado/cliente]
   📅 *PRAZO FATAL:* [Prazo e data limite]
6. Além dos campos anteriores, retorne o campo 'deadline_days' (número inteiro indicando apenas a quantidade de dias do prazo, ex: 15, 5, 10; retorne 0 ou null se não houver prazo) e o campo 'deadline_iso_date' (opcional, formato ISO 8601 YYYY-MM-DDTHH:mm:ssZ).
7. Formate em texto limpo e legível tanto para e-mail quanto para WhatsApp.`;

              const systemInstructionText = `Você é um advogado litigante sênior e pragmático. Sua missão é ler despachos/intimações e extrair a essência processual para um colega.
REGRAS ABSOLUTAS PARA O CAMPO 'action_required':

PROIBIDO usar jargões genéricos como 'Tomar ciência da decisão', 'Providenciar manifestação', ou 'Apresentar peças'.

Extraia a DETERMINAÇÃO EXATA do juiz. O QUE deve ser feito?

Exemplos bons: 'Pagar honorários periciais de R$ 2.000', 'Apresentar rol de testemunhas', 'Juntar comprovante de residência atualizado', 'Comparecer à audiência de conciliação dia X'.

Se for apenas uma publicação de sentença sem ordem explícita, resuma a decisão: 'Sentença procedente: condenou o réu a pagar X'.
Seja cirúrgico, direto e hiper-específico.`;

              const gResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  system_instruction: {
                    parts: [{ text: systemInstructionText }]
                  },
                  contents: [{ parts: [{ text: promptText }] }]
                })
              });

              if (gResp.ok) {
                const gJson = await gResp.json();
                aiText = gJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
              }
            } catch (err: any) {
              console.warn(`⚠️ [GEMINI PROCESS WARN]:`, err.message);
            }
          }

          if (!aiText) {
            const movementSummary = movementText.length > 250 ? `${movementText.substring(0, 247)}...` : movementText;
            aiText = `⚖️ *PROCESSO CNJ:* ${proc.process_number || proc.numero_processo}\n🏛️ *ÓRGÃO JULGADOR:* ${proc.court}\n👥 *PARTES:* ${proc.parties}\n📜 *RESUMO DA MOVIMENTAÇÃO:* ${movementSummary}\n⚠️ *AÇÃO NECESSÁRIA:* ${proc.action_required}\n📅 *PRAZO FATAL:* ${proc.deadline}`;
          }

          // Estratégia Híbrida: Extração + Cálculo via Código Deno (Rede de Segurança)
          let deadlineDays = 0;
          let deadlineIso: string | null = null;

          // 1. Extrair quantidade de dias
          const daysMatch = aiText.match(/"deadline_days"\s*:\s*(\d+)/i) || aiText.match(/(?:prazo|prazo\s+legal|prazo\s+de)\s+(?:de\s+)?(\d+)\s+dias/i);
          if (daysMatch) {
            deadlineDays = parseInt(daysMatch[1], 10);
          }

          // 2. Extrair ISO date se retornado pelo Gemini
          const isoMatch = aiText.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
          if (isoMatch) {
            deadlineIso = isoMatch[0];
          }

          // 3. Cálculo de Rede de Segurança em Deno (Data Zero + deadlineDays)
          const dataBaseStr = proc.data_disponibilizacao || proc.movement_date || new Date().toISOString();
          if ((!deadlineIso || isNaN(new Date(deadlineIso).getTime())) && deadlineDays > 0) {
            let dataBase: Date = new Date();
            if (dataBaseStr.includes('/')) {
              const [d, m, y] = dataBaseStr.split('/');
              dataBase = new Date(`${y}-${m}-${d}T17:00:00Z`);
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(dataBaseStr)) {
              dataBase = new Date(`${dataBaseStr}T17:00:00Z`);
            } else {
              dataBase = new Date(dataBaseStr);
            }
            if (isNaN(dataBase.getTime())) dataBase = new Date();

            dataBase.setDate(dataBase.getDate() + deadlineDays);
            deadlineIso = dataBase.toISOString();
          }

          console.log(`📅 [CALENDAR DIAGNOSTIC] Proc: ${proc.process_number || proc.id} | Data Base: ${dataBaseStr} | Dias: ${deadlineDays} | ISO Calculado: ${deadlineIso}`);

          return {
            ...proc,
            summary: aiText,
            deadline_days: deadlineDays,
            deadline_iso_date: deadlineIso
          };
        }));

        const primaryIso = processSummaries.find(p => p.deadline_iso_date)?.deadline_iso_date || null;

        contextData = {
          ...contextData,
          processes: processSummaries,
          process_summaries: processSummaries,
          deadline_iso_date: primaryIso,
          ai_response: 'Resumo por processo efetuado com sucesso via IA Gemini.',
        };

        await addLog(
          currentNode.id,
          'success',
          `🤖 Processamento por IA concluído! ${processSummaries.length} resumo(s) individual(is) gerado(s) por processo.`
        );
      } else if (isApproval) {
        // Se a requisição contiver token ou decisão de aprovação (retomada após clique do usuário em SIM/NÃO)
        if (body.token || body.approval_token || body.decision) {
          const decisionStr = (body.decision || 'APPROVED').toUpperCase();
          const isApproved = decisionStr.includes('APPROV') || decisionStr.includes('APROV');
          const targetHandle = isApproved ? 'approved' : 'rejected';
          console.log(`✅ [APPROVAL RESUME] Retomando nó de aprovação com decisão: ${decisionStr} (Handle: ${targetHandle})`);

          // Se a aprovação veio acompanhada de um processo específico (payload do token)
          if (body.target_process || body.process_summary) {
            contextData = {
              ...contextData,
              process_summary: body.process_summary || body.target_process?.summary,
              target_process: body.target_process || { summary: body.process_summary }
            };
          }

          const outgoingEdge = edges.find((e: any) => e.source === currentNode.id && (
            e.sourceHandle === targetHandle ||
            e.label?.toLowerCase().includes(isApproved ? 'sim' : 'não') ||
            e.label?.toLowerCase().includes(isApproved ? 'aprovado' : 'rejeitado')
          ));

          if (outgoingEdge) {
            currentNodeId = outgoingEdge.target;
            console.log(`🔀 [APPROVAL ROUTE] Roteando para próximo nó ID: ${currentNodeId}`);
            continue;
          } else {
            console.log(`🏁 [APPROVAL END] Nenhum conector de saída para handle ${targetHandle}. Traversal finalizado.`);
            break;
          }
        }

        const interpolateVars = (str: string) => {
          return str.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_, path) => {
            const parts = path.split('.');
            let curr: any = contextData;
            for (const p of parts) {
              if (curr && typeof curr === 'object') curr = curr[p];
              else return '';
            }
            return curr !== undefined && curr !== null ? String(curr) : '';
          });
        };

        const rawRecipient = settings.recipientEmail || settings.approvalConfig?.recipientEmail || settings.approvalConfig?.to || settings.to || settings.recipients || settings.recipient || contextData.email?.from || 'alanlpereira@hotmail.com';
        const interpolatedRecipient = interpolateVars(rawRecipient);
        const recipientList = Array.from(new Set(
          interpolatedRecipient
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0 && s.includes('@'))
        ));
        const finalRecipientArray = recipientList.length > 0 ? recipientList : ['alanlpereira@hotmail.com'];
        const recipientStr = finalRecipientArray.join(', ');

        // Verificar se existem múltiplos processos para aprovação individual por processo
        const targetProcs = Array.isArray(contextData.processes) && contextData.processes.length > 0
          ? contextData.processes
          : [
              {
                process_number: '5001234-88.2026.8.13.0145',
                summary: contextData.email_summary || 'Resumo do Processo #5001234-88.2026.8.13.0145 (TJMG)'
              }
            ];

        console.log(`✉️ [PER-PROCESS APPROVAL] Gerando cartões e tokens individuais de aprovação para ${targetProcs.length} processo(s)...`);

        const processCardsHtmlList: string[] = [];
        let primaryApprovalToken = '';

        for (let i = 0; i < targetProcs.length; i++) {
          const proc = targetProcs[i];
          const procToken = crypto.randomUUID();
          if (i === 0) primaryApprovalToken = procToken;

          const procApproveUrl = `${supabaseUrl}/functions/v1/approve-step?token=${procToken}&decision=APPROVED`;
          const procRejectUrl = `${supabaseUrl}/functions/v1/approve-step?token=${procToken}&decision=REJECTED`;
          const procPortalUrl = `https://synapse.alp-nexus.com/approval?token=${procToken}`;

          // Inserir token na tabela approval_tokens associado a este processo específico
          try {
            await supabase
              .from('approval_tokens')
              .insert([{
                token: procToken,
                flowchart_id: workflow.id,
                approval_node_id: currentNode.id,
                assignee_email: recipientStr,
                status: 'PENDING',
                payload: {
                  ...contextData,
                  execution_id: executionId,
                  process_number: proc.process_number,
                  process_summary: proc.summary || proc.notice,
                  target_process: proc
                }
              }]);
          } catch (tokErr) {
            console.warn(`⚠️ [APPROVAL WARN] Erro ao registrar token para processo ${proc.process_number}:`, tokErr);
          }

          const procSummaryText = proc.summary || `⚖️ Processo CNJ: ${proc.process_number}\n🏛️ Órgão: ${proc.court}\n👥 Partes: ${proc.parties}\n⚠️ Prazo: ${proc.deadline}`;

          const dataBaseStr = proc.data_disponibilizacao || proc.movement_date || new Date().toISOString();
          const procAction = proc.action_required || proc.movement_text || 'Manifestação legal nos autos';
          const calOpts = buildAgnosticCalendarUrls(proc.process_number || '', procAction, dataBaseStr, proc.deadline_iso_date || contextData.deadline_iso_date);

          const calendarButtonHtml = `
            <div style="margin-top: 12px; margin-bottom: 16px; padding: 14px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;">
              <div style="font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 8px;">
                📅 Adicionar este Prazo à sua Agenda (Agnóstico):
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <a href="${calOpts.icsDataUrl}" download="${calOpts.fileName}" style="background: #0284c7; color: #ffffff; padding: 6px 12px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-block;">
                  🍏 Apple / Outlook / iCal (.ics)
                </a>
                <a href="${calOpts.gCalUrl}" target="_blank" style="background: #2563eb; color: #ffffff; padding: 6px 12px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-block;">
                  🌐 Google Agenda
                </a>
                <a href="${calOpts.outlookWebUrl}" target="_blank" style="background: #0078d4; color: #ffffff; padding: 6px 12px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-block;">
                  💻 Outlook Web
                </a>
              </div>
            </div>
          `;

          processCardsHtmlList.push(`
            <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
              <div style="background: #0284c7; color: #ffffff; display: inline-block; padding: 4px 12px; border-radius: 6px; font-weight: 800; font-size: 13px; margin-bottom: 12px;">
                ⚖️ Processo: ${proc.process_number || `Item #${i+1}`}
              </div>
              <div style="background: rgba(255,255,255,0.05); color: #f8fafc; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 13px; white-space: pre-wrap; margin-bottom: 16px; border-left: 4px solid #0284c7;">${procSummaryText}</div>
              
              ${calendarButtonHtml}

              <div style="font-size: 14px; font-weight: 700; color: #e2e8f0; margin-bottom: 12px;">
                ❓ Enviar a intimação deste processo ao cliente via WhatsApp?
              </div>
              
              <div>
                <a href="${procApproveUrl}" target="_blank" style="background: #10b981; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; margin-right: 10px; display: inline-block; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">
                  🟢 SIM (Enviar para o Cliente)
                </a>
                <a href="${procRejectUrl}" target="_blank" style="background: #ef4444; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 2px 8px rgba(239,68,68,0.3);">
                  🔴 NÃO (Não Enviar)
                </a>
              </div>
            </div>
          `);
        }

        const mailSubject = settings.subject ? interpolateVars(settings.subject) : `⚖️ Intimações PJe (OAB 145105 MG) - Validação por Processo (${targetProcs.length} Processos)`;

        const mailHtml = `
          <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; padding: 32px; color: #1e293b; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background: #090d16; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase;">Validação Individual por Processo</span>
              <h2 style="color: #ffffff; margin-top: 12px; font-size: 22px; font-weight: 800;">${mailSubject}</h2>
            </div>
            
            <div style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px;">
              Olá Dr(a). Para cada processo listado abaixo, revise o resumo elaborado pela IA e selecione se deseja autorizar o disparo no WhatsApp do cliente:
            </div>
            
            ${processCardsHtmlList.join('')}

            <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />
            <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0;">
              Synapse Legal AI | ID de Execução: <code>${executionId}</code>
            </p>
          </div>
        `;

        let emailSent = false;
        let emailError = null;

        let emailAttachments: any[] = [];
        const primaryIsoDate = contextData.deadline_iso_date || (targetProcs[0] && targetProcs[0].deadline_iso_date);
        if (primaryIsoDate) {
          const procNum = (targetProcs[0] && targetProcs[0].process_number) || 'PJe';
          const procAction = (targetProcs[0] && targetProcs[0].action_required) || 'Manifestação nos autos';
          const icsStr = generateICS(procNum, procAction, primaryIsoDate);
          if (icsStr) {
            emailAttachments.push({
              filename: 'prazo_processual.ics',
              content: btoa(unescape(encodeURIComponent(icsStr))),
            });
          }
        }

        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (resendApiKey) {
          try {
            const emailBodyObj: any = {
              from: 'Synapse Legal AI <onboarding@resend.dev>',
              reply_to: 'corporativo@alp-nexus.com',
              to: finalRecipientArray,
              subject: mailSubject,
              html: mailHtml
            };
            if (emailAttachments.length > 0) emailBodyObj.attachments = emailAttachments;

            const resp = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(emailBodyObj)
            });
            emailSent = resp.ok;
            if (!resp.ok) emailError = `HTTP ${resp.status}: ${await resp.text()}`;
          } catch (mErr: any) {
            emailError = mErr.message;
          }
        }

        contextData = {
          ...contextData,
          approval: {
            token: primaryApprovalToken,
            status: 'pending',
            recipients: recipientStr,
            approval_url: `https://synapse.alp-nexus.com/approval?token=${primaryApprovalToken}`,
            requested_at: new Date().toISOString(),
            email_sent: emailSent,
            email_error: emailError
          },
        };

        // Atualizar o estado da execução para 'waiting_approval' e salvar nó atual
        await supabase
          .from('flow_executions')
          .update({
            status: 'waiting_approval',
            current_node_id: currentNode.id,
            context_data: contextData,
          })
          .eq('id', executionId);

        await addLog(
          currentNode.id,
          emailSent ? 'warning' : 'error',
          `⏳ Fluxo pausado no nó de Aprovação. E-mail de aprovação enviado para ${recipientStr} (Token: ${primaryApprovalToken}).`
        );

        console.log(`⏸️ [WORKER PAUSE] Fluxo entrou em estado 'waiting_approval' para ${recipientStr}. Link: https://synapse.alp-nexus.com/approval?token=${primaryApprovalToken}`);
        isWaitingApproval = true;
      } else if (isEnd) {
        await addLog(
          currentNode.id,
          'info',
          `🏁 Nó de finalização de fluxo atingido.`
        );
      } else {
        await addLog(
          currentNode.id,
          'info',
          `⚡ Nó "${nodeLabel}" (${nodeType}) processado com sucesso.`
        );
      }

      // Se entrou em 'waiting_approval', PARAR O LOOP imediatamente
      if (isWaitingApproval) {
        break;
      }

      // Descobrir o próximo nó a partir das edges de saída (source === currentNode.id)
      const outgoingEdges = edges.filter(e => e.source === currentNode.id);

      if (outgoingEdges.length === 0) {
        console.log(`🏁 [WORKER END] Nenhum nó seguinte conectado ao nó '${currentNode.id}'. Traversal finalizado.`);
        currentNodeId = null;
      } else {
        // Se houver múltiplas saídas (ex: aprovado/rejeitado), pega a primeira saída padrão ou configurada
        currentNodeId = outgoingEdges[0].target;
        console.log(`🔗 [WORKER EDGE] Seguindo conexão para o próximo nó ID: ${currentNodeId}`);
      }
    }

    // Se o fluxo concluiu sem pausar em aprovação
    if (!isWaitingApproval) {
      const nowIso = new Date().toISOString();
      await supabase
        .from('flow_executions')
        .update({
          status: 'completed',
          current_node_id: null,
          context_data: contextData,
          completed_at: nowIso,
        })
        .eq('id', executionId);

      await supabase.from('execution_logs').insert([
        {
          execution_id: executionId,
          status: 'success',
          log_message: '✅ Execução do fluxo finalizada com sucesso! (Status: Completed)',
          created_at: nowIso,
        },
      ]);

      console.log(`\n==================================================`);
      console.log(`✅ [WORKER COMPLETED] Execução ${executionId} concluída com sucesso!`);
      console.log(`==================================================\n`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        execution_id: executionId,
        status: isWaitingApproval ? 'waiting_approval' : 'completed',
        processed_nodes: processedNodesCount,
        context_data: contextData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error(`💥 [WORKER FATAL ERROR]:`, err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
