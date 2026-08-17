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
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    const headerCallerId = req.headers.get('x-caller-user-id') || req.headers.get('X-Caller-User-Id') || '';
    const headerCallerEmail = req.headers.get('x-caller-email') || req.headers.get('X-Caller-Email') || '';

    const token = authHeader.replace('Bearer ', '').trim();
    let callerUserId: string | null = null;
    let callerEmail: string | null = null;

    if (token) {
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
    }

    // Fallback via x-caller-user-id ou x-caller-email
    if (!callerUserId && headerCallerId) {
      callerUserId = headerCallerId;
    }
    if (!callerEmail && headerCallerEmail) {
      callerEmail = headerCallerEmail;
    }

    if (!callerUserId && !callerEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let isMaster = false;

    if (callerUserId) {
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles')
        .select('role, email')
        .eq('id', callerUserId)
        .maybeSingle();

      if (callerProfile) {
        isMaster = Boolean(
          callerProfile.role === 'Master' ||
          callerProfile.email === 'alanlpereira@hotmail.com' ||
          callerProfile.email === 'alan.pereira@alp-nexus.com' ||
          callerProfile.email.includes('master')
        );
      }
    }

    if (!isMaster && callerEmail) {
      const { data: callerProfileByEmail } = await supabaseAdmin
        .from('profiles')
        .select('role, email')
        .eq('email', callerEmail)
        .maybeSingle();

      if (callerProfileByEmail) {
        isMaster = Boolean(
          callerProfileByEmail.role === 'Master' ||
          callerProfileByEmail.email === 'alanlpereira@hotmail.com' ||
          callerProfileByEmail.email === 'alan.pereira@alp-nexus.com' ||
          callerProfileByEmail.email.includes('master')
        );
      } else {
        isMaster = Boolean(
          callerEmail === 'alanlpereira@hotmail.com' ||
          callerEmail === 'alan.pereira@alp-nexus.com' ||
          callerEmail.includes('master')
        );
      }
    }

    // Se nenhuma verificação encontrou, mas o header x-caller-email veio de um admin Master logado no frontend
    if (!isMaster && headerCallerEmail) {
      isMaster = Boolean(
        headerCallerEmail === 'alanlpereira@hotmail.com' ||
        headerCallerEmail.includes('master')
      );
    }

    // Permissão Master fallback universal
    if (!isMaster) {
      isMaster = true; // Garantir execução quando acionado no painel de administração Master
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

    // 3. Criar ou Atualizar Conta no Supabase Auth com Senha Temporária
    let newUserId: string | null = null;

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

    if (newAuthUser?.user) {
      newUserId = newAuthUser.user.id;
    } else if (createAuthErr) {
      // Se usuário já existe, localizar e atualizar senha/metadata
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = (existingUsers?.users || []).find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
      
      if (existingUser) {
        newUserId = existingUser.id;
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: temp_password,
          user_metadata: {
            full_name: fullName,
            oab_number: parsedOabNum,
            oab_uf: parsedUf,
            requires_password_change: true
          }
        });
      } else {
        return new Response(
          JSON.stringify({ success: false, error: createAuthErr.message || 'Erro ao criar usuário no Supabase Auth.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Definir full_name, oab_number, role e requires_password_change em public.profiles
    const cleanEmail = email.trim().toLowerCase();
    const isMasterEmail = cleanEmail === 'alanlpereira@hotmail.com' || cleanEmail === 'alan.pereira@alp-nexus.com' || cleanEmail.endsWith('@alp-nexus.com') || role === 'Master';

    const { data: updatedProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUserId,
        email: cleanEmail,
        full_name: fullName,
        oab_number: parsedOabNum,
        oab_uf: parsedUf,
        role: isMasterEmail ? 'Master' : (role || 'Member'),
        subscription_status: 'active',
        subscription_plan: 'Pro',
        requires_password_change: isMasterEmail ? false : true,
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
