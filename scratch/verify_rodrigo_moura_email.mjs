import { createRequire } from 'module';
const require = createRequire(import.meta.url);

global.WebSocket = class DummyWebSocket {
  constructor() {}
  on() {}
  close() {}
};

const { createClient } = require('../apps/web/node_modules/@supabase/supabase-js');

const SUPABASE_URL = 'https://wurfruxigmajgnqsyleq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyRodrigoMouraEmail() {
  console.log('⚡ Verificando cadastro e credenciais do Dr. Rodrigo Moura no PostgreSQL...');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .or('email.ilike.%rodrigo%,full_name.ilike.%rodrigo%');

  if (error) {
    console.error('❌ Erro ao buscar perfis:', error);
    return;
  }

  console.log(`📋 Perfis de Rodrigo Moura encontrados (${profiles?.length || 0}):`);
  if (profiles) {
    profiles.forEach((p) => {
      console.log(`  • ID: ${p.id}`);
      console.log(`    Nome: ${p.full_name}`);
      console.log(`    E-mail: ${p.email}`);
      console.log(`    Role: ${p.role}`);
      console.log(`    Organização: ${p.organization_id}`);
      console.log(`    Plano: ${p.subscription_plan}`);
      console.log(`    OAB: OAB/${p.oab_uf || 'MG'} ${p.oab_number || 'Sem número'}`);
      console.log(`    Requer alteração de senha: ${p.requires_password_change}`);
      console.log(`    Status Assinatura: ${p.subscription_status}`);
      console.log('--------------------------------------------------');
    });
  }
}

verifyRodrigoMouraEmail();
