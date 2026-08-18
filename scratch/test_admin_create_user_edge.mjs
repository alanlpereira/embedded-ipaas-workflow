import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const SUPABASE_URL = 'https://wurfruxigmajgnqsyleq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';

async function testAdminCreateUserEdge() {
  console.log('⚡ Invocando Edge Function admin-create-user para o Dr. Rodrigo Moura...');

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'x-caller-email': 'alanlpereira@hotmail.com'
      },
      body: JSON.stringify({
        name: 'Dr. Rodrigo Moura Rodrigues',
        email: 'rodrigomr.advogado@gmail.com',
        oab: '145105',
        oab_uf: 'MG',
        temp_password: 'Temp@123',
        role: 'Member'
      })
    });

    const data = await res.json();
    console.log(`📊 Status HTTP: ${res.status}`);
    console.log('   Resultado Edge Function:', JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('❌ Erro na invocação admin-create-user:', err);
  }
}

testAdminCreateUserEdge();
