// Supabase Edge Function: workflow-scheduler
// Motor de Agendamento Contínuo e Polling 60s para Disparo de Fluxos (Cron Ticker 24/7 & Event Polling)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import cronParser from 'https://esm.sh/cron-parser@4.9.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const now = new Date();
  console.log(`\n==================================================`);
  console.log(`⏰ [WORKFLOW SCHEDULER & POLLING 24/7] Ticker executado às: ${now.toISOString()}`);
  console.log(`==================================================`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://auth.alp-nexus.com';
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
    const currentLocalTime = `${pad(spDate.getHours())}:${pad(spDate.getMinutes())}`;
    const currentDayOfWeek = spDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const currentDayOfMonth = spDate.getDate(); // 1..31

    let evaluatedCount = 0;
    let scheduledNodesCount = 0;
    let triggeredCount = 0;
    const triggeredExecutions: any[] = [];

    // 2. Avaliar cada fluxo no banco
    for (const workflow of allWorkflows) {
      evaluatedCount++;
      const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];

      // A) AVALIAÇÃO DE NÓS DE AGENDAMENTO (type: 'schedule')
      const scheduleNodes = nodes.filter((n: any) => 
        n.type === 'schedule' || 
        n.data?.type === 'schedule' ||
        (n.data?.label && String(n.data.label).toLowerCase().includes('agendamento'))
      );

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

        let isDue = false;

        if (targetTime && targetTime === currentLocalTime) {
          if (recurrenceType === 'daily') {
            isDue = daysOfWeek.length === 0 || daysOfWeek.includes(currentDayOfWeek);
          } else if (recurrenceType === 'weekly') {
            isDue = daysOfWeek.includes(currentDayOfWeek);
          } else if (recurrenceType === 'monthly') {
            isDue = currentDayOfMonth === dayOfMonth;
          }
        }

        if (!isDue && cronExpr && cronExpr.split(' ').length >= 5) {
          try {
            // AVALIAÇÃO EXCLUSIVA DE FUSO HORÁRIO DE BRASÍLIA (America/Sao_Paulo UTC-3)
            // Removemos a verificação de diffUtc para evitar disparos às 05h00 AM (que é 08h00 AM UTC)
            const intervalSp = cronParser.parseExpression(cronExpr, { tz: 'America/Sao_Paulo', currentDate: now });
            const prevSp = intervalSp.prev().toDate();
            const diffSp = Math.abs((now.getTime() - prevSp.getTime()) / 1000);

            if (diffSp < 60) {
              isDue = true;
            }
          } catch (cErr: any) {
            // Ignore cron parse errors
          }
        }

        if (isDue) {
          // Trava de Deduplicação Rígida de 15 Minutos (900.000 ms) por Fluxo/Nome
          const lockoutCutoff = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
          
          const { data: existingExec } = await supabase
            .from('flow_executions')
            .select('id')
            .eq('workflow_id', workflow.id)
            .gte('started_at', lockoutCutoff)
            .maybeSingle();

          if (existingExec) {
            console.log(`⏸️ [DEDUPLICATION LOCKOUT] Fluxo "${workflow.name}" (ID: ${workflow.id}) já foi executado nos últimos 15 min. Ignorando disparo duplicado.`);
            continue;
          }

          console.log(`🚀 [SCHEDULE MATCH!] Cron/Horário devido (Hora SP: ${currentLocalTime}) | Iniciando "${workflow.name}"...`);

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

          if (!execErr) {
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

            const workerPromise = fetch(`${supabaseUrl}/functions/v1/workflow-worker`, {
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
            }).catch((wErr: any) => console.error(`⚠️ [WORKER ERROR]:`, wErr.message));

            if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
              EdgeRuntime.waitUntil(workerPromise);
            }
          }
        }
      }

      // B) AVALIAÇÃO DE NÓS DE GATILHO / EVENTO (type: 'trigger' - Polling 60s em API Externa via GET)
      const triggerNodes = nodes.filter((n: any) => 
        n.type === 'trigger' || 
        n.data?.type === 'trigger' ||
        (n.data?.label && String(n.data.label).toLowerCase().includes('gatilho / evento'))
      );

      for (const triggerNode of triggerNodes) {
        const originUrl = (
          triggerNode.data?.httpConfig?.url ||
          triggerNode.data?.config?.url ||
          triggerNode.data?.url ||
          ''
        ).trim();

        const credentialId = (
          triggerNode.data?.httpConfig?.credential_id ||
          triggerNode.data?.config?.credential_id ||
          ''
        ).trim();

        if (!originUrl) {
          continue;
        }

        console.log(`🔍 [TRIGGER POLLING 60s] Verificando API de Origem via HTTP GET: '${originUrl}' no fluxo "${workflow.name}"...`);

        try {
          const reqHeaders: Record<string, string> = {
            'User-Agent': 'Synapse-Workflow-Engine/1.0',
            'Accept': 'application/json',
          };

          if (credentialId) {
            try {
              const { data: credRow } = await supabase
                .from('credentials_vault')
                .select('encrypted_token')
                .eq('id', credentialId)
                .maybeSingle();

              if (credRow?.encrypted_token) {
                reqHeaders['Authorization'] = `Bearer ${credRow.encrypted_token}`;
              }
            } catch (vErr: any) {
              console.warn(`⚠️ [VAULT DECRYPT WARN]:`, vErr.message);
            }
          }

          const apiResponse = await fetch(originUrl, {
            method: 'GET',
            headers: reqHeaders,
          });

          if (apiResponse.ok) {
            let responseData: any = null;
            const textRaw = await apiResponse.text();

            try {
              responseData = JSON.parse(textRaw);
            } catch {
              responseData = textRaw ? { raw_response: textRaw } : null;
            }

            const hasValidData = responseData !== null && responseData !== undefined && (
              (typeof responseData === 'object' && Object.keys(responseData).length > 0) ||
              (Array.isArray(responseData) && responseData.length > 0) ||
              (typeof responseData === 'string' && responseData.trim().length > 0)
            );

            if (hasValidData) {
              const minuteCutoff = new Date(now.getTime() - 55000).toISOString();
              const { data: existingExec } = await supabase
                .from('flow_executions')
                .select('id')
                .eq('workflow_id', workflow.id)
                .gte('started_at', minuteCutoff)
                .maybeSingle();

              if (existingExec) {
                console.log(`⏸️ [TRIGGER DEDUP] Evento da API "${originUrl}" já processado no minuto atual (Exec ID: ${existingExec.id}). Ignorando.`);
                continue;
              }

              console.log(`🚀 [TRIGGER MATCH!] Dados recebidos da API de Origem '${originUrl}'! Avançando fluxo "${workflow.name}"...`);

              const trigExecId = crypto.randomUUID();
              const executionPayload = {
                id: trigExecId,
                workflow_id: workflow.id,
                status: 'running',
                current_node_id: triggerNode.id,
                context_data: {
                  trigger: 'event_api',
                  origin_url: originUrl,
                  trigger_node_id: triggerNode.id,
                  trigger_payload: responseData,
                  http_data: responseData,
                  fired_at: now.toISOString(),
                  fired_local_time: currentLocalTime,
                },
                started_at: now.toISOString(),
              };

              const { data: newExec, error: execErr } = await supabase
                .from('flow_executions')
                .insert([executionPayload])
                .select()
                .single();

              if (!execErr) {
                const execId = newExec?.id || trigExecId;
                triggeredCount++;
                triggeredExecutions.push({
                  execution_id: execId,
                  workflow_id: workflow.id,
                  workflow_name: workflow.name,
                  origin_url: originUrl,
                  fired_local_time: currentLocalTime,
                });

                await supabase.from('execution_logs').insert([
                  {
                    execution_id: execId,
                    node_id: triggerNode.id,
                    status: 'info',
                    log_message: `▶️ Gatilho / Evento ativado via polling HTTP GET na URL de Origem: ${originUrl}`,
                    created_at: now.toISOString(),
                  },
                ]);

                const trigWorkerPromise = fetch(`${supabaseUrl}/functions/v1/workflow-worker`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                  },
                  body: JSON.stringify({
                    execution_id: execId,
                    workflow_id: workflow.id,
                  }),
                }).catch((wErr: any) => console.error(`⚠️ [WORKER ERROR]:`, wErr.message));

                if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
                  EdgeRuntime.waitUntil(trigWorkerPromise);
                }
              }
            } else {
              console.log(`⏳ [TRIGGER NO DATA] API '${originUrl}' respondeu vazia/sem dados. Retornando à inatividade.`);
            }
          } else {
            console.log(`⏳ [TRIGGER HTTP ${apiResponse.status}] API '${originUrl}' não retornou 200 OK. Permanecendo inativo.`);
          }
        } catch (apiErr: any) {
          console.warn(`⚠️ [TRIGGER FETCH WARN] Falha ao consultar API de Origem '${originUrl}':`, apiErr.message);
        }
      }
    }

    console.log(`\n==================================================`);
    console.log(`📊 [SCHEDULER SUMMARY] Ticker Concluído:`);
    console.log(`   - Fluxos Avaliados: ${evaluatedCount}`);
    console.log(`   - Execuções Disparadas: ${triggeredCount}`);
    console.log(`==================================================\n`);

    return new Response(
      JSON.stringify({
        success: true,
        evaluated_workflows: evaluatedCount,
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
