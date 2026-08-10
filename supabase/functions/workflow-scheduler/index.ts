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
  console.log(`⏰ [WORKFLOW SCHEDULER 24/7] Ticker executado às: ${now.toISOString()}`);
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

    // Data e Hora no fuso horário oficial de Brasília (America/Sao_Paulo UTC-3)
    const spDateStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const spDate = new Date(spDateStr);

    const pad = (n: number) => String(n).padStart(2, '0');
    const currentLocalTime = `${pad(spDate.getHours())}:${pad(spDate.getMinutes())}`; // Ex: "20:45"
    const currentDayOfWeek = spDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const currentDayOfMonth = spDate.getDate(); // 1..31

    console.log(`🕒 [SCHEDULER SP TIME] Hora Brasília: ${currentLocalTime} | Dia da Semana: ${currentDayOfWeek} | Dia do Mês: ${currentDayOfMonth}`);

    let evaluatedCount = 0;
    let scheduledNodesCount = 0;
    let triggeredCount = 0;
    const triggeredExecutions: any[] = [];

    // 2. Avaliar cada fluxo no banco
    for (const workflow of allWorkflows) {
      evaluatedCount++;

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
        const cronExpr = (
          scheduleNode.data?.config?.cron ||
          scheduleNode.data?.config?.cronExpression ||
          scheduleNode.data?.scheduleConfig?.cronExpression ||
          scheduleNode.data?.cronExpression ||
          ''
        ).trim();

        const targetTime = (
          scheduleNode.data?.scheduleConfig?.time ||
          scheduleNode.data?.config?.time ||
          scheduleNode.data?.time ||
          ''
        ).trim();

        const recurrenceType = 
          scheduleNode.data?.scheduleConfig?.recurrenceType || 
          scheduleNode.data?.config?.recurrenceType || 
          'daily';

        const daysOfWeek: number[] = 
          scheduleNode.data?.scheduleConfig?.daysOfWeek || 
          scheduleNode.data?.config?.daysOfWeek || 
          [0, 1, 2, 3, 4, 5, 6];

        const dayOfMonth: number = 
          scheduleNode.data?.scheduleConfig?.dayOfMonth || 
          scheduleNode.data?.config?.dayOfMonth || 
          1;

        console.log(`🔍 [CHECK NODE "${scheduleNode.data?.label || scheduleNode.id}"] Fluxo: "${workflow.name}" | Time: '${targetTime}' | Cron: '${cronExpr}' | Recurr: '${recurrenceType}'`);

        let isDue = false;

        // Método 1: Correspondência de Horário Estruturado ("HH:MM")
        if (targetTime && targetTime === currentLocalTime) {
          if (recurrenceType === 'daily') {
            isDue = daysOfWeek.length === 0 || daysOfWeek.includes(currentDayOfWeek);
          } else if (recurrenceType === 'weekly') {
            isDue = daysOfWeek.includes(currentDayOfWeek);
          } else if (recurrenceType === 'monthly') {
            isDue = currentDayOfMonth === dayOfMonth;
          }
        }

        // Método 2: Correspondência via Expressão Cron (5 campos)
        if (!isDue && cronExpr && cronExpr.split(' ').length >= 5) {
          try {
            const intervalSp = cronParser.parseExpression(cronExpr, { tz: 'America/Sao_Paulo', currentDate: now });
            const prevSp = intervalSp.prev().toDate();
            const diffSp = Math.abs((now.getTime() - prevSp.getTime()) / 1000);

            const intervalUtc = cronParser.parseExpression(cronExpr, { currentDate: now });
            const prevUtc = intervalUtc.prev().toDate();
            const diffUtc = Math.abs((now.getTime() - prevUtc.getTime()) / 1000);

            if (diffSp < 60 || diffUtc < 60) {
              isDue = true;
            }
          } catch (cErr: any) {
            console.warn(`⚠️ [CRON PARSE WARN] '${cronExpr}':`, cErr.message);
          }
        }

        if (isDue) {
          // Trava de deduplicação por janela de 55 segundos
          const minuteCutoff = new Date(now.getTime() - 55000).toISOString();
          const { data: existingExec } = await supabase
            .from('flow_executions')
            .select('id')
            .eq('workflow_id', workflow.id)
            .gte('started_at', minuteCutoff)
            .maybeSingle();

          if (existingExec) {
            console.log(`⏸️ [SCHEDULER DEDUP] Fluxo "${workflow.name}" já disparado no minuto atual (Exec ID: ${existingExec.id}). Ignorando.`);
            continue;
          }

          console.log(`🚀 [SCHEDULER MATCH!] Gatilho agendado devido! Hora SP: ${currentLocalTime} | Iniciando execução para "${workflow.name}"...`);

          const schedExecId = crypto.randomUUID();
          const executionPayload = {
            id: schedExecId,
            workflow_id: workflow.id,
            status: 'running',
            current_node_id: scheduleNode.id,
            context_data: {
              trigger: 'schedule',
              cron_expression: cronExpr,
              target_time: targetTime,
              schedule_node_id: scheduleNode.id,
              fired_at: now.toISOString(),
              fired_local_time: currentLocalTime
            },
            started_at: now.toISOString(),
          };

          const { data: newExec, error: execErr } = await supabase
            .from('flow_executions')
            .insert([executionPayload])
            .select()
            .single();

          if (execErr) {
            console.error(`❌ [SCHEDULER INSERT ERROR] Falha ao registrar execução para "${workflow.name}":`, execErr);
          } else {
            const execId = newExec?.id || schedExecId;
            triggeredCount++;
            triggeredExecutions.push({
              execution_id: execId,
              workflow_id: workflow.id,
              workflow_name: workflow.name,
              fired_local_time: currentLocalTime,
            });

            await supabase.from('execution_logs').insert([
              {
                execution_id: execId,
                node_id: scheduleNode.id,
                status: 'info',
                log_message: `⏰ Disparo automático acionado pelo Ticker 24/7 (Hora SP: '${currentLocalTime}')`,
                created_at: now.toISOString(),
              },
            ]);

            // Invocação assíncrona da Edge Function workflow-worker
            try {
              console.log(`⚡ [TRIGGER WORKER] Invocando workflow-worker para Exec ID: ${execId}...`);
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
              console.log(`✅ [WORKER RESPONSE] Execução ${execId} iniciada. Status: ${workerResult.status || 'running'}`);
            } catch (wErr: any) {
              console.error(`⚠️ [WORKER ERROR] Falha ao invocar workflow-worker:`, wErr.message);
            }
          }
        } else {
          console.log(`⏳ [SCHEDULER NO MATCH] Nó agendado não é devido no minuto atual (${currentLocalTime}).`);
        }
      }
    }

    console.log(`\n==================================================`);
    console.log(`📊 [SCHEDULER SUMMARY] Ticker Concluído:`);
    console.log(`   - Fluxos Avaliados: ${evaluatedCount}`);
    console.log(`   - Nós Agendados Verificados: ${scheduledNodesCount}`);
    console.log(`   - Execuções Disparadas: ${triggeredCount}`);
    console.log(`==================================================\n`);

    return new Response(
      JSON.stringify({
        success: true,
        evaluated_workflows: evaluatedCount,
        scheduled_nodes: scheduledNodesCount,
        triggered_executions: triggeredCount,
        executions: triggeredExecutions,
        timestamp: now.toISOString(),
        local_time_sp: currentLocalTime
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
