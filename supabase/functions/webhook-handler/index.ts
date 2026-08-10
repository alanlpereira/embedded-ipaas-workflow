// Supabase Edge Function: webhook-handler
// Endpoint Público e Exclusivo para Recepção de Webhooks de Nós "Gatilho / Evento"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  // Tratar requisição OPTIONS (CORS preflight)
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const urlObj = new URL(req.url);
  
  // Extrair nodeId e flowchartId da URL (suporta query params e path params)
  let nodeId = urlObj.searchParams.get('nodeId') || urlObj.searchParams.get('node_id');
  let flowchartId = urlObj.searchParams.get('flowchartId') || urlObj.searchParams.get('workflowId') || urlObj.searchParams.get('flowchart_id');

  // Fallback via path segments (ex: /webhook-handler/<flowchartId>/<nodeId> ou /webhook-handler/<nodeId>)
  const pathSegments = urlObj.pathname.split('/').filter(Boolean);
  const handlerIdx = pathSegments.indexOf('webhook-handler');
  if (handlerIdx !== -1 && pathSegments.length > handlerIdx + 1) {
    if (pathSegments.length >= handlerIdx + 3) {
      flowchartId = flowchartId || pathSegments[handlerIdx + 1];
      nodeId = nodeId || pathSegments[handlerIdx + 2];
    } else {
      nodeId = nodeId || pathSegments[handlerIdx + 1];
    }
  }

  console.log(`\n==================================================`);
  console.log(`📥 [WEBHOOK HANDLER] Requisição recebida: ${req.method} ${req.url}`);
  console.log(`   - Node ID: ${nodeId || 'N/A'}`);
  console.log(`   - Flowchart ID: ${flowchartId || 'N/A'}`);
  console.log(`==================================================`);

  if (!nodeId && !flowchartId) {
    return new Response(
      JSON.stringify({
        error: 'Identificador do nó não fornecido.',
        usage: 'Forneça ?nodeId=<ID_DO_NO> ou ?flowchartId=<ID_DO_FLUXO>&nodeId=<ID_DO_NO>'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wurfruxigmajgnqsyleq.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse do Body Payload (JSON, FormData, ou Texto)
    let bodyData: any = null;
    const contentType = req.headers.get('content-type') || '';
    
    try {
      if (contentType.includes('application/json')) {
        bodyData = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        bodyData = {};
        formData.forEach((value, key) => {
          bodyData[key] = value;
        });
      } else {
        const textRaw = await req.text();
        try {
          bodyData = JSON.parse(textRaw);
        } catch {
          bodyData = textRaw ? { raw_body: textRaw } : {};
        }
      }
    } catch {
      bodyData = {};
    }

    // Extrair cabeçalhos principais para repassar no contexto
    const headersData: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (!['authorization', 'cookie'].includes(key.toLowerCase())) {
        headersData[key] = value;
      }
    });

    // Extrair query params adicionais
    const queryData: Record<string, string> = {};
    urlObj.searchParams.forEach((val, key) => {
      if (!['nodeId', 'node_id', 'flowchartId', 'workflowId', 'flowchart_id'].includes(key)) {
        queryData[key] = val;
      }
    });

    // Localizar o fluxo correspondente no banco
    let targetWorkflow: any = null;

    if (flowchartId) {
      const { data: fc } = await supabase.from('flowcharts').select('id, name, nodes').eq('id', flowchartId).maybeSingle();
      targetWorkflow = fc;
      if (!targetWorkflow) {
        const { data: wf } = await supabase.from('workflows').select('id, name, nodes').eq('id', flowchartId).maybeSingle();
        targetWorkflow = wf;
      }
    }

    // Se não encontrou por flowchartId ou se só foi fornecido nodeId, buscar por nodeId dentro do JSON de nós
    if (!targetWorkflow && nodeId) {
      const [{ data: fcAll }, { data: wfAll }] = await Promise.all([
        supabase.from('flowcharts').select('id, name, nodes'),
        supabase.from('workflows').select('id, name, nodes'),
      ]);

      const allFlows = [...(fcAll || []), ...(wfAll || [])];
      targetWorkflow = allFlows.find((f: any) => {
        const nodesArr = Array.isArray(f.nodes) ? f.nodes : [];
        return nodesArr.some((n: any) => n.id === nodeId);
      });
    }

    if (!targetWorkflow) {
      console.warn(`⚠️ [WEBHOOK HANDLER WARN] Fluxo não encontrado para Node ID: ${nodeId}`);
      return new Response(
        JSON.stringify({ error: `Fluxo correspondente ao nó ${nodeId} não encontrado no banco de dados.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Identificar o nó exato
    const nodes = Array.isArray(targetWorkflow.nodes) ? targetWorkflow.nodes : [];
    const triggerNode = nodes.find((n: any) => n.id === nodeId) || nodes.find((n: any) => n.type === 'trigger' || n.data?.type === 'trigger') || nodes[0];

    console.log(`🎯 [WEBHOOK MATCH!] Fluxo: "${targetWorkflow.name}" (ID: ${targetWorkflow.id}) | Nó: "${triggerNode?.data?.label || triggerNode?.id}"`);

    // Criar a execução na tabela 'flow_executions'
    const execId = crypto.randomUUID();
    const executionPayload = {
      id: execId,
      workflow_id: targetWorkflow.id,
      status: 'running',
      current_node_id: triggerNode?.id || nodeId,
      context_data: {
        trigger: 'webhook_inbound',
        node_id: nodeId,
        payload: bodyData,
        data: bodyData,
        headers: headersData,
        query: queryData,
        received_at: new Date().toISOString(),
      },
      started_at: new Date().toISOString(),
    };

    const { error: execErr } = await supabase.from('flow_executions').insert([executionPayload]);
    if (execErr) {
      console.error(`❌ [WEBHOOK INSERT ERROR]:`, execErr);
      return new Response(
        JSON.stringify({ error: 'Falha ao registrar execução no banco.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar log inicial
    await supabase.from('execution_logs').insert([
      {
        execution_id: execId,
        node_id: triggerNode?.id || nodeId,
        status: 'info',
        log_message: `📥 Webhook Inbound recebido via URL Exclusiva (Node ID: ${nodeId})`,
        created_at: new Date().toISOString(),
      },
    ]);

    // Invocar workflow-worker em segundo plano para executar os próximos nós
    try {
      console.log(`⚡ [TRIGGER WORKER] Invocando workflow-worker para Exec ID: ${execId}...`);
      await fetch(`${supabaseUrl}/functions/v1/workflow-worker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({
          execution_id: execId,
          workflow_id: targetWorkflow.id,
        }),
      });
    } catch (wErr: any) {
      console.error(`⚠️ [WORKER INVOCATION WARN]:`, wErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        execution_id: execId,
        workflow_id: targetWorkflow.id,
        workflow_name: targetWorkflow.name,
        node_id: nodeId,
        message: 'Webhook recebido com sucesso. Fluxo iniciado.',
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error(`💥 [WEBHOOK HANDLER FATAL ERROR]:`, err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno ao processar webhook.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
