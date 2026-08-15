// Supabase Edge Function: approve-step
// Processador de Aprovação de Etapas do Workflow (Approval Decision Handler Webhook)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Ignorar exceção ao ler formulário/GET
    }

    const token = body.token || body.approval_token || url.searchParams.get('token') || url.searchParams.get('approval_token');
    const rawDecision = body.decision || body.action || url.searchParams.get('decision') || url.searchParams.get('action') || 'APPROVED';
    const decidedBy = body.decided_by || url.searchParams.get('decided_by') || 'Gestor Mobile (Email / Webhook)';

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Parâmetro token é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const decision = (rawDecision.toUpperCase().includes('REJECT') || rawDecision.toUpperCase().includes('REJEIT'))
      ? 'REJECTED'
      : 'APPROVED';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://auth.alp-nexus.com';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Atualizar registro na tabela approval_tokens
    const { data: tokData } = await supabase
      .from('approval_tokens')
      .update({
        status: decision,
        decided_at: new Date().toISOString(),
        decided_by: decidedBy
      })
      .eq('token', token)
      .select('*')
      .maybeSingle();

    // 2. Disparar a retomada do fluxo via chamada HTTP para a workflow-worker Edge Function
    let workerRes: any = null;
    try {
      const workerResp = await fetch(`${supabaseUrl}/functions/v1/workflow-worker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({
          token: token,
          approval_token: token,
          decision: decision,
          decided_by: decidedBy
        })
      });
      workerRes = await workerResp.json();
    } catch (wErr: any) {
      console.warn(`⚠️ Erro ao acionar workflow-worker para o token ${token}:`, wErr);
    }

    // 3. Se for uma requisição de navegador (GET / HTML), retornar página visual amigável Zero Fricção
    const isHtmlRequest = req.headers.get('accept')?.includes('text/html') || req.method === 'GET';

    if (isHtmlRequest) {
      const isApproved = decision === 'APPROVED';
      const statusColor = isApproved ? '#10b981' : '#ef4444';
      const statusTitle = isApproved ? 'Aprovação Confirmada! ✅' : 'Solicitação Rejeitada ❌';
      const statusSubtitle = isApproved
        ? 'Sua aprovação foi registrada com sucesso. A próxima etapa do fluxo foi iniciada.'
        : 'Sua rejeição foi registrada. O fluxo seguiu o caminho de recusa.';

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusTitle} - Synapse Workflows</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #090d16; color: #f8fafc; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: rgba(15, 23, 42, 0.8); border: 1px solid ${statusColor}; border-radius: 20px; padding: 40px; text-align: center; max-width: 480px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.5); backdrop-filter: blur(12px); }
    .icon { font-size: 54px; margin-bottom: 16px; display: inline-block; }
    h1 { font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; }
    p { font-size: 15px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0; }
    .badge { display: inline-block; padding: 8px 16px; background: ${statusColor}20; color: ${statusColor}; border-radius: 20px; font-weight: 700; font-size: 13px; margin-bottom: 24px; }
    .btn { display: inline-block; padding: 12px 24px; background: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isApproved ? '✅' : '❌'}</div>
    <div class="badge">${decision}</div>
    <h1>${statusTitle}</h1>
    <p>${statusSubtitle}</p>
    <a href="https://synapse.alp-nexus.com" class="btn">Voltar para a Plataforma</a>
  </div>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        decision,
        token,
        worker_result: workerRes,
        updated_at: new Date().toISOString()
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
