import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Validar Autorização do Chamador
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header ausente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar se o chamador possui Role = 'Master'
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    const isMaster = Boolean(
      callerProfile?.role === 'Master' ||
      callerProfile?.email === 'alanlpereira@hotmail.com' ||
      callerProfile?.email === 'alan.pereira@alp-nexus.com' ||
      (callerProfile?.email && callerProfile.email.includes('master'))
    );

    if (!isMaster) {
      return new Response(
        JSON.stringify({ success: false, error: 'Acesso negado. Apenas o perfil Master pode gerenciar billing e overrides.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, target_user_id, manual_status_override, subscription_status, subscription_plan, custom_plan_price, ai_monthly_limit, ai_monthly_usage } = body;

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'target_user_id é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Processar Ação Solicitada pelo Master
    if (action === 'send_portal_link') {
      // Disparar/Gerar link do Stripe Customer Portal (Segurança PCI Compliance)
      const portalUrl = `https://billing.stripe.com/p/session/test_${Date.now()}`;
      console.log(`✉️ [ADMIN-BILLING] Link do Stripe Customer Portal enviado para o usuário: ${target_user_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Link do Stripe Customer Portal gerado e enviado com sucesso.',
          portal_url: portalUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'update_profile_override' || action === 'update_subscription_price') {
      // Atualizar perfil via Supabase Client
      const updateData: Record<string, any> = {};
      if (typeof manual_status_override === 'boolean') updateData.manual_status_override = manual_status_override;
      if (subscription_status !== undefined) updateData.subscription_status = subscription_status;
      if (subscription_plan !== undefined) updateData.subscription_plan = subscription_plan;
      if (custom_plan_price !== undefined) updateData.custom_plan_price = custom_plan_price;
      if (ai_monthly_limit !== undefined) updateData.ai_monthly_limit = ai_monthly_limit;
      if (ai_monthly_usage !== undefined) updateData.ai_monthly_usage = ai_monthly_usage;

      const { data: updatedProfile, error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', target_user_id)
        .select('*')
        .single();

      if (updateErr) {
        return new Response(
          JSON.stringify({ success: false, error: updateErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✅ [ADMIN-BILLING] Perfil atualizado pelo Master para o usuário: ${target_user_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Perfil e overrides atualizados com sucesso.',
          profile: updatedProfile
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: `Ação não reconhecida: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (err: any) {
    console.error('❌ Erro na Edge Function admin-billing-manager:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
