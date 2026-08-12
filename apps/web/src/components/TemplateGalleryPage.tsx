import React, { useState, useEffect } from 'react';
import { LayoutTemplate, Sparkles, ArrowRight, DollarSign, CreditCard, PieChart, AlertCircle, ShoppingCart, Package, Truck, UserPlus, Calendar, Award, UserX, Key, ShieldAlert, Database, Lock, Wrench, Activity, Home, FileText, CheckSquare, Layers } from 'lucide-react';
import { Profile } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';
import { getApiUrl } from '../lib/api';

export type TemplateCategory = 'Todos' | 'Financeiro' | 'Suprimentos' | 'RH' | 'TI' | 'Manutenção' | 'Jurídico';

export interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  nodes: any[];
  edges: any[];
}

interface TemplateGalleryPageProps {
  currentProfile: Profile | null;
  onUseTemplate: (template: WorkflowTemplate) => void;
}

const categoryIcons: Record<TemplateCategory, React.ElementType> = {
  Todos: Layers,
  Financeiro: DollarSign,
  Suprimentos: ShoppingCart,
  RH: UserPlus,
  TI: Key,
  Manutenção: Wrench,
  Jurídico: FileText,
};

const iconMap: Record<string, React.ElementType> = {
  DollarSign,
  CreditCard,
  PieChart,
  AlertCircle,
  ShoppingCart,
  Package,
  Truck,
  UserPlus,
  Calendar,
  Award,
  UserX,
  Key,
  ShieldAlert,
  Database,
  Lock,
  Wrench,
  Activity,
  Home,
  FileText,
  CheckSquare,
};

// Fallback estático com os 21 templates oficiais corporativos (incluindo o fluxo jurídico de intimações)
export const fallback21Templates: WorkflowTemplate[] = [
  {
    id: 'tpl-jur-pje-comunica',
    name: 'Consulta Diária PJe Comunica (OAB & Intimações)',
    category: 'Jurídico',
    description: 'Automação jurídica diária executada às 08:00 AM que acessa o PJe Comunica (comunica.pje.jus.br) pesquisando intimações por Nº e UF da OAB (ex: 145105 MG) do dia anterior ao dia de hoje. A IA Gemini elabora um resumo com o órgão julgador, número do processo, partes e prazos fatais, envia aprovação por e-mail com botões SIM/NÃO e dispara via WhatsApp para o cliente se aprovado.',
    icon: 'FileText',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: '⏰ Agendamento Diário (08:00 AM)', type: 'trigger', description: 'Execução diária às 08:00 (Data Inicial: Ontem | Data Final: Hoje)' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: '🌐 Consulta PJe Comunica (comunica.pje.jus.br)', type: 'action', description: 'Pesquisa no PJe Comunica com OAB 145105 e UF MG (Dia anterior ➔ Hoje)' } },
      { id: 'n3', type: 'action', position: { x: 250, y: 310 }, data: { label: '✨ Resumo de Intimações & Prazos via IA Gemini', type: 'action', description: 'IA extrai órgão julgador, nº do processo, partes, ações necessárias e prazos' } },
      { id: 'n4', type: 'approval', position: { x: 250, y: 440 }, data: { label: '✉️ Pergunta por E-mail: Enviar para o cliente? (Sim / Não)', type: 'approval', description: 'Envia e-mail para alanlpereira@hotmail.com com botões de aprovação SIM / NÃO' } },
      { id: 'n5', type: 'output', position: { x: 250, y: 570 }, data: { label: '📱 Disparo WhatsApp (+55 37 9958-3402)', type: 'output', description: 'Dispara o resumo no WhatsApp +553799583402 se aprovado no e-mail' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
      { id: 'e4-5', source: 'n4', sourceHandle: 'approved', target: 'n5', animated: true, label: 'Se Aprovado (SIM)' }
    ]
  },
  {
    id: 'tpl-jur-1',
    name: 'Triagem de Intimações e Gestão de Prazos',
    category: 'Jurídico',
    description: 'Automação para escritórios de advocacia que recebe intimações judiciais via e-mail webhook, extrai dados cruciais com IA Gemini (número do processo, partes e prazo fatal), avalia urgência (< 3 dias), salva no sistema de gestão jurídica, notifica via Slack/WhatsApp e exige aprovação HITL do advogado.',
    icon: 'FileText',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Recebimento de E-mail (Intimação)', type: 'trigger', description: 'Webhook acionado ao receber e-mail de intimação judicial' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Extração AI Gemini (Intimação)', type: 'action', description: 'IA extrai nº do processo, nomes das partes e data do prazo fatal' } },
      { id: 'n3', type: 'decision', position: { x: 250, y: 310 }, data: { label: 'Condicional: Prazo < 3 Dias?', type: 'decision', description: 'Se prazo fatal <= 3 dias -> Rota de Urgência Prioritária' } },
      { id: 'n4', type: 'action', position: { x: 250, y: 440 }, data: { label: 'Salvar no Sistema de Gestão Jurídica', type: 'action', description: 'HTTP POST /api/v1/legal/prazos (Cadastra processo e agenda)' } },
      { id: 'n5', type: 'action', position: { x: 250, y: 570 }, data: { label: 'Notificação Slack / WhatsApp', type: 'action', description: 'Envia mensagem ao advogado responsável com resumo e prazo' } },
      { id: 'n6', type: 'approval', position: { x: 250, y: 700 }, data: { label: 'Confirmação HITL (Advogado)', type: 'approval', description: 'Exige clique em Aprovar/Ciente para homologar triagem' } },
      { id: 'n7', type: 'output', position: { x: 250, y: 830 }, data: { label: 'Prazo Cadastrado & Validado', type: 'output', description: 'Triagem concluída com registro auditado no banco' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', sourceHandle: 'true', target: 'n4', animated: true, label: 'Urgente (< 3d)' },
      { id: 'e3-4b', source: 'n3', sourceHandle: 'false', target: 'n4', animated: true, label: 'Prazo Normal' },
      { id: 'e4-5', source: 'n4', target: 'n5', animated: true },
      { id: 'e5-6', source: 'n5', target: 'n6', animated: true },
      { id: 'e6-7', source: 'n6', target: 'n7', animated: true }
    ]
  },
  {
    id: 'tpl-fin-1',
    name: 'Aprovação de Faturas ERP',
    category: 'Financeiro',
    description: 'Recebe fatura via webhook, extrai dados via IA, solicita aprovação HITL e lança no ERP.',
    icon: 'DollarSign',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Webhook Entrada Fatura', type: 'trigger', description: 'POST /api/v1/invoices' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Extração AI de Dados', type: 'action', description: 'Lê CNPJ, valor e vencimento' } },
      { id: 'n3', type: 'approval', position: { x: 250, y: 310 }, data: { label: 'Aprovação Gestor (HITL)', type: 'approval', description: 'Validação de alçada financeira' } },
      { id: 'n4', type: 'action', position: { x: 250, y: 440 }, data: { label: 'Lançamento no ERP', type: 'action', description: 'POST /api/v1/erp/payables' } },
      { id: 'n5', type: 'output', position: { x: 250, y: 570 }, data: { label: 'Confirmação Fatura', type: 'output', description: 'Retorna status 200 OK' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
      { id: 'e4-5', source: 'n4', target: 'n5', animated: true }
    ]
  },
  {
    id: 'tpl-fin-2',
    name: 'Processamento de Reembolso de Despesas',
    category: 'Financeiro',
    description: 'Recebe comprovante de despesa, categoriza via IA e realiza depósito bancário.',
    icon: 'CreditCard',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Envio de Comprovante', type: 'trigger', description: 'Upload de recibo PDF/JPG' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'OCR & OCR IA Gemini', type: 'action', description: 'Extrai valor e estabelecimento' } },
      { id: 'n3', type: 'decision', position: { x: 250, y: 310 }, data: { label: 'Valor > R$ 500?', type: 'decision', description: 'Verifica teto automático' } },
      { id: 'n4', type: 'approval', position: { x: 400, y: 440 }, data: { label: 'Aprovação Gerencial', type: 'approval', description: 'HITL para valores altos' } },
      { id: 'n5', type: 'action', position: { x: 250, y: 570 }, data: { label: 'Pagamento Pix/TED', type: 'action', description: 'Integração API Open Banking' } },
      { id: 'n6', type: 'output', position: { x: 250, y: 700 }, data: { label: 'Reembolso Efetuado', type: 'output', description: 'Notifica colaborador' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', sourceHandle: 'true', target: 'n4', animated: true, label: 'Sim (> 500)' },
      { id: 'e3-5', source: 'n3', sourceHandle: 'false', target: 'n5', animated: true, label: 'Não (<= 500)' },
      { id: 'e4-5', source: 'n4', target: 'n5', animated: true },
      { id: 'e5-6', source: 'n5', target: 'n6', animated: true }
    ]
  },
  {
    id: 'tpl-fin-3',
    name: 'Conciliação Bancária Diária',
    category: 'Financeiro',
    description: 'Cruza extrato OFX/CSV com o módulo financeiro e gera relatório de divergências.',
    icon: 'PieChart',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Cron Diário (06:00)', type: 'trigger', description: 'Gatilho de agendamento automático' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Fetch Extrato Bancário', type: 'action', description: 'GET /api/v1/bank/ofx' } },
      { id: 'n3', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Matching de Lançamentos', type: 'action', description: 'Algoritmo de comparação de hash' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Relatório de Conciliação', type: 'output', description: 'Dispara e-mail com divergências' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true }
    ]
  },
  {
    id: 'tpl-fin-4',
    name: 'Automação de Cobrança de Inadimplentes',
    category: 'Financeiro',
    description: 'Identifica títulos vencidos há 5 dias, envia aviso WhatsApp e atualiza régua no CRM.',
    icon: 'AlertCircle',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Gatilho Título Vencido', type: 'trigger', description: 'Event de atraso no pagamento' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Consulta Dados do Cliente', type: 'action', description: 'GET /api/v1/crm/customers' } },
      { id: 'n3', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Envio Boleto 2ª Via WhatsApp', type: 'action', description: 'Disparo de mensagem de lembrete' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Régua Atualizada', type: 'output', description: 'Registra tentativa de contato' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true }
    ]
  },
  {
    id: 'tpl-sup-1',
    name: 'Requisição e Cotação de Compras',
    category: 'Suprimentos',
    description: 'Recebe pedido de material, dispara RFQ para 3 fornecedores e escolhe o menor preço.',
    icon: 'ShoppingCart',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Requisição de Compra', type: 'trigger', description: 'Formulário de necessidade interna' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Envio RFQ Multi-Fornecedor', type: 'action', description: 'E-mail de cotação com formulário' } },
      { id: 'n3', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Análise IA de Menor Preço', type: 'action', description: 'Compara prazos e valores' } },
      { id: 'n4', type: 'approval', position: { x: 250, y: 440 }, data: { label: 'Aprovação de Pedido HITL', type: 'approval', description: 'Comprador autoriza ordem' } },
      { id: 'n5', type: 'output', position: { x: 250, y: 570 }, data: { label: 'Ordem de Compra Emitida', type: 'output', description: 'Envia PO para fornecedor vencedor' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
      { id: 'e4-5', source: 'n4', target: 'n5', animated: true }
    ]
  },
  {
    id: 'tpl-sup-2',
    name: 'Alerta de Estoque Crítico (IoT)',
    category: 'Suprimentos',
    description: 'Leitura de sensor de peso/prateleira, dispara alerta de reposição emergencial.',
    icon: 'Package',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Sensor IoT Estoque Mínimo', type: 'trigger', description: 'Evento de peso de prateleira < 15%' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Consulta SKU no WMS', type: 'action', description: 'Verifica estoque de segurança' } },
      { id: 'n3', type: 'output', position: { x: 250, y: 310 }, data: { label: 'Alerta de Reposição urgente', type: 'output', description: 'Notifica Almoxarifado via Slack' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true }
    ]
  },
  {
    id: 'tpl-sup-3',
    name: 'Homologação de Fornecedores',
    category: 'Suprimentos',
    description: 'Valida CNPJ na Receita Federal, certidões negativas e insere fornecedor homologado.',
    icon: 'Truck',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Cadastro de Fornecedor', type: 'trigger', description: 'Formulário de parceiro B2B' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Consulta CNPJ & CNDs', type: 'action', description: 'Integração API Receita Federal' } },
      { id: 'n3', type: 'decision', position: { x: 250, y: 310 }, data: { label: 'Situação Regular?', type: 'decision', description: 'Verifica certidões de débitos' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Fornecedor Homologado', type: 'output', description: 'Cadastra no ERP' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', sourceHandle: 'true', target: 'n4', animated: true, label: 'Regular' }
    ]
  },
  {
    id: 'tpl-log-1',
    name: 'Rastreamento e Alerta de Carga Atrasada',
    category: 'Suprimentos',
    description: 'Monitora posição GPS de transportadoras e dispara plano de contingência se atraso > 2h.',
    icon: 'Truck',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Webhook Telemetria GPS', type: 'trigger', description: 'Leitura periódica de frota' } },
      { id: 'n2', type: 'decision', position: { x: 250, y: 180 }, data: { label: 'ETA com Atraso > 2h?', type: 'decision', description: 'Compara previsão com janela de entrega' } },
      { id: 'n3', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Notifica Cliente & Operações', type: 'action', description: 'Envia SMS e e-mail com novo ETA' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Logística Atualizada', type: 'output', description: 'Registra incidente na torre de controle' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', sourceHandle: 'true', target: 'n3', animated: true, label: 'Atraso Detectado' },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true }
    ]
  },
  {
    id: 'tpl-rh-1',
    name: 'Onboarding de Novos Colaboradores',
    category: 'RH',
    description: 'Solicita acessos, dispara kit de boas-vindas e agenda treinamentos obrigatórios.',
    icon: 'UserPlus',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Novo Contratado no HRIS', type: 'trigger', description: 'Gatilho de nova contratação' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Criação de E-mail & Acessos', type: 'action', description: 'POST /api/v1/iam/users' } },
      { id: 'n3', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Envio Kit de Boas-Vindas', type: 'action', description: 'E-mail de onboarding com links' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Onboarding Concluído', type: 'output', description: 'Notifica gestor da equipe' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true }
    ]
  },
  {
    id: 'tpl-rh-2',
    name: 'Solicitação e Aprovação de Férias',
    category: 'RH',
    description: 'Verifica saldo de dias, solicita aprovação da liderança e agenda no sistema de folha.',
    icon: 'Calendar',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Pedido de Férias', type: 'trigger', description: 'Formulário de colaborador' } },
      { id: 'n2', type: 'decision', position: { x: 250, y: 180 }, data: { label: 'Saldo de Dias Disponível?', type: 'decision', description: 'Consulta folha de pagamento' } },
      { id: 'n3', type: 'approval', position: { x: 250, y: 310 }, data: { label: 'Aprovação da Liderança', type: 'approval', description: 'HITL do Gestor direto' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Férias Concedidas & Agendadas', type: 'output', description: 'Lança no sistema de ponto' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', sourceHandle: 'true', target: 'n3', animated: true, label: 'Saldo OK' },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true }
    ]
  },
  {
    id: 'tpl-rh-3',
    name: 'Avaliação de Desempenho 360°',
    category: 'RH',
    description: 'Coleta feedbacks de pares e liderados, compila com IA e gera relatório de PDI.',
    icon: 'Award',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Ciclo de Avaliação Aberto', type: 'trigger', description: 'Gatilho semestral de RH' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Coleta de Formulários 360°', type: 'action', description: 'Envia formulários anônimos' } },
      { id: 'n3', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Síntese PDI via Gemini IA', type: 'action', description: 'Gera mapa de competências' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Relatório PDI Entregue', type: 'output', description: 'Disponibiliza no portal do colaborador' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true }
    ]
  },
  {
    id: 'tpl-rh-4',
    name: 'Offboarding e Revogação Segura',
    category: 'RH',
    description: 'Revoga acessos em múltiplos sistemas imediatamente após o desligamento no RH.',
    icon: 'UserX',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Notificação Desligamento', type: 'trigger', description: 'Evento de encerramento de contrato' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Revogação Total de IAM', type: 'action', description: 'Bloqueia Google, Slack e VPN' } },
      { id: 'n3', type: 'output', position: { x: 250, y: 310 }, data: { label: 'Offboarding Concluído', type: 'output', description: 'Emite termo de encerramento' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true }
    ]
  },
  {
    id: 'tpl-ti-1',
    name: 'Provisionamento de Acessos IAM',
    category: 'TI',
    description: 'Analisa nível do cargo, solicita permissões no Active Directory e notifica solicitante.',
    icon: 'Key',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Ticket de Solicitação Acesso', type: 'trigger', description: 'Jira / ServiceNow Ticket' } },
      { id: 'n2', type: 'decision', position: { x: 250, y: 180 }, data: { label: 'Acesso Crítico / Admin?', type: 'decision', description: 'Valida matriz de riscos' } },
      { id: 'n3', type: 'approval', position: { x: 400, y: 310 }, data: { label: 'Aprovação CISO / HITL', type: 'approval', description: 'HITL da equipe de Segurança' } },
      { id: 'n4', type: 'action', position: { x: 250, y: 440 }, data: { label: 'Grant no Active Directory', type: 'action', description: 'Executa script PowerShell / Azure API' } },
      { id: 'n5', type: 'output', position: { x: 250, y: 570 }, data: { label: 'Acesso Liberado com Sucesso', type: 'output', description: 'Fecha ticket de atendimento' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', sourceHandle: 'true', target: 'n3', animated: true, label: 'Sim (Crítico)' },
      { id: 'e2-4', source: 'n2', sourceHandle: 'false', target: 'n4', animated: true, label: 'Não (Padrão)' },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
      { id: 'e4-5', source: 'n4', target: 'n5', animated: true }
    ]
  },
  {
    id: 'tpl-ti-2',
    name: 'Resposta Automática a Incidentes SecOps',
    category: 'TI',
    description: 'Detecta ataque de força bruta no SIEM, isola o IP no Firewall e abre chamado urgente.',
    icon: 'ShieldAlert',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Alerta SIEM / SOC', type: 'trigger', description: 'Tentativas de invasão > 50/min' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Block IP no Firewall', type: 'action', description: 'API Cloudflare / Fortinet Block' } },
      { id: 'n3', type: 'output', position: { x: 250, y: 310 }, data: { label: 'Incidente Mitigado', type: 'output', description: 'Alerta SecOps no Telegram' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true }
    ]
  },
  {
    id: 'tpl-ti-3',
    name: 'Backup e Purga Cloud Automated',
    category: 'TI',
    description: 'Gera snapshot de bancos de dados PostgreSQL/AWS RDS e expurga registros > 90 dias.',
    icon: 'Database',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Cron Semanal (Domingo 02:00)', type: 'trigger', description: 'Agendador automático' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Snapshot AWS RDS', type: 'action', description: 'Cria cópia fria em S3 Glacier' } },
      { id: 'n3', type: 'output', position: { x: 250, y: 310 }, data: { label: 'Backup Auditado OK', type: 'output', description: 'Envia hash de integridade' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true }
    ]
  },
  {
    id: 'tpl-ti-4',
    name: 'Renovação de Certificados SSL/TLS',
    category: 'TI',
    description: 'Checa expiração de domínios, renova via Let\'s Encrypt e aplica nos servidores web.',
    icon: 'Lock',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Cron Diário SSL Check', type: 'trigger', description: 'Verifica validade dos certificados' } },
      { id: 'n2', type: 'decision', position: { x: 250, y: 180 }, data: { label: 'Expira em < 15 dias?', type: 'decision', description: 'Compara data atual com expiração' } },
      { id: 'n3', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Renovação Certbot / ACME', type: 'action', description: 'Emite novo certificado SSL' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Domínio Protegido', type: 'output', description: 'Notifica equipe de Infra' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', sourceHandle: 'true', target: 'n3', animated: true, label: 'Renovar' },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true }
    ]
  },
  {
    id: 'tpl-man-1',
    name: 'Ordem de Serviço Preventiva Industriais',
    category: 'Manutenção',
    description: 'Gera OS preventiva mensal por máquina, aloca técnico e solicita visto de conclusão.',
    icon: 'Wrench',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Plano de Manutenção Mensal', type: 'trigger', description: 'Gatilho periódico por equipamento' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Abertura OS no CMMS', type: 'action', description: 'Gera checklist técnico' } },
      { id: 'n3', type: 'approval', position: { x: 250, y: 310 }, data: { label: 'Visto do Engenheiro HITL', type: 'approval', description: 'Aprovação de execução técnica' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'OS Encerrada com Sucesso', type: 'output', description: 'Atualiza histórico da máquina' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true }
    ]
  },
  {
    id: 'tpl-man-2',
    name: 'Monitoramento IoT de Equipamentos Críticos',
    category: 'Manutenção',
    description: 'Analisa temperatura/vibração de motores industriais e desliga máquina se houver superaquecimento.',
    icon: 'Activity',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Telemetry Sensor Motores', type: 'trigger', description: 'Leitura a cada 5 segundos' } },
      { id: 'n2', type: 'decision', position: { x: 250, y: 180 }, data: { label: 'Temp > 85°C ou Vibração Alta?', type: 'decision', description: 'Verifica limites de segurança' } },
      { id: 'n3', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Comando Desligamento CLP', type: 'action', description: 'Parada de emergência preventiva' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Alerta de Emergência', type: 'output', description: 'Aciona sirene e SMS para manutenção' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', sourceHandle: 'true', target: 'n3', animated: true, label: 'Superaquecimento' },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true }
    ]
  },
  {
    id: 'tpl-man-3',
    name: 'Chamados de Instalações & Predial',
    category: 'Manutenção',
    description: 'Recebe chamados de ar-condicionado/elétrica, atribui à equipe predial e acompanha SLA.',
    icon: 'Home',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Solicitação Reparo Predial', type: 'trigger', description: 'Formulário de facilidades' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Atribuição por Especialidade', type: 'action', description: 'Encaminha para Eletricista / Refrigeração' } },
      { id: 'n3', type: 'output', position: { x: 250, y: 310 }, data: { label: 'Chamado Atendido', type: 'output', description: 'Coleta avaliação do solicitante' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true }
    ]
  },
  {
    id: 'tpl-jur-2',
    name: 'Revisão de Contratos Corporativos (AI)',
    category: 'Jurídico',
    description: 'Analisa minuta contratual com IA, destaca cláusulas abusivas e recomenda ajustes.',
    icon: 'FileText',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Upload de Minuta PDF/Docx', type: 'trigger', description: 'Envio de contrato para revisão' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Análise Risco IA Gemini', type: 'action', description: 'Identifica multas e vigência' } },
      { id: 'n3', type: 'approval', position: { x: 250, y: 310 }, data: { label: 'Aprovação Advogado HITL', type: 'approval', description: 'Revisão humana do parecer' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Parecer Jurídico Emitido', type: 'output', description: 'Envia contrato revisado' } }
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true }
    ]
  }
];

export const TemplateGalleryPage: React.FC<TemplateGalleryPageProps> = ({
  currentProfile,
  onUseTemplate,
}) => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('Todos');
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(fallback21Templates);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch(getApiUrl('/api/templates'))
      .then((res) => res.json())
      .then((data) => {
        if (data.templates && Array.isArray(data.templates) && data.templates.length > 0) {
          // Garantir que o template "Triagem de Intimações e Gestão de Prazos" seja mantido no topo
          const sorted = [...data.templates].sort((a, b) => (a.id === 'tpl-jur-1' ? -1 : b.id === 'tpl-jur-1' ? 1 : 0));
          console.log('✅ [TEMPLATES GALLERY] Templates atualizados via API Supabase/Backend:', sorted.length, sorted);
          setTemplates(sorted);
        } else {
          console.log('ℹ️ [TEMPLATES GALLERY] Usando Fallback Mock estático com 21 templates:', fallback21Templates.length);
          setTemplates(fallback21Templates);
        }
      })
      .catch((err) => {
        console.warn('⚠️ [TEMPLATES GALLERY] Falha no fetch da API. Exibindo Fallback Mock:', err);
        setTemplates(fallback21Templates);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredTemplates = selectedCategory === 'Todos'
    ? templates
    : templates.filter((tpl) => tpl.category === selectedCategory);

  const categories: TemplateCategory[] = ['Todos', 'Financeiro', 'Suprimentos', 'RH', 'TI', 'Manutenção', 'Jurídico'];

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '32px', background: 'var(--bg-primary)' }}>
      {/* Header da Galeria */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ padding: '8px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))' }}>
            <LayoutTemplate size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Galeria de Templates Corporativos
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              21 Fluxogramas Pré-Configurados em 6 Departamentos Estratégicos (Financeiro, Suprimentos, RH, TI, Manutenção e Jurídico)
            </p>
          </div>
        </div>
      </div>

      {/* Filtros de Categoria por Departamento */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '4px' }}>
        {categories.map((cat) => {
          const Icon = categoryIcons[cat] || Layers;
          const isSelected = selectedCategory === cat;
          const count = cat === 'Todos' ? templates.length : templates.filter((t) => t.category === cat).length;

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '12px',
                background: isSelected ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' : 'var(--bg-glass)',
                border: isSelected ? 'none' : '1px solid var(--border-color)',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isSelected ? 800 : 600,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isSelected ? '0 4px 15px rgba(168, 85, 247, 0.3)' : 'none',
              }}
            >
              <Icon size={16} />
              <span>{cat}</span>
              <span style={{
                fontSize: '10px',
                background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
                padding: '2px 6px',
                borderRadius: '8px',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid de Templates */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
      }}>
        {filteredTemplates.map((template) => {
          const IconComponent = iconMap[template.icon] || FileText;

          return (
            <div
              key={template.id}
              style={{
                background: 'var(--bg-glass)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{
                    padding: '10px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--accent-cyan)',
                  }}>
                    <IconComponent size={22} />
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--accent-cyan)',
                    background: 'rgba(0, 242, 254, 0.1)',
                    border: '1px solid rgba(0, 242, 254, 0.2)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                  }}>
                    {template.category}
                  </span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.3' }}>
                  {template.name}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
                  {template.description}
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-color)',
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {template.nodes?.length || 0} nós configurados
                </span>

                <button
                  onClick={() => onUseTemplate(template)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                    color: '#0a0c10',
                    fontWeight: 700,
                    fontSize: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(0, 242, 254, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Sparkles size={14} />
                  Usar Template
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
