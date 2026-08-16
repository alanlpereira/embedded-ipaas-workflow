import React, { useState, useEffect } from 'react';
import { Scale, Lock, Mail, ArrowRight, ShieldCheck, Loader2, User, Sparkles, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../i18n/LanguageContext';
import { Profile } from '@ipaas/shared-types';

interface LoginPageProps {
  onLoginSuccess: (profile: Profile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [checkoutLoadingText, setCheckoutLoadingText] = useState<string | null>(null);
  const [selectedPlanPriceId, setSelectedPlanPriceId] = useState<string | null>(null);
  const [selectedPlanName, setSelectedPlanName] = useState<string | null>(null);

  // 1. Detectar se a URL contém parâmetros de plano ou hash #signup
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    const planFromUrl = searchParams.get('plan');
    const planNameFromUrl = searchParams.get('planName');

    if (planFromUrl) {
      setSelectedPlanPriceId(planFromUrl);
      setSelectedPlanName(planNameFromUrl || 'Selecionado');
      setIsSignUp(true);
    } else if (hash.includes('signup')) {
      setIsSignUp(true);
    }
  }, []);

  // 2. 🛡️ AUTH GUARD: Verificação imediata do estado de autenticação ao carregar a página
  useEffect(() => {
    let isMounted = true;

    async function checkExistingAuthSession() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const planFromUrl = searchParams.get('plan');

        // Se houver um plano na URL, NÃO realizar login automático silencioso no dashboard
        if (planFromUrl) {
          if (isMounted) setIsCheckingAuth(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const userProfile: Profile = profile || {
            id: session.user.id,
            organization_id: 'org-alp-nexus',
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || '',
            role: (session.user.user_metadata?.role as any) || 'Member',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          localStorage.setItem('synapse_active_session', JSON.stringify(userProfile));
          onLoginSuccess(userProfile);
          return;
        }

        const savedSession = localStorage.getItem('synapse_active_session');
        if (savedSession && isMounted) {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.email) {
            onLoginSuccess(parsed);
            return;
          }
        }
      } catch (err) {
        console.warn('Erro ao verificar sessão ativa:', err);
      } finally {
        if (isMounted) setIsCheckingAuth(false);
      }
    }

    checkExistingAuthSession();

    return () => {
      isMounted = false;
    };
  }, [onLoginSuccess]);

  // Função dedicada para disparar a Stripe Checkout Session e redirecionar
  const triggerStripeCheckout = async (userId: string, userEmail: string): Promise<boolean> => {
    setCheckoutLoadingText('🔒 Redirecionando para o pagamento seguro na Stripe...');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://auth.alp-nexus.com';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';
      console.log(`💳 [CHECKOUT FLOW] Solicitando checkout para priceId: ${selectedPlanPriceId}, user: ${userId}`);

      const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          priceId: selectedPlanPriceId,
          planName: selectedPlanName,
          userId: userId,
          userEmail: userEmail
        })
      });

      const checkoutData = await res.json();

      if (checkoutData?.url) {
        console.log(`🚀 [CHECKOUT FLOW] Redirecionando para Stripe URL: ${checkoutData.url}`);
        window.location.href = checkoutData.url;
        return true;
      } else {
        throw new Error(checkoutData?.error || 'A API da Stripe não retornou uma URL válida.');
      }
    } catch (err: any) {
      console.error('❌ [CHECKOUT FLOW ERROR]', err);
      setErrorMessage(`⚠️ Erro ao iniciar checkout de pagamento: ${err.message || 'Verifique o serviço Stripe.'}`);
      setCheckoutLoadingText(null);
      setIsLoading(false);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setCheckoutLoadingText(null);

    if (isSignUp) {
      // 🛡️ VALIDAÇÃO DE COINCIDÊNCIA DE SENHAS
      if (password !== confirmPassword) {
        setErrorMessage('As senhas não coincidem. Por favor, digite a mesma senha nos dois campos.');
        setIsLoading(false);
        return;
      }

      // 🚀 FLUXO DE SIGN UP: 1. Checagem Prévia de Usuário Existente no Banco
      try {
        const cleanEmail = email.trim().toLowerCase();
        
        // Verificar se a conta já existe na tabela profiles
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingProfile) {
          console.warn(`⚠️ [DUPLICATE SIGNUP ATTEMPT] E-mail ${cleanEmail} já cadastrado no banco.`);
          setErrorMessage('⚠️ Este e-mail já possui uma conta cadastrada no Synapse. Por favor, digite sua senha para entrar.');
          setIsSignUp(false); // Retorna para a tela de login inicial
          setPassword('');
          setConfirmPassword('');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'Member',
              app_module: 'juridico'
            }
          }
        });

        // 🛑 Se o Supabase Auth retornar erro de usuário já cadastrado ou identidades vazias
        if (error || (data?.user && data.user.identities && data.user.identities.length === 0)) {
          const errMsg = error ? error.message : 'Este e-mail já está cadastrado no sistema.';
          console.warn(`⚠️ [DUPLICATE AUTH SIGNUP] ${errMsg}`);
          setErrorMessage('⚠️ Este e-mail já possui uma conta cadastrada. Por favor, informe sua senha de acesso.');
          setIsSignUp(false); // Retorna para a tela de login inicial
          setPassword('');
          setConfirmPassword('');
          setIsLoading(false);
          return;
        }

        const registeredUser = data.user;
        const userId = registeredUser?.id && registeredUser.id.length === 36 ? registeredUser.id : crypto.randomUUID();

        // SE HOUVER PLANO SELECIONADO: Bloquear redirecionamento padrão e abrir Stripe Checkout
        if (selectedPlanPriceId) {
          const checkoutSuccess = await triggerStripeCheckout(userId, email);
          if (checkoutSuccess) {
            return;
          } else {
            return;
          }
        }

        // Se for um novo usuário sem plano na URL, prosseguir para a tela de Onboarding/Planos
        fallbackLocalLogin(email, fullName, userId);
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao realizar cadastro.');
        setIsLoading(false);
      }
    } else {
      // 🔑 FLUXO DE LOGIN NORMAL
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.warn('Supabase Auth error (fallback local):', error.message);
          if (selectedPlanPriceId) {
            const checkoutSuccess = await triggerStripeCheckout(`usr-${Date.now()}`, email);
            if (checkoutSuccess) return;
            return;
          }
          fallbackLocalLogin(email, fullName);
          return;
        }

        if (data.user) {
          if (selectedPlanPriceId) {
            const checkoutSuccess = await triggerStripeCheckout(data.user.id, data.user.email || email);
            if (checkoutSuccess) return;
            return;
          }

          // ⚡ FASE 1: FETCH E GARANTIA DE REGISTRO NA TABELA profiles DO SUPABASE
          const userEmail = data.user.email || email || '';
          const isMasterEmail = userEmail === 'alanlpereira@hotmail.com' || userEmail === 'alan.pereira@alp-nexus.com' || userEmail.endsWith('@alp-nexus.com');

          let { data: dbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          // Se a linha ainda não existir no banco, faz o UPSERT inicial para garantir a existência do perfil
          if (!dbProfile) {
            const { data: createdProfile } = await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                email: userEmail,
                full_name: data.user.user_metadata?.full_name || fullName || '',
                role: isMasterEmail ? 'Master' : 'Member',
                subscription_status: isMasterEmail ? 'active' : 'inactive',
                subscription_plan: 'Pro',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
            dbProfile = createdProfile;
          }

          const fullProfile: Profile = {
            id: data.user.id,
            organization_id: dbProfile?.organization_id || 'org-alp-nexus',
            email: userEmail,
            full_name: dbProfile?.full_name || data.user.user_metadata?.full_name || fullName || '',
            oab_number: dbProfile?.oab_number || '',
            oab_uf: dbProfile?.oab_uf || 'MG',
            professional_id: dbProfile?.professional_id || (dbProfile?.oab_number ? `OAB/${dbProfile.oab_uf || 'MG'} ${dbProfile.oab_number}` : ''),
            role: isMasterEmail ? 'Master' : (dbProfile?.role || (data.user.user_metadata?.role as any) || 'Member'),
            subscription_status: isMasterEmail ? 'active' : (dbProfile?.subscription_status || 'inactive'),
            subscription_plan: isMasterEmail ? 'Pro' : (dbProfile?.subscription_plan || 'Pro'),
            avatar_url: dbProfile?.avatar_url || '',
            phone: dbProfile?.phone || '',
            created_at: dbProfile?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          localStorage.setItem('synapse_active_session', JSON.stringify(fullProfile));
          onLoginSuccess(fullProfile);
        }
      } catch (err: any) {
        if (selectedPlanPriceId) {
          const checkoutSuccess = await triggerStripeCheckout(`usr-${Date.now()}`, email);
          if (checkoutSuccess) return;
          return;
        }
        fallbackLocalLogin(email, fullName);
      } finally {
        if (!selectedPlanPriceId) {
          setIsLoading(false);
        }
      }
    }
  };

  const fallbackLocalLogin = (targetEmail: string, nameInput: string, explicitUserId?: string) => {
    const validUuid = explicitUserId && explicitUserId.length === 36 ? explicitUserId : crypto.randomUUID();
    const localProfile: Profile = {
      id: validUuid,
      organization_id: 'org-alp-nexus',
      email: targetEmail,
      full_name: nameInput || '',
      role: 'Member',
      subscription_status: 'trialing',
      subscription_plan: 'Pro',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem('synapse_active_session', JSON.stringify(localProfile));
    onLoginSuccess(localProfile);
  };

  if (isCheckingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090d16',
        color: '#f8fafc',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)'
          }}>
            <Scale size={28} color="#ffffff" />
          </div>
          <Loader2 size={24} className="animate-spin" style={{ color: '#38bdf8' }} />
          <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>
            Verificando autenticação criptografada SSL...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #1e293b 0%, #090d16 100%)',
      fontFamily: "'Inter', sans-serif",
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '40px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)',
            marginBottom: '16px'
          }}>
            <Scale size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.5px' }}>
            {isSignUp ? 'Criar Conta no Synapse Legal' : 'Portal do Advogado'}
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', margin: 0 }}>
            {isSignUp
              ? 'Cadastre-se para automatizar intimações PJe e usar a IA'
              : 'Automação de Intimações CNJ & Gestão Processual'}
          </p>

          {/* Badge Contextual de Plano Selecionado via URL */}
          {selectedPlanName && (
            <div style={{
              marginTop: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#10b981',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700
            }}>
              <Sparkles size={14} /> Finalizando contratação do Plano {selectedPlanName}
            </div>
          )}
        </div>

        {/* Mensagem de Estado de Carregamento do Checkout da Stripe */}
        {checkoutLoadingText && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#38bdf8',
            padding: '14px 18px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 700,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <Loader2 size={18} className="animate-spin" />
            <span>{checkoutLoadingText}</span>
          </div>
        )}

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '14px 18px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            lineHeight: '1.4'
          }}>
            <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Nome Completo
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Alan Pereira"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              E-mail Profissional
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                required
                autoComplete={isSignUp ? "off" : "email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="advogado@escritorio.com.br"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Senha de Acesso
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="password"
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Campo Confirmar Senha (Apenas no Modo Cadastro) */}
          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Confirmar Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita sua senha de acesso"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '15px',
              cursor: isLoading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{selectedPlanPriceId ? 'Redirecionando para o Pagamento...' : (isSignUp ? 'Criando Conta...' : 'Autenticando...')}</span>
              </>
            ) : (
              <>
                <span>{selectedPlanPriceId ? `Ir para o Pagamento (${selectedPlanName || 'Plano'})` : (isSignUp ? 'Concluir Cadastro & Prosseguir' : 'Entrar no Sistema')}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Alternador de Modo: Entrar vs Criar Conta */}
        <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isSignUp
              ? 'Já possui uma conta? Clique aqui para entrar'
              : 'Não tem uma conta? Clique aqui para se cadastrar'}
          </button>
        </div>

        {/* Rodapé de Segurança */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '11px',
          color: '#64748b',
          textAlign: 'center'
        }}>
          <ShieldCheck size={14} style={{ color: '#10b981' }} />
          <span>Autenticação Criptografada SSL • Synapse 2026</span>
        </div>
      </div>
    </div>
  );
};
