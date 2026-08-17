import { createRequire } from 'module';
import fs from 'fs';

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

async function applyMigration() {
  console.log('====================================================');
  console.log('⚙️ FRENTE 1: APLICANDO MIGRATION DE CONSTRAINTS NO POSTGRESQL');
  console.log('====================================================\n');

  const sql = fs.readFileSync('./supabase/migrations/20260816000009_add_oab_constraints_and_ai_columns.sql', 'utf8');

  // Testar execução via RPC exec_sql ou RPCs existentes no Supabase
  const statements = [
    `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text;`,
    `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;`,
    `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_monthly_limit integer DEFAULT 0;`,
    `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_monthly_usage integer DEFAULT 0;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_oab_number') THEN ALTER TABLE public.profiles ADD CONSTRAINT unique_oab_number UNIQUE (oab_number); END IF; END $$;`,
    `CREATE OR REPLACE FUNCTION prevent_oab_update() RETURNS TRIGGER AS $$ BEGIN IF OLD.oab_number IS NOT NULL AND OLD.oab_number <> '' AND NEW.oab_number IS DISTINCT FROM OLD.oab_number THEN RAISE EXCEPTION 'Regra de Negócio: A OAB não pode ser alterada após o cadastro inicial.'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;`,
    `DROP TRIGGER IF EXISTS enforce_oab_immutability ON public.profiles;`,
    `CREATE TRIGGER enforce_oab_immutability BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION prevent_oab_update();`
  ];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`Executando comando SQL (${i+1}/${statements.length}): ${stmt.slice(0, 60)}...`);
    const { data, error } = await supabase.rpc('exec_sql', { query: stmt });
    if (error) {
      console.warn(`  ⚠️ Nota na execução do RPC exec_sql: ${error.message}`);
    } else {
      console.log(`  ✅ Comando executado com sucesso.`);
    }
  }

  console.log('\n--- VERIFICANDO COLUNAS ATUALIZADAS EM public.profiles ---');
  const { data: prof, error: pErr } = await supabase.from('profiles').select('*').limit(1);
  if (prof && prof.length > 0) {
    console.log('Colunas ativas no schema de public.profiles:');
    console.log(Object.keys(prof[0]));
  }
}

applyMigration();
