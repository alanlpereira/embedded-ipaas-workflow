import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Shield, Star, Sparkles, Loader2, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PlanTier {
  id: string;
  name: string;
  price: string;
  pricePeriod: string;
  priceId: string;
  badge?: string;
  popular?: boolean;
  aiLimitText: string;
  aiLimitCount: number;
  description: string;
  features: string[];
  gradientBg: string;
  buttonBg: string;
}

export const PricingPage: React.FC = () => {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [userProfile, setUserProfile] = useState<{
    subscription_plan: string;
    subscription_status: string;
    ai_monthly_limit: number;
    ai_monthly_usage: number;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const priceLight = import.meta.env.VITE_STRIPE_PRICE_ID_LIGHT || 'price_1U4hdiKZ8AtVWlGqV8zSzau5';
  const pricePro = import.meta.env.VITE_STRIPE_PRICE_ID_PRO || 'price_1U4hdiKZ8AtVWlGqlA6cEzrM';
  const priceMaster = import.meta.env.VITE_STRIPE_PRICE_ID_MASTER || 'price_1U4hdiKZ8AtVWlGqLba6xeXY';
  const priceUltra = import.meta.env.VITE_STRIPE_PRICE_ID_ULTRA || 'price_1U4hdiKZ8AtVWlGqhyAiSDVy';

  useEffect(() => {
    // Verificar retorno da Stripe na URL (?success=true ou ?canceled=true)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setToastMessage({
        text: '🎉 Assinatura confirmada com sucesso! Seu plano e limites de IA foram atualizados.',
        type: 'success'
      });
      // Limpar parâmetros da URL sem recarregar a página
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('canceled') === 'true') {
      setToastMessage({
        text: 'ℹ️ O processo de assinatura foi cancelado. Nenhum valor foi cobrado.',
        type: 'info'
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_status, ai_monthly_limit, ai_monthly_usage')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
        }
      }
    } catch (err) {
      console.warn('Não foi possível carregar perfil do usuário:', err);
    }
  };

  const plans: PlanTier[] = [
    {
      id: 'light',
      name: 'Light',
      price: 'R$ 49,90',
      pricePeriod: '/mês',
      priceId: priceLight,
      description: 'Automação completa do fluxo do PJe e integração com calendário sem geração de peças.',
      aiLimitText: '0 peças',
      aiLimitCount: 0,
      gradientBg: 'rgba(51, 65, 85, 0.4)',
      buttonBg: 'rgba(255, 255, 255, 0.1)',
      features: [
        'Automação completa do fluxo do PJe CNJ',
        'Integração agnóstica de calendário (Apple, Google, Outlook)',
        'Mural de movimentações e intimações processuais',
        'Módulo completo de Gestão de Clientes (CRUD)',
        'Sem geração de peças por Inteligência Artificial'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'R$ 79,90',
      pricePeriod: '/mês',
      priceId: pricePro,
      description: 'Fluxo PJe + integração com calendário + Geração de Peças com Inteligência Artificial.',
      aiLimitText: '10 peças / mês',
      aiLimitCount: 10,
      gradientBg: 'rgba(59, 130, 246, 0.15)',
      buttonBg: 'var(--accent-blue)',
      features: [
        'Tudo do Plano Light +',
        '🤖 10 Gerações de Peças com IA / mês',
        'Síntese Defensiva e Análise de Riscos da IA Gemini',
        'Minutas automáticas de petição e manifestações',
        'Notificação no WhatsApp do Cliente com 1 clique'
      ]
    },
    {
      id: 'master',
      name: 'Master',
      price: 'R$ 99,90',
      pricePeriod: '/mês',
      priceId: priceMaster,
      badge: '⭐ Mais Popular',
      popular: true,
      description: 'Ideal para a demanda da maioria dos advogados autônomos.',
      aiLimitText: '50 peças / mês',
      aiLimitCount: 50,
      gradientBg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
      buttonBg: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
      features: [
        'Tudo do Plano Pro +',
        '🤖 50 Gerações de Peças com IA / mês',
        'Varredura Diária Automática no CNJ Comunica às 08h00 AM',
        'Ideal para a demanda contínua de advogados autônomos',
        'Execução autônoma de Workflows automatizados'
      ]
    },
    {
      id: 'ultra',
      name: 'Ultra',
      price: 'R$ 109,90',
      pricePeriod: '/mês',
      priceId: priceUltra,
      badge: '🚀 Melhor Custo-Benefício',
      description: 'Escala máxima e melhor custo-benefício.',
      aiLimitText: '200 peças / mês',
      aiLimitCount: 200,
      gradientBg: 'rgba(168, 85, 247, 0.15)',
      buttonBg: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
      features: [
        'Tudo do Plano Master +',
        '🤖 200 Gerações de Peças com IA / mês',
        'Escala máxima e menor custo por peça gerada',
        'Rate Limiting e Trilha de Auditoria Dedicada',
        'Suporte prioritário e máxima capacidade de automação'
      ]
    }
  ];

  const handleSubscribe = async (plan: PlanTier) => {
    setLoadingPriceId(plan.priceId);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://auth.alp-nexus.com';

      // Chamar Edge Function create-checkout-session
      const { data: sessionData, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: plan.priceId,
          planName: plan.name,
          userId: currentUser?.id,
          userEmail: currentUser?.email
        }
      });

      if (error || !sessionData?.url) {
        // Fallback direto via fetch se o client do Supabase falhar
        const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId: plan.priceId,
            planName: plan.name,
            userId: currentUser?.id,
            userEmail: currentUser?.email
          })
        });
        const directData = await res.json();
        if (directData?.url) {
          window.location.href = directData.url;
          return;
        }
        throw new Error(error?.message || directData?.error || 'Erro ao gerar Checkout da Stripe');
      }

      // Redirecionar para o Checkout seguro da Stripe
      window.location.href = sessionData.url;
    } catch (err: any) {
      console.error('❌ Erro no Checkout:', err);
      setToastMessage({
        text: `Erro ao iniciar checkout: ${err.message || 'Verifique sua conexão.'}`,
        type: 'error'
      });
      setLoadingPriceId(null);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '32px 20px',
      color: 'var(--text-primary)',
      fontFamily: 'inherit',
      boxSizing: 'border-box'
    }}>
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '14px 24px',
          borderRadius: '12px',
          background: toastMessage.type === 'success'
            ? 'rgba(16, 185, 129, 0.95)'
            : toastMessage.type === 'error'
            ? 'rgba(239, 68, 68, 0.95)'
            : 'rgba(59, 130, 246, 0.95)',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '14px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {toastMessage.type === 'success' && <Sparkles size={18} />}
          {toastMessage.type === 'error' && <AlertCircle size={18} />}
          {toastMessage.type === 'info' && <RefreshCw size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header da Página */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: 'var(--accent-blue)',
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '16px'
        }}>
          <Sparkles size={16} /> Planos e Assinaturas Synapse 2026
        </div>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 800,
          letterSpacing: '-1px',
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Escolha o Plano Ideal para a Automação do Seu Escritório
        </h1>
        <p style={{
          fontSize: '16px',
          color: 'var(--text-muted)',
          maxWidth: '680px',
          margin: '0 auto',
          lineHeight: '1.6'
        }}>
          Desbloqueie o poder da Inteligência Artificial (Gemini 1.5 Pro) e a varredura automática no PJe CNJ para multiplicar a produtividade da sua equipe jurídica.
        </p>

        {/* Badge do Plano Atual do Usuário */}
        {userProfile && (
          <div style={{
            marginTop: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '14px'
          }}>
            <span>Seu Plano Atual: <strong style={{ color: 'var(--accent-blue)', fontWeight: 800 }}>{userProfile.subscription_plan}</strong></span>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <span>Uso de IA no Mês: <strong style={{ color: '#10b981', fontWeight: 800 }}>{userProfile.ai_monthly_usage} / {userProfile.ai_monthly_limit} req</strong></span>
          </div>
        )}
      </div>

      {/* Grid com os 4 Planos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
        gap: '24px',
        alignItems: 'stretch'
      }}>
        {plans.map((plan) => {
          const isCurrentPlan = userProfile?.subscription_plan?.toLowerCase() === plan.name.toLowerCase();
          const isLoading = loadingPriceId === plan.priceId;

          return (
            <div
              key={plan.id}
              style={{
                position: 'relative',
                background: 'var(--bg-glass)',
                border: plan.popular ? '2px solid #10b981' : '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: plan.popular ? '0 12px 30px rgba(16, 185, 129, 0.2)' : '0 4px 20px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                backgroundImage: plan.gradientBg,
                overflow: 'hidden'
              }}
            >
              {/* Badge de Destaque */}
              {plan.badge && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: plan.popular ? '#10b981' : 'rgba(59, 130, 246, 0.2)',
                  color: plan.popular ? '#ffffff' : 'var(--accent-blue)',
                  border: plan.popular ? 'none' : '1px solid rgba(59, 130, 246, 0.4)',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {plan.badge}
                </div>
              )}

              <div>
                {/* Nome & Preço */}
                <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', minHeight: '38px', lineHeight: '1.4' }}>
                  {plan.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '34px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {plan.pricePeriod}
                  </span>
                </div>

                {/* Caixa do Limite de IA */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '24px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: plan.aiLimitCount > 0 ? '#38bdf8' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Zap size={16} style={{ color: plan.aiLimitCount > 0 ? '#38bdf8' : 'var(--text-muted)' }} />
                  <span>{plan.aiLimitText}</span>
                </div>

                {/* Lista de Recursos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    O que está incluso:
                  </span>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                      <Check size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão de Assinatura */}
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isLoading || isCurrentPlan}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isCurrentPlan ? 'rgba(255, 255, 255, 0.1)' : plan.buttonBg,
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: isCurrentPlan || isLoading ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: isCurrentPlan ? 'none' : '0 4px 14px rgba(0,0,0,0.3)',
                  transition: 'opacity 0.2s ease'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Conectando à Stripe...</span>
                  </>
                ) : isCurrentPlan ? (
                  <span>✓ Seu Plano Atual</span>
                ) : (
                  <>
                    <span>Assinar Plano {plan.name}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer de Segurança Stripe */}
      <div style={{
        marginTop: '48px',
        textAlign: 'center',
        padding: '24px',
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <Shield size={18} style={{ color: '#10b981' }} />
          <span>Pagamento 100% Seguro via <strong>Stripe Billing</strong> (Ambiente de Teste)</span>
        </div>
        <span style={{ color: 'var(--border-color)' }}>•</span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cancele a qualquer momento sem fidelidade</span>
      </div>
    </div>
  );
};
