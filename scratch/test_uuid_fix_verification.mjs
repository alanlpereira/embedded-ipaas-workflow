import { createRequire } from 'module';
const require = createRequire(import.meta.url);

global.WebSocket = class DummyWebSocket {
  constructor() {}
  on() {}
  close() {}
};

const { createClient } = require('../apps/web/node_modules/@supabase/supabase-js');

const SUPABASE_URL = 'https://auth.alp-nexus.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function testAllTables() {
  console.log('====================================================');
  console.log('🔍 TESTANDO TODAS AS TABELAS CONTRA ERRO DE SINTAXE UUID (22P02)');
  console.log('====================================================\n');

  // Testar workflows
  const { error: wfErr } = await supabase.from('workflows').select('*').eq('organization_id', 'org-alp-nexus');
  console.log('1. Query .from("workflows").select("*").eq("organization_id", "org-alp-nexus"):');
  if (wfErr) console.error('   ❌ ERRO 22P02 RETORNADO:', wfErr.message);
  else console.log('   ✅ OK!');

  // Testar flow_executions
  const { error: feErr } = await supabase.from('flow_executions').select('*').eq('organization_id', 'org-alp-nexus');
  console.log('\n2. Query .from("flow_executions").select("*").eq("organization_id", "org-alp-nexus"):');
  if (feErr) console.error('   ❌ ERRO 22P02 RETORNADO:', feErr.message);
  else console.log('   ✅ OK!');

  // Testar audit_logs
  const { error: alErr } = await supabase.from('audit_logs').select('*').eq('organization_id', 'org-alp-nexus');
  console.log('\n3. Query .from("audit_logs").select("*").eq("organization_id", "org-alp-nexus"):');
  if (alErr) console.error('   ❌ ERRO 22P02 RETORNADO:', alErr.message);
  else console.log('   ✅ OK!');

  // Testar clients
  const { error: clErr } = await supabase.from('clients').select('*').eq('organization_id', 'org-alp-nexus');
  console.log('\n4. Query .from("clients").select("*").eq("organization_id", "org-alp-nexus"):');
  if (clErr) console.error('   ❌ ERRO 22P02 RETORNADO:', clErr.message);
  else console.log('   ✅ OK!');
}

testAllTables();
