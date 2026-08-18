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

async function checkRealAdminData() {
  console.log('⚡ Checando dados reais de Perfis, Organizações e Telemetria no PostgreSQL...');

  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  console.log(`- Perfis reais encontrados (${profiles?.length || 0}):`);
  if (profiles) {
    profiles.forEach(p => {
      console.log(`  • ${p.email} (${p.full_name || 'Sem nome'}) | Role: ${p.role} | Org: ${p.organization_id} | Plan: ${p.subscription_plan} | Tokens: ${p.ai_monthly_usage || 0}`);
    });
  }

  const { data: logs, error: lErr } = await supabase.from('user_activity_logs').select('*');
  console.log(`- Logs de atividade/telemetria reais (${logs?.length || 0}):`);
  if (logs) {
    logs.slice(0, 5).forEach(l => {
      console.log(`  • Evento: ${l.event_type} | User: ${l.user_id} | Tokens: ${l.token_count} | Data: ${l.created_at}`);
    });
  }

  const { data: orgs, error: oErr } = await supabase.from('organizations').select('*');
  console.log(`- Tabela organizações (${orgs?.length || 0}):`, orgs || oErr?.message);
}

checkRealAdminData();
