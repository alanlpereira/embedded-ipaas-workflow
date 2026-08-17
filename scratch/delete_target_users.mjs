const SUPABASE_URL = 'https://auth.alp-nexus.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';

const targetEmails = ['alanlacerdapereira@gmail.com', 'alan.pereira@alp-nexus.com'];

async function run() {
  console.log('📡 [REST] Buscando perfis via API REST...');
  
  const queryUrl = `${SUPABASE_URL}/rest/v1/profiles?email=in.(${targetEmails.map(e => `"${e}"`).join(',')})&select=*`;
  const res = await fetch(queryUrl, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const profiles = await res.json();
  console.log('📋 Resposta profiles:', profiles);

  for (const email of targetEmails) {
    console.log(`🗑️ Deletando perfil para email: ${email}...`);
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      }
    });

    const delResult = await delRes.text();
    console.log(`✅ Status deleção ${email}: ${delRes.status}`, delResult);
  }
}

run();
