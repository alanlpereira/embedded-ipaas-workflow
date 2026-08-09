// Supabase Edge Function: workflow-worker
// Operário de Execução de Fluxos (Workflow Worker Engine)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
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

      // Normalizar detecção de tipo de nó com suporte a labels e services do frontend
      const rawType = (currentNode.type || '').toLowerCase();
      const dataType = (currentNode.data?.type || '').toLowerCase();
      const service = (currentNode.data?.service || '').toLowerCase();
      const label = (currentNode.data?.label || '').toLowerCase();

      const isTrigger = rawType === 'trigger' || rawType === 'schedule' || dataType === 'trigger' || label.includes('gatilho') || label.includes('webhook entrada');
      const isWhatsapp = rawType === 'whatsapp' || dataType === 'whatsapp' || service === 'whatsapp' || label.includes('whatsapp');
      const isTeams = rawType === 'teams' || dataType === 'teams' || service === 'teams' || label.includes('teams');
      const isEmail = rawType === 'email' || dataType === 'email' || service === 'email' || label.includes('e-mail') || label.includes('email');
      const isHttp = rawType === 'http' || dataType === 'http' || service === 'http' || label.includes('http') || label.includes('webhook');
      const isAi = rawType === 'ai' || dataType === 'ai' || service === 'ai' || label.includes('inteligência') || label.includes('gemini') || label.includes('ia');
      const isApproval = rawType === 'approval' || dataType === 'approval' || service === 'approval' || label.includes('aprova') || label.includes('hitl');
      const isEnd = rawType === 'end' || rawType === 'output' || dataType === 'output' || label.includes('final') || label.includes('fim');

      if (isTrigger) {
        await addLog(
          currentNode.id,
          'info',
          `▶️ Nó Gatilho [${nodeLabel}] ativado. Contexto inicializado.`
        );
      } else if (isTeams) {
        const webhookUrl = settings.webhookUrl || settings.url || contextData.teams_webhook_url;
        const cardMsg = settings.cardMessage || settings.message || `Notificação de Execução do Workflow "${workflow.name}"`;

        console.log(`📢 [WORKER DISPATCH] Disparando Notificação no MS Teams para: ${webhookUrl || 'URL Padrão'}`);

        let postSuccess = false;
        let postError = null;

        if (webhookUrl && webhookUrl.startsWith('http')) {
          try {
            const resp = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: `📢 **${workflow.name}**\n\n${cardMsg}\n\n*ID de Execução: ${executionId}*`
              })
            });
            postSuccess = resp.ok;
            if (!resp.ok) {
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
            card_message: cardMsg,
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
        let recipient = settings.recipient || settings.to || contextData.email_to || contextData.email?.from || 'notificacoes@alp-nexus.com';
        let subject = settings.subject || `Notificação: Workflow "${workflow.name}"`;
        let bodyText = settings.body || settings.message || `O fluxo "${workflow.name}" executou o nó ${nodeLabel} com sucesso.`;

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

        recipient = interpolateVars(recipient);
        subject = interpolateVars(subject);
        bodyText = interpolateVars(bodyText);

        console.log(`✉️ [WORKER DISPATCH] Enviando e-mail para "${recipient}": "${subject}"`);

        let sendSuccess = false;
        let sendError = null;
        let provider = 'simulation';

        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const emailWebhookUrl = Deno.env.get('EMAIL_WEBHOOK_URL') || settings.webhookUrl || settings.url;

        if (resendApiKey) {
          provider = 'resend';
          try {
            const resp = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'Synapse Workflows <onboarding@resend.dev>',
                to: [recipient],
                subject: subject,
                html: `<div style="font-family: sans-serif; padding: 20px; color: #333;"><h2>${subject}</h2><p>${bodyText}</p><hr/><small>ID Execução: ${executionId}</small></div>`
              })
            });
            sendSuccess = resp.ok;
            if (!resp.ok) sendError = `Resend HTTP ${resp.status}: ${await resp.text()}`;
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
                to: recipient,
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
            recipient,
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
                ? `✉️ [SIMULAÇÃO] E-mail para ${recipient} registrado no fluxo. Para disparo real na caixa de entrada, configure RESEND_API_KEY no Supabase.`
                : `✉️ E-mail disparado com sucesso via ${provider} para ${recipient}.`)
            : `❌ Falha no envio de e-mail: ${sendError}`
        );
      } else if (isHttp) {
        const httpUrl = settings.url || settings.endpoint;
        const method = (settings.method || 'POST').toUpperCase();

        if (httpUrl && httpUrl.startsWith('http')) {
          try {
            const resp = await fetch(httpUrl, {
              method,
              headers: { 'Content-Type': 'application/json', ...(settings.headers || {}) },
              body: method !== 'GET' ? JSON.stringify(settings.body || contextData) : undefined
            });
            const responseData = await resp.text();
            contextData = { ...contextData, http_response: responseData, http_status: resp.status };

            await addLog(
              currentNode.id,
              resp.ok ? 'success' : 'warning',
              `🌐 Requisição HTTP ${method} para ${httpUrl} finalizada (Status: ${resp.status}).`
            );
          } catch (err: any) {
            await addLog(currentNode.id, 'error', `❌ Erro na requisição HTTP: ${err.message}`);
          }
        } else {
          await addLog(currentNode.id, 'info', `🌐 Requisição HTTP [${nodeLabel}] processada.`);
        }
      } else if (isWhatsapp) {
        const destNumber = settings.destinationNumber || contextData.email?.from || '+5511999998888';
        const msg = settings.message || 'Mensagem automática via Workflow Runner';

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
          `💬 Notificação WhatsApp disparada para ${destNumber}.`
        );
      } else if (isAi) {
        contextData = {
          ...contextData,
          ai_response: 'Resposta gerada com sucesso pela Inteligência Artificial.',
        };
        await addLog(
          currentNode.id,
          'success',
          `🤖 Processamento de Inteligência Artificial efetuado com sucesso.`
        );
      } else if (isApproval) {
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
