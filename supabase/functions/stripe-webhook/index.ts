import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Mapeamento Estrito de Limites de IA por Plano Oficial (Light: 0, Pro: 10, Master: 50, Ultra: 200)
function getPlanLimit(planName: string, priceId?: string): { plan: string; limit: number } {
  const p = (planName || '').toUpperCase();
  const pid = (priceId || '').toLowerCase();

  const lightPrice = (Deno.env.get('STRIPE_PRICE_ID_LIGHT') || '').toLowerCase();
  const proPrice = (Deno.env.get('STRIPE_PRICE_ID_PRO') || '').toLowerCase();
  const masterPrice = (Deno.env.get('STRIPE_PRICE_ID_MASTER') || '').toLowerCase();
  const ultraPrice = (Deno.env.get('STRIPE_PRICE_ID_ULTRA') || '').toLowerCase();

  if (p.includes('ULTRA') || pid === ultraPrice) {
    return { plan: 'Ultra', limit: 200 };
  }
  if (p.includes('MASTER') || pid === masterPrice) {
    return { plan: 'Master', limit: 50 };
  }
  if (p.includes('PRO') || pid === proPrice) {
    return { plan: 'Pro', limit: 10 };
  }
  if (p.includes('LIGHT') || pid === lightPrice) {
    return { plan: 'Light', limit: 0 };
  }
  if (p.includes('ENTERPRISE')) {
    return { plan: 'Enterprise', limit: 1000 };
  }

  // Padrão de entrada para novos assinantes: Plano Pro (10 peças)
  return { plan: 'Pro', limit: 10 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://auth.alp-nexus.com';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const event = await req.json();
    const eventType = event.type;
    console.log(`🔔 [STRIPE WEBHOOK RECEIVED] Evento: ${eventType}`);

    if (eventType === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId;
      const customerEmail = session.customer_email || session.customer_details?.email;
      const stripeCustomerId = session.customer;
      const stripeSubscriptionId = session.subscription;
      const metadataPlan = session.metadata?.planName || 'Pro';

      console.log(`✅ [STRIPE CHECKOUT COMPLETED] User: ${userId}, Email: ${customerEmail}, Plan: ${metadataPlan}`);

      let targetUserId = userId;

      // Se userId não veio no metadata, localizar pelo e-mail no Supabase Auth
      if (!targetUserId && customerEmail) {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const matchedUser = usersData.users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
        if (matchedUser) {
          targetUserId = matchedUser.id;
        }
      }

      if (targetUserId) {
        const planInfo = getPlanLimit(metadataPlan);

        const { error: updateErr } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: targetUserId,
            email: customerEmail,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            subscription_plan: planInfo.plan,
            subscription_status: 'trialing', // Período de Testes Grátis de 14 Dias ativado
            ai_monthly_limit: planInfo.limit,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (updateErr) {
          console.error('❌ [PROFILES UPDATE ERROR]', updateErr);
        } else {
          console.log(`🎉 [PROFILE UPDATED] User ${targetUserId} ativado no Plano ${planInfo.plan} com 14 dias de Trial (Limite IA: ${planInfo.limit}/mês)`);
        }

        // Registrar Log de Auditoria no Supabase
        await supabaseAdmin.from('audit_logs').insert([{
          table_name: 'profiles',
          record_id: targetUserId,
          action: 'START_SUBSCRIPTION_TRIAL',
          new_data: { plan: planInfo.plan, limit: planInfo.limit, customer_id: stripeCustomerId, event: eventType, trial_days: 14 },
          user_id: targetUserId
        }]);
      } else {
        console.warn(`⚠️ [STRIPE WEBHOOK WARN] Não foi possível localizar o usuário no Supabase para o e-mail: ${customerEmail}`);
      }
    } else if (eventType === 'customer.subscription.updated' || eventType === 'customer.subscription.created') {
      const sub = event.data.object;
      const stripeCustomerId = sub.customer;
      const stripeSubscriptionId = sub.id;
      const status = sub.status; // active, trialing, past_due, unpaid, canceled
      const priceId = sub.items?.data?.[0]?.price?.id || '';

      const planInfo = getPlanLimit('', priceId);
      const isSubActiveOrTrial = status === 'active' || status === 'trialing';

      console.log(`🔄 [SUBSCRIPTION UPDATED] Customer: ${stripeCustomerId}, Status: ${status}, Price: ${priceId}`);

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, manual_status_override')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      if (profile) {
        await supabaseAdmin
          .from('profiles')
          .update({
            stripe_subscription_id: stripeSubscriptionId,
            subscription_plan: isSubActiveOrTrial ? planInfo.plan : 'Pro',
            subscription_status: status,
            ai_monthly_limit: isSubActiveOrTrial ? planInfo.limit : (profile.manual_status_override ? 5000 : 0),
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);
      }
    } else if (eventType === 'invoice.payment_failed') {
      // ⚠️ TRATAMENTO DE RECORRÊNCIA E REUSO DE CARTÃO RECUSADO / INADIMPLÊNCIA
      const invoice = event.data.object;
      const stripeCustomerId = invoice.customer;
      const stripeSubscriptionId = invoice.subscription;

      console.log(`🚨 [INVOICE PAYMENT FAILED] Falha na cobrança recorrente! Customer: ${stripeCustomerId}, Invoice: ${invoice.id}`);

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, manual_status_override')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      if (profile) {
        // Atualizar status para past_due (inadimplente com cobrança pendente)
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        // Audit Log de Falha no Pagamento
        await supabaseAdmin.from('audit_logs').insert([{
          table_name: 'profiles',
          record_id: profile.id,
          action: 'PAYMENT_FAILED_DUNNING',
          new_data: { customer_id: stripeCustomerId, subscription_id: stripeSubscriptionId, invoice_id: invoice.id },
          user_id: profile.id
        }]);

        console.log(`⚠️ [DUNNING NOTICE] Status de ${profile.email} alterado para 'past_due'. Manual Override: ${profile.manual_status_override}`);
      }
    } else if (eventType === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const stripeCustomerId = sub.customer;

      console.log(`🚫 [SUBSCRIPTION DELETED] Customer: ${stripeCustomerId}`);

      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_plan: 'Light',
          subscription_status: 'canceled',
          ai_monthly_limit: 0,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_customer_id', stripeCustomerId);
    }

    return new Response(
      JSON.stringify({ received: true, event: eventType }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('❌ [STRIPE WEBHOOK ERROR]', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro ao processar webhook' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
