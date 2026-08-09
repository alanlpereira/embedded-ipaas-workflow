// Supabase Edge Function: workflow-scheduler
// Motor de Agendamento Contínuo para Disparo de Fluxos Baseados em Tempo (Cron Ticker 24/7)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import cronParser from 'https://esm.sh/cron-parser@4.9.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const now = new Date();
  console.log(`\n==================================================`);
  console.log(`⏰ [WORKFLOW SCHEDULER] Ticker iniciado às: ${now.toISOString()}`);
  console.log(`==================================================`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wurfruxigmajgnqsyleq.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar fluxos em ambas as tabelas 'workflows' e 'flowcharts'
    const { data: workflowsTable } = await supabase
      .from('workflows')
      .select('id, name, nodes, is_published, is_active');

    const { data: flowchartsTable } = await supabase
      .from('flowcharts')
      .select('id, name, nodes, is_published, is_active');

    // Consolidar fluxos sem duplicatas por ID
    const workflowMap = new Map<string, any>();
    (workflowsTable || []).forEach(w => workflowMap.set(w.id, w));
    (flowchartsTable || []).forEach(w => {
      if (!workflowMap.has(w.id)) workflowMap.set(w.id, w);
    });

    const allWorkflows = Array.from(workflowMap.values());
    console.log(`📊 [SCHEDULER STATS] Total de fluxos consolidados no banco: ${allWorkflows.length}`);

    let evaluatedCount = 0;
    let scheduledNodesCount = 0;
    let triggeredCount = 0;
    const triggeredExecutions: any[] = [];

    // Formatação de hora local no fuso horário do Brasil (America/Sao_Paulo UTC-3)
    const localHourMin = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });

    // 2. Iterar e avaliar cada fluxo
    for (const workflow of allWorkflows) {
      evaluatedCount++;

      // Considerar o fluxo ativo se is_active não for explicitamente false OU se is_published for true/null
      const isActive = workflow.is_active !== false || workflow.is_published === true;
      if (!isActive) {
        console.log(`⏸️ [SCHEDULER] Fluxo "${workflow.name}" (ID: ${workflow.id}) está INATIVO. Ignorando.`);
        continue;
      }

      const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
      const scheduleNodes = nodes.filter((n: any) => 
        n.type === 'schedule' || 
        n.data?.type === 'schedule' ||
        (n.data?.label && String(n.data.label).toLowerCase().includes('agendamento'))
      );

      if (scheduleNodes.length === 0) {
        continue;
      }

      scheduledNodesCount += scheduleNodes.length;

      for (const scheduleNode of scheduleNodes) {
        const cronExpression =
          scheduleNode.data?.cronExpression ||
          scheduleNode.data?.scheduleConfig?.cronExpression ||
          scheduleNode.data?.config?.cronExpression ||
          '0 9 * * *';
        const scheduledTime = scheduleNode.data?.scheduleConfig?.time || scheduleNode.data?.config?.time;

        console.log(`🔍 [SCHEDULER CHECK] Avaliando nó agendado "${scheduleNode.data?.label || scheduleNode.id}" no fluxo "${workflow.name}". Cron: '${cronExpression}' | Time: '${scheduledTime || 'N/A'}' | Hora SP Atual: '${localHourMin}'`);

        try {
          let isDue = false;

          // A) Verificação estrita se o horário configurado ("HH:MM") coincide com a hora de São Paulo no minuto atual
          if (scheduledTime && scheduledTime === localHourMin) {
            isDue = true;
          }

          // B) Verificação complementar via cron-parser com suporte a America/Sao_Paulo e UTC
          if (!isDue) {
            try {
              const intervalSp = cronParser.parseExpression(cronExpression, { tz: 'America/Sao_Paulo', currentDate: now });
              const prevSp = intervalSp.prev().toDate();
              const diffSp = Math.abs((now.getTime() - prevSp.getTime()) / 1000);

              const intervalUtc = cronParser.parseExpression(cronExpression, { currentDate: now });
              const prevUtc = intervalUtc.prev().toDate();
              const diffUtc = Math.abs((now.getTime() - prevUtc.getTime()) / 1000);

              isDue = diffSp < 60 || diffUtc < 60;
            } catch (pErr) {
              // Ignore cron parse errors and proceed
            }
          }

          if (isDue) {
            // Deduplicação estrita: impedir múltiplos disparos no mesmo minuto
            const minuteCutoff = new Date(now.getTime() - 55000).toISOString();
            const { data: existingExec } = await supabase
              .from('flow_executions')
              .select('id')
              .eq('workflow_id', workflow.id)
              .gte('started_at', minuteCutoff)
              .maybeSingle();

            if (existingExec) {
              console.log(`⏸️ [SCHEDULER DEDUP] Fluxo "${workflow.name}" já foi disparado no minuto atual (Exec ID: ${existingExec.id}). Ignorando duplicata.`);
              continue;
            }

            console.log(`🚀 [SCHEDULER MATCH!] Cron '${cronExpression}' / Time '${scheduledTime}' devido! Iniciando execução do fluxo "${workflow.name}"...`);

            const schedExecId = crypto.randomUUID();
            const executionPayload = {
              id: schedExecId,
              workflow_id: workflow.id,
              status: 'running',
              current_node_id: scheduleNode.id,
              context_data: {
                trigger: 'schedule',
                cron_expression: cronExpression,
                schedule_node_id: scheduleNode.id,
                fired_at: now.toISOString(),
                fired_local_time: localHourMin
              },
              started_at: now.toISOString(),
            };

            const { data: newExec, error: execErr } = await supabase
              .from('flow_executions')
              .insert([executionPayload])
              .select()
              .single();

            if (execErr) {
              console.error(`❌ [SCHEDULER INSERT ERROR] Falha ao criar execução para "${workflow.name}":`, execErr);
            } else {
              const execId = newExec?.id || schedExecId;
              triggeredCount++;
              triggeredExecutions.push({
                execution_id: execId,
                workflow_id: workflow.id,
                workflow_name: workflow.name,
                cron_expression: cronExpression,
                local_time: localHourMin
              });

              // Log inicial na tabela execution_logs
              await supabase.from('execution_logs').insert([
                {
                  execution_id: execId,
                  node_id: scheduleNode.id,
                  status: 'info',
                  log_message: `⏰ Disparo automático acionado pelo Ticker 24/7 (Hora SP: '${localHourMin}', Cron: '${cronExpression}')`,
                  created_at: now.toISOString(),
                },
              ]);

              // 🚀 PASSO CRÍTICO: Acionar a Edge Function workflow-worker para executar os nós do fluxo
              try {
                console.log(`⚡ [SCHEDULER TRIGGER WORKER] Invocando workflow-worker para execução ID: ${execId}...`);
                const workerResp = await fetch(`${supabaseUrl}/functions/v1/workflow-worker`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                  },
                  body: JSON.stringify({
                    execution_id: execId,
                    workflow_id: workflow.id
                  })
                });
                const workerResult = await workerResp.json();
                console.log(`✅ [SCHEDULER WORKER RESPONSE] Execução ${execId} iniciada. Status: ${workerResult.status || 'running'}`);
              } catch (wErr: any) {
                console.error(`⚠️ [SCHEDULER WORKER ERROR] Erro ao invocar workflow-worker:`, wErr.message);
              }
            }
          } else {
            console.log(`⏳ [SCHEDULER NO MATCH] Cron '${cronExpression}' / Time '${scheduledTime}' não é devido no minuto atual.`);
          }
        } catch (cronErr: any) {
          console.error(`⚠️ [SCHEDULER INVALID CRON] Expressão cron inválida '${cronExpression}' no fluxo "${workflow.name}":`, cronErr.message);
        }
      }
    }

    console.log(`\n==================================================`);
    console.log(`📊 [SCHEDULER SUMMARY] Ticker Concluído:`);
    console.log(`   - Fluxos Consolidados Avaliados: ${evaluatedCount}`);
    console.log(`   - Nós Agendados Verificados: ${scheduledNodesCount}`);
    console.log(`   - Execuções Disparadas no Worker: ${triggeredCount}`);
    console.log(`==================================================\n`);

    return new Response(
      JSON.stringify({
        success: true,
        evaluated_workflows: evaluatedCount,
        scheduled_nodes: scheduledNodesCount,
        triggered_executions: triggeredCount,
        executions: triggeredExecutions,
        timestamp: now.toISOString(),
        local_time_sp: localHourMin
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error(`💥 [SCHEDULER FATAL ERROR]:`, err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
