import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://auth.alp-nexus.com';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let customerId: string | null = null;
    let userId: string | null = null;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }

    const body = await req.json().catch(() => ({}));
    if (body.customerId) {
      customerId = body.customerId;
    }
    if (!userId && body.userId) {
      userId = body.userId;
    }

    // Se temos o userId mas não o customerId, buscar no perfil public.profiles
    if (userId && !customerId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      if (profile?.stripe_customer_id) {
        customerId = profile.stripe_customer_id;
      }
    }

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Nenhum stripe_customer_id associado ao perfil deste usuário. Faça um checkout primeiro.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appUrl = Deno.env.get('VITE_PUBLIC_APP_URL') || Deno.env.get('PUBLIC_APP_URL') || 'https://synapse.alp-nexus.com';

    console.log(`🔑 [STRIPE PORTAL] Criando sessão de portal para Customer ID: ${customerId}`);

    const params = new URLSearchParams();
    params.append('customer', customerId);
    params.append('return_url', `${appUrl}/pricing`);

    const stripeRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const portalData = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('❌ [STRIPE PORTAL ERROR]', portalData);
      return new Response(
        JSON.stringify({ error: portalData.error?.message || 'Erro ao gerar Stripe Customer Portal' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ url: portalData.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('❌ [CREATE PORTAL SESSION ERROR]', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno no servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
