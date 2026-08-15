import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Mapeamento de Limite de IA por Plano / Price ID
function getPlanLimit(planName: string, priceId?: string): { plan: string; limit: number } {
  const p = (planName || '').toUpperCase();
  const pid = (priceId || '').toLowerCase();

  const lightPrice = (Deno.env.get('STRIPE_PRICE_ID_LIGHT') || 'price_1U4hdiKZ8AtVWlGqV8zSzau5').toLowerCase();
  const proPrice = (Deno.env.get('STRIPE_PRICE_ID_PRO') || 'price_1U4hdiKZ8AtVWlGqlA6cEzrM').toLowerCase();
  const masterPrice = (Deno.env.get('STRIPE_PRICE_ID_MASTER') || 'price_1U4hdiKZ8AtVWlGqLba6xeXY').toLowerCase();
  const ultraPrice = (Deno.env.get('STRIPE_PRICE_ID_ULTRA') || 'price_1U4hdiKZ8AtVWlGqhyAiSDVy').toLowerCase();

  if (p.includes('LIGHT') || pid === lightPrice) {
    return { plan: 'Light', limit: 0 };
  }
  if (p.includes('PRO') || pid === proPrice) {
    return { plan: 'Pro', limit: 10 };
  }
  if (p.includes('MASTER') || pid === masterPrice) {
    return { plan: 'Master', limit: 50 };
  }
  if (p.includes('ULTRA') || pid === ultraPrice) {
    return { plan: 'Ultra', limit: 200 };
  }

  return { plan: 'Free', limit: 0 };
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
      const metadataPlan = session.metadata?.planName || '';

      console.log(`✅ [STRIPE CHECKOUT COMPLETED] User: ${userId}, Email: ${customerEmail}, Plan: ${metadataPlan}`);

      let targetUserId = userId;

      // Se userId não veio no metadata, tentar localizar pelo e-mail do cliente no Supabase Auth
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
            subscription_status: 'active',
            ai_monthly_limit: planInfo.limit,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (updateErr) {
          console.error('❌ [PROFILES UPDATE ERROR]', updateErr);
        } else {
          console.log(`🎉 [PROFILE UPDATED] User ${targetUserId} agora é Plano ${planInfo.plan} (Limite IA: ${planInfo.limit}/mês)`);
        }

        // Registrar Log de Auditoria no Supabase
        await supabaseAdmin.from('audit_logs').insert([{
          table_name: 'profiles',
          record_id: targetUserId,
          action: 'UPDATE_SUBSCRIPTION',
          new_data: { plan: planInfo.plan, limit: planInfo.limit, customer_id: stripeCustomerId, event: eventType },
          user_id: targetUserId
        }]);
      } else {
        console.warn(`⚠️ [STRIPE WEBHOOK WARN] Não foi possível localizar o usuário no Supabase para o e-mail: ${customerEmail}`);
      }
    } else if (eventType === 'customer.subscription.updated' || eventType === 'customer.subscription.created') {
      const sub = event.data.object;
      const stripeCustomerId = sub.customer;
      const stripeSubscriptionId = sub.id;
      const status = sub.status; // active, trialing, canceled, past_due
      const priceId = sub.items?.data?.[0]?.price?.id || '';

      const planInfo = getPlanLimit('', priceId);

      console.log(`🔄 [SUBSCRIPTION UPDATED] Customer: ${stripeCustomerId}, Status: ${status}, Price: ${priceId}`);

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      if (profile) {
        await supabaseAdmin
          .from('profiles')
          .update({
            stripe_subscription_id: stripeSubscriptionId,
            subscription_plan: status === 'active' ? planInfo.plan : 'Free',
            subscription_status: status,
            ai_monthly_limit: status === 'active' ? planInfo.limit : 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);
      }
    } else if (eventType === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const stripeCustomerId = sub.customer;

      console.log(`🚫 [SUBSCRIPTION DELETED] Customer: ${stripeCustomerId}`);

      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_plan: 'Free',
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
