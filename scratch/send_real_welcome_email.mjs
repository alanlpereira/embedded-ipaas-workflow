import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_123456789';

async function sendRealWelcomeEmail() {
  console.log('⚡ Disparando e-mail real de credenciais para Dr. Rodrigo Moura (rodrigomr.advogado@gmail.com)...');

  const payload = {
    from: 'Synapse IPaaS Legal <onboarding@resend.dev>',
    to: ['rodrigomr.advogado@gmail.com'],
    subject: '🏛️ Bem-vindo ao Synapse IPaaS Legal Ops - Suas Credenciais de Acesso',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #080c14; color: #f8fafc; padding: 32px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(56, 189, 248, 0.3);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #38bdf8; margin: 0; font-size: 24px;">🏛️ Synapse IPaaS Legal Ops</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Plataforma de Inteligência Artificial & Automação de Processos PJe</p>
        </div>

        <p style="font-size: 15px;">Prezado(a) <strong>Dr. Rodrigo Moura Rodrigues</strong>,</p>
        
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
          Sua conta corporativa de acesso ao <strong>Synapse IPaaS Legal Ops</strong> foi provisionada pelo Administrador Master com acesso liberado aos módulos de automação PJe CNJ e Legal Copilot por Inteligência Artificial.
        </p>

        <div style="background-color: #0f172a; padding: 20px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.4); margin: 24px 0;">
          <h3 style="color: #10b981; margin-top: 0; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
            🔑 Suas Credenciais de Acesso
          </h3>
          <p style="margin: 8px 0; font-size: 14px;"><strong>URL de Acesso:</strong> <a href="https://synapse.alp-nexus.com" style="color: #38bdf8; font-weight: bold; text-decoration: underline;">https://synapse.alp-nexus.com</a></p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>E-mail Cadastrado:</strong> <code style="background: #1e293b; color: #38bdf8; padding: 3px 8px; border-radius: 4px;">rodrigomr.advogado@gmail.com</code></p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Senha Temporária:</strong> <code style="background: #1e293b; color: #10b981; padding: 3px 8px; border-radius: 4px; font-weight: bold;">Temp@123</code></p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>OAB Habilitada:</strong> OAB/MG 145105</p>
        </div>

        <div style="background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 14px; border-radius: 10px; margin-bottom: 24px;">
          <p style="margin: 0; color: #fbbf24; font-size: 13px; font-weight: bold;">
            ⚠️ IMPORTANTE (Segurança de Primeiro Acesso):
          </p>
          <p style="margin: 4px 0 0 0; color: #fef08a; font-size: 12px; line-height: 1.4;">
            No seu primeiro login na plataforma, o sistema solicitará obrigatoriamente a redefinição da sua senha para garantir a total privacidade e segurança dos seus dados processuais.
          </p>
        </div>

        <div style="text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            ALP Nexus Enterprise • Synapse IPaaS Legal Ops • Atendimento Humano: WhatsApp +55 (32) 98865-4825
          </p>
        </div>
      </div>
    `
  };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log(`📊 Status HTTP Resend: ${res.status}`);
    console.log('   Resultado API:', JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('❌ Erro no envio Resend:', err);
  }
}

sendRealWelcomeEmail();
