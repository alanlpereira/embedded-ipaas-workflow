// Supabase Edge Function: workflow-scheduler
// Motor de Agendamento Contínuo para Disparo de Fluxos Baseados em Tempo (Cron Ticker)

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://embedded-ipaas-workflow.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar todos os fluxos cadastrados na tabela 'flowcharts'
    const { data: workflows, error: fetchErr } = await supabase
      .from('flowcharts')
      .select('id, name, nodes, is_published, is_active');

    if (fetchErr) {
      console.error(`❌ [SCHEDULER ERROR] Erro ao consultar a tabela flowcharts:`, fetchErr);
      return new Response(
        JSON.stringify({ error: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allWorkflows = workflows || [];
    console.log(`📊 [SCHEDULER STATS] Total de fluxos salvos no banco: ${allWorkflows.length}`);

    let evaluatedCount = 0;
    let scheduledNodesCount = 0;
    let triggeredCount = 0;
    const triggeredExecutions: any[] = [];

    // 2. Iterar e avaliar cada fluxo
    for (const workflow of allWorkflows) {
      evaluatedCount++;

      // Verificar se o fluxo está ativo (se possuir flag is_active ou is_published)
      const isActive = workflow.is_active !== false && workflow.is_published !== false;
      if (!isActive) {
        console.log(`⏸️ [SCHEDULER] Fluxo "${workflow.name}" (ID: ${workflow.id}) está DESLIGADO/INATIVO. Ignorando.`);
        continue;
      }

      const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
      const scheduleNodes = nodes.filter((n: any) => n.type === 'schedule');

      if (scheduleNodes.length === 0) {
        continue;
      }

      scheduledNodesCount += scheduleNodes.length;

      for (const scheduleNode of scheduleNodes) {
        const cronExpression =
          scheduleNode.data?.cronExpression ||
          scheduleNode.data?.scheduleConfig?.cronExpression ||
          '0 9 * * *';

        console.log(`🔍 [SCHEDULER CHECK] Avaliando nó agendado "${scheduleNode.data?.label || scheduleNode.id}" no fluxo "${workflow.name}". Cron: '${cronExpression}'`);

        try {
          // Utilizar cron-parser para determinar se o gatilho dispara no minuto atual
          const interval = cronParser.parseExpression(cronExpression, { currentDate: now });
          const prevDate = interval.prev().toDate();
          const diffSeconds = Math.abs((now.getTime() - prevDate.getTime()) / 1000);

          // Se a execução anterior do cron ocorreu há menos de 60 segundos (no mesmo minuto)
          const isDue = diffSeconds < 60;

          if (isDue) {
            console.log(`🚀 [SCHEDULER MATCH!] O cron '${cronExpression}' bateu com o horário atual! Disparando execução do fluxo "${workflow.name}"...`);

            // 3. Insere registro na tabela 'flow_executions'
            const executionPayload = {
              workflow_id: workflow.id,
              status: 'running',
              current_node_id: scheduleNode.id,
              context_data: {
                trigger: 'schedule',
                cron_expression: cronExpression,
                schedule_node_id: scheduleNode.id,
                fired_at: now.toISOString(),
              },
              started_at: now.toISOString(),
            };

            const { data: newExec, error: execErr } = await supabase
              .from('flow_executions')
              .insert([executionPayload])
              .select()
              .single();

            if (execErr) {
              console.error(`❌ [SCHEDULER INSERT ERROR] Falha ao enfileirar execução para "${workflow.name}":`, execErr);
            } else {
              triggeredCount++;
              triggeredExecutions.push({
                execution_id: newExec?.id || 'exec-scheduled',
                workflow_id: workflow.id,
                workflow_name: workflow.name,
                cron_expression: cronExpression,
              });

              // 4. Insere o primeiro log na tabela 'execution_logs'
              if (newExec?.id) {
                await supabase.from('execution_logs').insert([
                  {
                    execution_id: newExec.id,
                    node_id: scheduleNode.id,
                    status: 'info',
                    log_message: `⏰ Disparo automático efetuado pelo Motor de Agendamento (Cron Ticker: '${cronExpression}')`,
                    created_at: now.toISOString(),
                  },
                ]);
              }

              console.log(`✅ [SCHEDULER ENQUEUED] Execução ID: ${newExec?.id || 'OK'} criada com sucesso com status 'running'!`);
            }
          } else {
            console.log(`⏳ [SCHEDULER NO MATCH] Cron '${cronExpression}' não é devido neste minuto (último: ${prevDate.toLocaleTimeString()}).`);
          }
        } catch (cronErr: any) {
          console.error(`⚠️ [SCHEDULER INVALID CRON] Expressão cron inválida '${cronExpression}' no fluxo "${workflow.name}":`, cronErr.message);
        }
      }
    }

    console.log(`\n==================================================`);
    console.log(`📊 [SCHEDULER SUMMARY] Ticker Concluído:`);
    console.log(`   - Fluxos Avaliados: ${evaluatedCount}`);
    console.log(`   - Nós de Agendamento Verificados: ${scheduledNodesCount}`);
    console.log(`   - Execuções Enfileiradas (Status Running): ${triggeredCount}`);
    console.log(`==================================================\n`);

    return new Response(
      JSON.stringify({
        success: true,
        evaluated_workflows: evaluatedCount,
        scheduled_nodes: scheduledNodesCount,
        triggered_executions: triggeredCount,
        executions: triggeredExecutions,
        timestamp: now.toISOString(),
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
