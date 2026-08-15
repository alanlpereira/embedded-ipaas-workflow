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
    const body = await req.json();
    const { priceId, planName, userId: bodyUserId, userEmail: bodyUserEmail } = body;

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY não configurada no ambiente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'priceId é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Tentar identificar o usuário via JWT Bearer Token se disponível
    let userId = bodyUserId;
    let userEmail = bodyUserEmail;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://auth.alp-nexus.com';
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        userEmail = user.email || userEmail;
      }
    }

    const appUrl = Deno.env.get('VITE_PUBLIC_APP_URL') || Deno.env.get('PUBLIC_APP_URL') || 'https://synapse.alp-nexus.com';

    // Montar parâmetros x-www-form-urlencoded para a API REST da Stripe
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('payment_method_types[0]', 'card');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', `${appUrl}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${appUrl}/pricing?canceled=true`);

    if (userEmail) {
      params.append('customer_email', userEmail);
    }
    if (userId) {
      params.append('client_reference_id', userId);
      params.append('metadata[userId]', userId);
    }
    if (planName) {
      params.append('metadata[planName]', planName);
    }

    console.log(`💳 [STRIPE CHECKOUT] Criando sessão para usuário: ${userId || 'Anon'}, Plano: ${planName || priceId}`);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const sessionData = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('❌ [STRIPE ERROR]', sessionData);
      return new Response(
        JSON.stringify({ error: sessionData.error?.message || 'Erro ao comunicar com a Stripe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ url: sessionData.url, sessionId: sessionData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('❌ [CREATE CHECKOUT ERROR]', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno no servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
