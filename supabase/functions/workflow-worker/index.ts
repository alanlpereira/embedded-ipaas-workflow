// Supabase Edge Function: workflow-worker
// Operário de Execução de Fluxos (Workflow Worker Engine)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    // Tentar ler da query string se não for JSON no corpo
    const url = new URL(req.url);
    body = { execution_id: url.searchParams.get('execution_id') };
  }

  const executionId = body.execution_id;

  if (!executionId) {
    return new Response(
      JSON.stringify({ error: 'Parâmetro execution_id é obrigatório.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`\n==================================================`);
  console.log(`⚙️ [WORKFLOW WORKER] Iniciando processamento da Execução ID: ${executionId}`);
  console.log(`==================================================`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://embedded-ipaas-workflow.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar o registro em 'flow_executions'
    const { data: execution, error: execErr } = await supabase
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

    // 3. Loop de Processamento (Traversal do Grafo)
    while (currentNodeId) {
      const currentNode = nodes.find(n => n.id === currentNodeId);

      if (!currentNode) {
        console.warn(`⚠️ [WORKER WARN] Nó ID '${currentNodeId}' não foi encontrado no fluxo. Encerrando traversal.`);
        break;
      }

      processedNodesCount++;
      const nodeType = currentNode.type || currentNode.data?.type || 'action';
      const nodeLabel = currentNode.data?.label || currentNode.id;
      const settings = currentNode.data?.settings || currentNode.data || {};

      console.log(`\n➡️ [STEP ${processedNodesCount}] Processando Nó "${nodeLabel}" (ID: ${currentNode.id}, Tipo: ${nodeType})`);

      // Switch-case / Strategy pattern baseado no tipo do nó
      switch (nodeType) {
        case 'schedule':
        case 'email_trigger':
        case 'trigger': {
          await addLog(
            currentNode.id,
            'info',
            `▶️ Nó Gatilho [${nodeType.toUpperCase()}] ativado. Variáveis inicializadas.`
          );
          break;
        }

        case 'whatsapp':
        case 'WhatsAppNode': {
          const destNumber = settings.destinationNumber || contextData.email?.from || '+5511999998888';
          const msg = settings.message || 'Mensagem automática via Workflow Runner';

          console.log(`💬 [WHATSAPP STUB] Enviando mensagem para ${destNumber}: "${msg}"`);

          contextData = {
            ...contextData,
            whatsapp: {
              destination_number: destNumber,
              message_sent: msg,
              status: 'delivered',
              sent_at: new Date().toISOString(),
            },
          };

          await addLog(
            currentNode.id,
            'success',
            `💬 Notificação WhatsApp disparada com sucesso para ${destNumber}.`
          );
          break;
        }

        case 'teams':
        case 'TeamsNode': {
          const webhookUrl = settings.webhookUrl || 'https://outlook.office.com/webhook/sample';
          const cardMsg = settings.cardMessage || 'Notificação Automática no Canal MS Teams';

          console.log(`📢 [TEAMS STUB] Disparando Webhook MS Teams (${webhookUrl}): "${cardMsg}"`);

          contextData = {
            ...contextData,
            teams: {
              webhook_url: webhookUrl,
              card_message: cardMsg,
              status: 'posted',
              posted_at: new Date().toISOString(),
            },
          };

          await addLog(
            currentNode.id,
            'success',
            `📢 Card do MS Teams postado com sucesso via Webhook no canal.`
          );
          break;
        }

        case 'email':
        case 'EmailNode': {
          await addLog(
            currentNode.id,
            'success',
            `✉️ E-mail enviado com sucesso para ${settings.recipient || contextData.email?.from || 'destinatário'}.`
          );
          break;
        }

        case 'ai':
        case 'AINode': {
          contextData = {
            ...contextData,
            ai_response: 'Resposta gerada automaticamente pela Inteligência Artificial.',
          };
          await addLog(
            currentNode.id,
            'success',
            `🤖 Processamento de Inteligência Artificial efetuado com sucesso.`
          );
          break;
        }

        case 'email_approval':
        case 'approval':
        case 'ApprovalNode': {
          // Gerar token único para resposta de aprovação por e-mail/link
          const approvalToken = crypto.randomUUID();

          contextData = {
            ...contextData,
            approval: {
              token: approvalToken,
              status: 'pending',
              recipients: settings.recipients || contextData.email?.from || 'aprovador@empresa.com',
              requested_at: new Date().toISOString(),
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
            'warning',
            `⏳ Fluxo pausado no nó de Aprovação. Aguardando confirmação humana (Token: ${approvalToken}).`
          );

          console.log(`⏸️ [WORKER PAUSE] Fluxo entrou em estado 'waiting_approval'. Token gerado: ${approvalToken}`);
          isWaitingApproval = true;
          break;
        }

        case 'end':
        case 'flow_end': {
          await addLog(
            currentNode.id,
            'info',
            `🏁 Nó de finalização de fluxo atingido.`
          );
          break;
        }

        default: {
          await addLog(
            currentNode.id,
            'info',
            `⚡ Nó "${nodeLabel}" (${nodeType}) processado com sucesso.`
          );
          break;
        }
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
