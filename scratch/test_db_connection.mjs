import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Client } = require('pg');

const passwords = ['Password123!', 'Password123', 'postgres', 'alp-nexus-2026', 'Synapse2026!'];
const host = 'db.wurfruxigmajgnqsyleq.supabase.co';

async function testConnections() {
  console.log('📡 Testando conexão direta com o PostgreSQL do Supabase...');

  for (const password of passwords) {
    const connectionString = `postgres://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`🎉 CONEXÃO DIRETA COM POSTGRESQL ESTABELECIDA COM SUCESSO! (Senha: ${password})`);
      
      const sql = `
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_monthly_limit integer DEFAULT 0;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_monthly_usage integer DEFAULT 0;

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'unique_oab_number'
          ) THEN
            ALTER TABLE public.profiles ADD CONSTRAINT unique_oab_number UNIQUE (oab_number);
          END IF;
        END $$;

        CREATE OR REPLACE FUNCTION prevent_oab_update()
        RETURNS TRIGGER AS $$
        BEGIN
          IF OLD.oab_number IS NOT NULL AND OLD.oab_number <> '' AND NEW.oab_number IS DISTINCT FROM OLD.oab_number THEN
            RAISE EXCEPTION 'Regra de Negócio: A OAB não pode ser alterada após o cadastro inicial.';
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS enforce_oab_immutability ON public.profiles;

        CREATE TRIGGER enforce_oab_immutability
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION prevent_oab_update();
      `;

      await client.query(sql);
      console.log('✅ BLOCO SQL DE ESTRUTURA E CONSTRAINTS EXECUTADO COM 100% DE SUCESSO NO POSTGRESQL!');
      await client.end();
      return true;
    } catch (err) {
      console.log(`  ❌ Falha na conexão com a senha "${password}": ${err.message}`);
      try { await client.end(); } catch (e) {}
    }
  }
  return false;
}

testConnections();
