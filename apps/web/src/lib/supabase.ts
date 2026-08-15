import { createClient } from '@supabase/supabase-js';

// Custom Domain da Autenticação do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://auth.alp-nexus.com';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';

// URL Principal da Aplicação para Redirecionamentos de Autenticação (redirectTo)
export const AUTH_REDIRECT_URL = import.meta.env.VITE_PUBLIC_APP_URL || 'https://synapse.alp-nexus.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * 📧 Enviar Magic Link de Login sem senha redirecionando para a aplicação principal
 */
export async function sendMagicLink(email: string) {
  return await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: AUTH_REDIRECT_URL,
    },
  });
}

/**
 * 🔑 Solicitar Redefinição de Senha redirecionando para a aplicação principal
 */
export async function sendPasswordReset(email: string) {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${AUTH_REDIRECT_URL}/reset-password`,
  });
}

/**
 * 🌐 Autenticar via Provedor OAuth (Google, GitHub, etc) redirecionando para a aplicação principal
 */
export async function signInWithOAuthProvider(provider: 'google' | 'github' | 'azure') {
  return await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: AUTH_REDIRECT_URL,
    },
  });
}
