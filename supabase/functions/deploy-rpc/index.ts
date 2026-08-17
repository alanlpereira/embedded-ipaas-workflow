import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'SUPABASE_DB_URL ausente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = new Client(dbUrl);
    await client.connect();

    const sql = `
      -- 1. Evolução do Schema public.profiles
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS manual_status_override boolean DEFAULT false;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_plan_price numeric DEFAULT NULL;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_monthly_limit integer DEFAULT 100;

      -- 2. Função RPC de atualização administrativa de perfis
      CREATE OR REPLACE FUNCTION public.admin_update_user_profile (
        target_user_id uuid,
        p_subscription_status text DEFAULT NULL,
        p_manual_status_override boolean DEFAULT NULL,
        p_custom_plan_price numeric DEFAULT NULL,
        p_ai_monthly_limit int DEFAULT NULL
      )
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        caller_role text;
      BEGIN
        SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
        IF caller_role != 'Master' THEN
          RAISE EXCEPTION 'Acesso negado. Apenas usuários Master podem atualizar perfis corporativos.';
        END IF;

        UPDATE public.profiles
        SET
          subscription_status = COALESCE(p_subscription_status, subscription_status),
          manual_status_override = COALESCE(p_manual_status_override, manual_status_override),
          custom_plan_price = COALESCE(p_custom_plan_price, custom_plan_price),
          ai_monthly_limit = COALESCE(p_ai_monthly_limit, ai_monthly_limit)
        WHERE id = target_user_id;

        RETURN json_build_object('success', true, 'target_user_id', target_user_id);
      END;
      $$;

      -- 3. Função RPC de exclusão permanente (Tear Down)
      CREATE OR REPLACE FUNCTION public.delete_user_profile (target_user_id uuid)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        DELETE FROM public.profiles WHERE id = target_user_id;
        DELETE FROM auth.users WHERE id = target_user_id;
        RETURN json_build_object('success', true, 'deleted_id', target_user_id);
      END;
      $$;
    `;

    await client.queryArray(sql);
    await client.end();

    console.log('✅ Alterações no schema public.profiles e RPC admin_update_user_profile aplicadas no PostgreSQL!');

    return new Response(
      JSON.stringify({ success: true, message: 'Schema public.profiles e RPC admin_update_user_profile criadas com sucesso!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('❌ Erro no deploy-rpc:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
