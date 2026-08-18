import { createRequire } from 'module';
const require = createRequire(import.meta.url);

global.WebSocket = class DummyWebSocket {
  constructor() {}
  on() {}
  close() {}
};

const { createClient } = require('../apps/web/node_modules/@supabase/supabase-js');

const SUPABASE_URL = 'https://auth.alp-nexus.com';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2MjQzNywiZXhwIjoyMTAxNTM4NDM3fQ.01d3f9690e1991ec95f8ff81ebf9dc9d42905f823ce03e602bd77a070bb7fe1f';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendOfficialInvite() {
  const targetEmail = 'rodrigomr.advogado@gmail.com';
  console.log(`⚡ Gerando e enviando convite oficial de acesso do Supabase Auth para ${targetEmail}...`);

  try {
    // 1. Gerar link oficial de recuperação/convite do Supabase Auth
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: targetEmail,
      options: {
        redirectTo: 'https://synapse.alp-nexus.com/reset-password'
      }
    });

    if (linkErr) {
      console.error('❌ Erro ao gerar link oficial Supabase:', linkErr);
    } else {
      console.log('✅ Link Oficial Gerado com Sucesso!');
      console.log('   Action Link (Redefinição de Senha):', linkData.properties?.action_link);
      console.log('   Hashed Token:', linkData.properties?.hashed_token);
    }

    // 2. Tentar convite de e-mail direto do Supabase
    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(targetEmail, {
      redirectTo: 'https://synapse.alp-nexus.com/reset-password',
      data: {
        full_name: 'Dr. Rodrigo Moura Rodrigues',
        oab_number: '145105',
        oab_uf: 'MG'
      }
    });

    if (inviteErr) {
      console.warn('⚠️ Convite por e-mail direto do Supabase (Aviso):', inviteErr.message);
    } else {
      console.log('🎉 E-mail oficial de convite despachado via Supabase Mailer para:', inviteData.user?.email);
    }

  } catch (err) {
    console.error('❌ Erro na execução:', err);
  }
}

sendOfficialInvite();
