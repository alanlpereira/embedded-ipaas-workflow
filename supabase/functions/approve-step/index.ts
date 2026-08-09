// Supabase Edge Function: approve-step
// Processador de Aprovação de Etapas do Workflow (Approval Decision Handler)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      const url = new URL(req.url);
      body = {
        token: url.searchParams.get('token'),
        decision: url.searchParams.get('decision'),
        execution_id: url.searchParams.get('execution_id'),
      };
    }

    const { token, decision, execution_id } = body;

    if (!token && !execution_id) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros token ou execution_id são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://embedded-ipaas-workflow.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const approved = decision === 'approved' || decision === true;
    const finalStatus = approved ? 'completed' : 'failed';

    if (execution_id) {
      await supabase
        .from('flow_executions')
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          context_data: { approval_decision: approved ? 'APPROVED' : 'REJECTED', decided_at: new Date().toISOString() },
        })
        .eq('id', execution_id);

      await supabase.from('execution_logs').insert([
        {
          execution_id,
          node_id: 'node-approval-1',
          status: approved ? 'success' : 'error',
          log_message: approved ? '✅ Decisão: APROVADO via Edge Function' : '❌ Decisão: REJEITADO via Edge Function',
          created_at: new Date().toISOString(),
        },
      ]);
    }

    return new Response(
      JSON.stringify({
        success: true,
        decision: approved ? 'APPROVED' : 'REJECTED',
        token,
        execution_id,
        updated_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erro ao processar aprovação.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
