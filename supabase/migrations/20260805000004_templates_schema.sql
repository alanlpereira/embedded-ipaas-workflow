-- Migration: Criar tabela de Templates de Fluxogramas B2B
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Geral',
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ativar RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Templates são visíveis por todos os usuários autenticados" ON public.templates;

CREATE POLICY "Templates são visíveis por todos os usuários autenticados"
    ON public.templates FOR SELECT
    USING (true);

-- População de Templates Prontos B2B
INSERT INTO public.templates (name, description, category, nodes, edges)
VALUES
(
    'Aprovação de Faturas B2B',
    'Fluxo automatizado que recebe faturas via Webhook, valida o valor e encaminha para aprovação do gestor se exceder $5.000.',
    'Financeiro',
    '[
        {
            "id": "tpl-1-node-1",
            "type": "trigger",
            "position": {"x": 250, "y": 80},
            "data": {"label": "Webhook Fatura Recebida", "type": "trigger", "description": "Gatilho POST /api/v1/webhooks/fatura"}
        },
        {
            "id": "tpl-1-node-2",
            "type": "decision",
            "position": {"x": 275, "y": 240},
            "data": {"label": "Valor > $5.000?", "type": "decision", "description": "Verifica limite de aprovação", "config": {"field": "body.invoice.amount", "operator": "greater_than", "value": "5000"}}
        },
        {
            "id": "tpl-1-node-3",
            "type": "approval",
            "position": {"x": 80, "y": 420},
            "data": {"label": "Aprovação do Diretor Financeiro", "type": "approval", "description": "Requer confirmação de alan.pereira@alp-nexus.com", "config": {"assignee": "alan.pereira@alp-nexus.com", "timeoutHours": 24}}
        },
        {
            "id": "tpl-1-node-4",
            "type": "action",
            "position": {"x": 420, "y": 420},
            "data": {"label": "Pagamento Automático API", "type": "action", "description": "Dispara ordem para o gateway bancário", "config": {"apiEndpoint": "https://api.gateway.com/v1/pay", "method": "POST"}}
        },
        {
            "id": "tpl-1-node-5",
            "type": "output",
            "position": {"x": 250, "y": 600},
            "data": {"label": "Confirmação & Recibo JSON", "type": "output", "description": "Retorna status HTTP 200 OK", "config": {"format": "JSON", "statusCode": 200}}
        }
    ]'::jsonb,
    '[
        {"id": "e1-2", "source": "tpl-1-node-1", "target": "tpl-1-node-2", "animated": true},
        {"id": "e2-true", "source": "tpl-1-node-2", "target": "tpl-1-node-3", "sourceHandle": "true", "label": "Sim (Maior)", "animated": true},
        {"id": "e2-false", "source": "tpl-1-node-2", "target": "tpl-1-node-4", "sourceHandle": "false", "label": "Não (Aprovação Direta)", "animated": true},
        {"id": "e3-5", "source": "tpl-1-node-3", "target": "tpl-1-node-5", "animated": true},
        {"id": "e4-5", "source": "tpl-1-node-4", "target": "tpl-1-node-5", "animated": true}
    ]'::jsonb
),
(
    'Roteamento & Qualificação de Leads',
    'Qualifica novos cadastros de leads B2B, sincroniza com o CRM da empresa e notifica a equipe de vendas.',
    'Vendas & Leads',
    '[
        {
            "id": "tpl-2-node-1",
            "type": "trigger",
            "position": {"x": 250, "y": 80},
            "data": {"label": "Lead Capturado no Form", "type": "trigger", "description": "Webhook de entrada do formulário comercial"}
        },
        {
            "id": "tpl-2-node-2",
            "type": "action",
            "position": {"x": 250, "y": 230},
            "data": {"label": "Sincronizar Salesforce CRM", "type": "action", "description": "Cria contato na conta do Salesforce", "config": {"apiEndpoint": "https://api.salesforce.com/v1/leads", "method": "POST"}}
        },
        {
            "id": "tpl-2-node-3",
            "type": "output",
            "position": {"x": 250, "y": 380},
            "data": {"label": "Notificação Slack / E-mail", "type": "output", "description": "Dispara alerta para o time Comercial"}
        }
    ]'::jsonb,
    '[
        {"id": "e1-2", "source": "tpl-2-node-1", "target": "tpl-2-node-2", "animated": true},
        {"id": "e2-3", "source": "tpl-2-node-2", "target": "tpl-2-node-3", "animated": true}
    ]'::jsonb
),
(
    'Onboarding & Boas-Vindas de Clientes',
    'Dispara sequência de e-mails e ativação de conta quando um novo cliente se cadastra na plataforma.',
    'Operações & RH',
    '[
        {
            "id": "tpl-3-node-1",
            "type": "trigger",
            "position": {"x": 250, "y": 80},
            "data": {"label": "Novo Cliente Cadastrado", "type": "trigger", "description": "Evento de criação de conta B2B"}
        },
        {
            "id": "tpl-3-node-2",
            "type": "action",
            "position": {"x": 250, "y": 230},
            "data": {"label": "Enviar Kit de Boas-Vindas", "type": "action", "description": "Dispara e-mail de ativação via SendGrid", "config": {"apiEndpoint": "https://api.sendgrid.com/v3/mail/send", "method": "POST"}}
        },
        {
            "id": "tpl-3-node-3",
            "type": "output",
            "position": {"x": 250, "y": 380},
            "data": {"label": "Conta Ativada", "type": "output", "description": "Finaliza processo de onboarding"}
        }
    ]'::jsonb,
    '[
        {"id": "e1-2", "source": "tpl-3-node-1", "target": "tpl-3-node-2", "animated": true},
        {"id": "e2-3", "source": "tpl-3-node-2", "target": "tpl-3-node-3", "animated": true}
    ]'::jsonb
)
ON CONFLICT DO NOTHING;
