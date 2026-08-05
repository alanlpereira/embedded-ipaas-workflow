import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-supabase-service-role-key';

if (SUPABASE_URL.includes('your-supabase-project') || SUPABASE_SERVICE_ROLE_KEY.includes('your-supabase-service-role-key')) {
  console.warn('⚠️  [SEED WARNING] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no arquivo .env.');
  console.warn('⚠️  Configure as variáveis de ambiente antes de executar o seed em produção.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runSeed() {
  console.log('🚀 Iniciando script de seed do Motor de Workflow Visual B2B...');

  const masterEmail = 'alan.pereira@alp-nexus.com';

  try {
    // 1. Criar Organização Padrão
    console.log('📦 1. Verificando/Criando Organização Padrão ("ALP Nexus Corp")...');
    const { data: existingOrg, error: orgFetchErr } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('name', 'ALP Nexus Corp')
      .single();

    let orgId: string;

    if (existingOrg) {
      orgId = existingOrg.id;
      console.log(`   ✅ Organização existente encontrada: ${orgId}`);
    } else {
      const { data: newOrg, error: orgCreateErr } = await supabaseAdmin
        .from('organizations')
        .insert({ name: 'ALP Nexus Corp' })
        .select()
        .single();

      if (orgCreateErr || !newOrg) {
        throw new Error(`Falha ao criar organização: ${orgCreateErr?.message}`);
      }
      orgId = newOrg.id;
      console.log(`   ✨ Organização criada com sucesso: ${orgId}`);
    }

    // 2. Criar ou Obter Usuário Master no Auth Engine
    console.log(`👤 2. Verificando/Cadastrando usuário Master (${masterEmail})...`);
    const { data: usersList, error: listUsersErr } = await supabaseAdmin.auth.admin.listUsers();
    
    let masterUserId: string;
    const existingUser = usersList?.users.find((u) => u.email === masterEmail);

    if (existingUser) {
      masterUserId = existingUser.id;
      console.log(`   ✅ Usuário em auth.users encontrado: ${masterUserId}`);
    } else {
      // Criação via Admin API com e-mail confirmado. O usuário define a senha no 1º acesso via Reset Password ou invite.
      const tempPassword = 'ChangeMeOnFirstLogin2026!';
      const { data: newUser, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
        email: masterEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Alan Pereira (Master)',
          role: 'Master',
        },
      });

      if (createUserErr || !newUser.user) {
        throw new Error(`Falha ao cadastrar usuário master: ${createUserErr?.message}`);
      }

      masterUserId = newUser.user.id;
      console.log(`   ✨ Usuário Master cadastrado com sucesso: ${masterUserId}`);
      console.log(`   🔐 Senha temporária do 1º acesso gerada: ${tempPassword}`);
    }

    // 3. Vincular perfil Master na tabela profiles
    console.log('🛡️ 3. Criando/Atualizando perfil Master em public.profiles...');
    const { data: profileData, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: masterUserId,
        organization_id: orgId,
        email: masterEmail,
        full_name: 'Alan Pereira',
        role: 'Master',
      })
      .select()
      .single();

    if (profileErr) {
      throw new Error(`Falha ao salvar perfil: ${profileErr.message}`);
    }
    console.log('   ✅ Perfil Master configurado com sucesso com a role "Master"!');

    // 4. Criar Workflow de Exemplo Inicial (Flowchart)
    console.log('🎨 4. Criando fluxo inicial de boas-vindas...');
    const sampleNodes = [
      {
        id: 'node-1',
        type: 'custom',
        position: { x: 250, y: 100 },
        data: {
          label: 'Webhook HTTP Trigger',
          type: 'webhook',
          description: 'Gera evento quando payload B2B é recebido',
          config: { path: '/api/v1/webhooks/incoming', method: 'POST' },
        },
      },
      {
        id: 'node-2',
        type: 'custom',
        position: { x: 250, y: 250 },
        data: {
          label: 'Filtro & Condição',
          type: 'condition',
          description: 'Verifica se role === "Master"',
          config: { field: 'body.user.role', operator: 'equals', value: 'Master' },
        },
      },
      {
        id: 'node-3',
        type: 'custom',
        position: { x: 250, y: 400 },
        data: {
          label: 'Notificação E-mail',
          type: 'email_notification',
          description: 'Envia alerta ao usuário master',
          config: { recipient: masterEmail, subject: 'Novo Evento no Engine' },
        },
      },
    ];

    const sampleEdges = [
      { id: 'edge-1-2', source: 'node-1', target: 'node-2', animated: true, label: 'Payload' },
      { id: 'edge-2-3', source: 'node-2', target: 'node-3', animated: true, label: 'Sim' },
    ];

    const { data: flowchart, error: flowErr } = await supabaseAdmin
      .from('flowcharts')
      .upsert({
        organization_id: orgId,
        name: 'Fluxo B2B Inicial de Exemplo',
        description: 'Exemplo de integração visual Webhook -> Condição -> E-mail',
        nodes: sampleNodes,
        edges: sampleEdges,
        is_published: true,
      })
      .select()
      .single();

    if (flowErr) {
      console.warn('   ⚠️ Não foi possível criar o flowchart de exemplo:', flowErr.message);
    } else {
      console.log(`   ✨ Flowchart de exemplo criado com sucesso (ID: ${flowchart.id})`);
    }

    console.log('\n🎉 Seed finalizado com sucesso!');
    console.log('----------------------------------------------------');
    console.log(`Organização: ALP Nexus Corp (${orgId})`);
    console.log(`Usuário Master: ${masterEmail}`);
    console.log(`Role: Master`);
    console.log('----------------------------------------------------\n');
  } catch (err: any) {
    console.error('❌ Erro durante execução do seed:', err.message);
    process.exit(1);
  }
}

runSeed();
