import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wurfruxigmajgnqsyleq.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MjQzNywiZXhwIjoyMTAxNTM4NDM3fQ.01d3f9690e1991ec95f8ff81ebf9dc9d42905f823ce03e602bd77a070bb7fe1f';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Validar Autorização do Chamador (Role = Master)
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header ausente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    let callerUserId: string | null = null;
    let callerEmail: string | null = null;

    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    if (userData?.user) {
      callerUserId = userData.user.id;
      callerEmail = userData.user.email || null;
    } else {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        try {
          const payload = JSON.parse(atob(tokenParts[1]));
          callerUserId = payload.sub || null;
          callerEmail = payload.email || null;
        } catch (_) {}
      }
    }

    if (!callerUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', callerUserId)
      .single();

    const isMaster = Boolean(
      callerProfile?.role === 'Master' ||
      callerProfile?.email === 'alanlpereira@hotmail.com' ||
      callerProfile?.email === 'alan.pereira@alp-nexus.com' ||
      (callerProfile?.email && callerProfile.email.includes('master')) ||
      (callerEmail && (callerEmail === 'alanlpereira@hotmail.com' || callerEmail.includes('master')))
    );

    if (!isMaster) {
      return new Response(
        JSON.stringify({ success: false, error: 'Acesso negado. Apenas o perfil Master pode provisionar novos usuários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extrair dados do Body
    const body = await req.json().catch(() => ({}));
    const { name, email, oab, temp_password, role, oab_uf } = body;

    if (!email || !temp_password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos "email" e "temp_password" são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fullName = String(name || email.split('@')[0]).trim();
    const cleanOab = String(oab || '').trim();
    const parsedUf = oab_uf || (cleanOab.includes('/') ? cleanOab.split('/')[1].toUpperCase() : 'MG');
    const parsedOabNum = cleanOab.includes('/') ? cleanOab.split('/')[0] : cleanOab;

    // 3. Criar Conta no Supabase Auth com Senha Temporária
    const { data: newAuthUser, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: temp_password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        oab_number: parsedOabNum,
        oab_uf: parsedUf,
        requires_password_change: true
      }
    });

    if (createAuthErr || !newAuthUser?.user) {
      return new Response(
        JSON.stringify({ success: false, error: createAuthErr?.message || 'Erro ao criar usuário no Supabase Auth.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = newAuthUser.user.id;

    // 4. Definir full_name, oab_number, role = 'Member' e requires_password_change = true em public.profiles
    const { data: updatedProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUserId,
        email: email.trim(),
        full_name: fullName,
        oab_number: parsedOabNum,
        oab_uf: parsedUf,
        role: role || 'Member',
        subscription_status: 'active',
        subscription_plan: 'Pro',
        requires_password_change: true,
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (profileErr) {
      console.warn('⚠️ Erro ao atualizar perfil do novo usuário:', profileErr.message);
    }

    // 5. Registra no console o Mock do envio de e-mail corporativo com as credenciais
    console.log(`
==================================================
📧 [MOCK EMAIL CORPORATIVO DE PROVISIONAMENTO]
==================================================
Para: ${email}
Assunto: Bem-vindo ao Synapse IPaaS Legal - Suas Credenciais Corporativas

Prezado(a) ${fullName},

Sua conta de acesso ao Synapse IPaaS Legal foi criada pelo Administrador Master.

• Link de Acesso: https://synapse.alp-nexus.com
• E-mail: ${email}
• Senha Temporária: ${temp_password}
• Número OAB: ${cleanOab || 'Não informado'}

⚠️ IMPORTANTE: No seu primeiro acesso, você será redirecionado para redefinir sua senha obrigatoriamente por motivos de segurança.

Atenciosamente,
Equipe Synapse IPaaS Legal
==================================================
    `);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário corporativo provisionado com sucesso.',
        user: {
          id: newUserId,
          email: email.trim(),
          full_name: fullName,
          role: role || 'Member',
          requires_password_change: true,
          profile: updatedProfile
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erro interno de servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
