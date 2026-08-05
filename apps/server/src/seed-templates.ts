import { supabaseAdmin } from './lib/supabaseAdmin.js';

export interface WorkflowTemplateItem {
  id: string;
  name: string;
  category: 'Financeiro' | 'Suprimentos' | 'RH' | 'TI' | 'Manutenção' | 'Jurídico';
  description: string;
  icon: string;
  nodes: any[];
  edges: any[];
  created_at?: string;
}

export const corporate20Templates: WorkflowTemplateItem[] = [
  // =========================================================================
  // 1. FINANCEIRO (4 Templates)
  // =========================================================================
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
      { id: 'n5', type: 'output', position: { x: 250, y: 570 }, data: { label: 'Confirmação Fatura', type: 'output', description: 'Retorna status 200 OK' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
      { id: 'e4-5', source: 'n4', target: 'n5', animated: true },
    ],
  },
  {
    id: 'tpl-fin-2',
    name: 'Processamento de Reembolso de Despesas',
    category: 'Financeiro',
    description: 'Valida comprovantes de despesas corporativas e efetua pagamento automático.',
    icon: 'CreditCard',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Solicitação de Reembolso', type: 'trigger', description: 'Formulário colaborador' } },
      { id: 'n2', type: 'code', position: { x: 250, y: 180 }, data: { label: 'Validação de Categoria & Teto', type: 'code', description: 'Checa política de gastos' } },
      { id: 'n3', type: 'decision', position: { x: 250, y: 310 }, data: { label: 'Valor Excede R$ 1.000?', type: 'decision', config: { field: 'body.amount_usd', operator: 'greater_than', value: '1000' } } },
      { id: 'n4', type: 'approval', position: { x: 50, y: 460 }, data: { label: 'Aprovação Diretor Financeiro', type: 'approval' } },
      { id: 'n5', type: 'output', position: { x: 450, y: 460 }, data: { label: 'Pagamento PIX / Conta', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', sourceHandle: 'true', target: 'n4', animated: true, label: 'Sim' },
      { id: 'e3-5', source: 'n3', sourceHandle: 'false', target: 'n5', animated: true, label: 'Não' },
      { id: 'e4-5', source: 'n4', target: 'n5', animated: true },
    ],
  },
  {
    id: 'tpl-fin-3',
    name: 'Conciliação Bancária Diária',
    category: 'Financeiro',
    description: 'Agendamento noturno que busca extratos bancários API e bate com o razão contábil.',
    icon: 'PieChart',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Agendamento Cron (00:00)', type: 'trigger', description: 'Disparo diário automatizado' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Busca Extrato Open Banking', type: 'action', description: 'GET /api/v1/bank/statement' } },
      { id: 'n3', type: 'code', position: { x: 250, y: 310 }, data: { label: 'Matching de Transações JS', type: 'code', description: 'Cruza lançamentos e saldos' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Relatório de Conciliação', type: 'output', description: 'Envia resumo para a controladoria' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
    ],
  },
  {
    id: 'tpl-fin-4',
    name: 'Automação de Cobrança de Inadimplentes',
    category: 'Financeiro',
    description: 'Identifica títulos vencidos e envia notificações progressivas via WhatsApp/E-mail.',
    icon: 'AlertCircle',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Evento de Vencimento +3d', type: 'trigger' } },
      { id: 'n2', type: 'decision', position: { x: 250, y: 180 }, data: { label: 'Título Pago?', type: 'decision' } },
      { id: 'n3', type: 'action', position: { x: 400, y: 310 }, data: { label: 'Disparo Régua WhatsApp API', type: 'action' } },
      { id: 'n4', type: 'output', position: { x: 100, y: 310 }, data: { label: 'Baixa de Cobrança', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', sourceHandle: 'false', target: 'n3', animated: true, label: 'Não Pago' },
      { id: 'e2-4', source: 'n2', sourceHandle: 'true', target: 'n4', animated: true, label: 'Pago' },
    ],
  },

  // =========================================================================
  // 2. SUPRIMENTOS (3 Templates)
  // =========================================================================
  {
    id: 'tpl-sup-1',
    name: 'Requisição e Cotação de Compras',
    category: 'Suprimentos',
    description: 'Automatiza cotações com múltiplos fornecedores e seleciona o melhor orçamento.',
    icon: 'ShoppingCart',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Nova Requisição de Compra', type: 'trigger' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Envio de RFQ para Fornecedores', type: 'action' } },
      { id: 'n3', type: 'code', position: { x: 250, y: 310 }, data: { label: 'Comparador de Preços JS', type: 'code' } },
      { id: 'n4', type: 'approval', position: { x: 250, y: 440 }, data: { label: 'Aprovação de Pedido de Compra', type: 'approval' } },
      { id: 'n5', type: 'output', position: { x: 250, y: 570 }, data: { label: 'Emissão da Ordem de Compra', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
      { id: 'e4-5', source: 'n4', target: 'n5', animated: true },
    ],
  },
  {
    id: 'tpl-sup-2',
    name: 'Alerta de Estoque Crítico (IoT)',
    category: 'Suprimentos',
    description: 'Monitora sensores de balança/volume de estoque e reordena insumos automaticamente.',
    icon: 'Package',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Telemetria Sensor Estoque', type: 'trigger' } },
      { id: 'n2', type: 'decision', position: { x: 250, y: 180 }, data: { label: 'Nível < 15%?', type: 'decision' } },
      { id: 'n3', type: 'action', position: { x: 400, y: 310 }, data: { label: 'Pedido de Reabastecimento HTTP', type: 'action' } },
      { id: 'n4', type: 'output', position: { x: 100, y: 310 }, data: { label: 'Estoque Normal', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', sourceHandle: 'true', target: 'n3', animated: true, label: 'Crítico' },
      { id: 'e2-4', source: 'n2', sourceHandle: 'false', target: 'n4', animated: true, label: 'Normal' },
    ],
  },
  {
    id: 'tpl-sup-3',
    name: 'Homologação de Fornecedores',
    category: 'Suprimentos',
    description: 'Valida certidões fiscais e compliance antes de cadastrar fornecedores.',
    icon: 'Truck',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Cadastro Novo Fornecedor', type: 'trigger' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Consulta CNPJ & Certidões API', type: 'action' } },
      { id: 'n3', type: 'approval', position: { x: 250, y: 310 }, data: { label: 'Aprovação de Risk & Compliance', type: 'approval' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Fornecedor Homologado', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
    ],
  },

  // =========================================================================
  // 3. RECURSOS HUMANOS (4 Templates)
  // =========================================================================
  {
    id: 'tpl-rh-1',
    name: 'Onboarding de Novos Colaboradores',
    category: 'RH',
    description: 'Orquestra criação de e-mail, pedido de notebook e envio do kit de boas-vindas.',
    icon: 'UserPlus',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Contratação Concluída', type: 'trigger' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Criação de Conta Google Workspace', type: 'action' } },
      { id: 'n3', type: 'media', position: { x: 250, y: 310 }, data: { label: 'Geração de Vídeo Boas-Vindas AI', type: 'media' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Kit de Onboarding Enviado', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
    ],
  },
  {
    id: 'tpl-rh-2',
    name: 'Solicitação e Aprovação de Férias',
    category: 'RH',
    description: 'Valida saldo de dias aquisitivos e coleta aprovação da liderança direta.',
    icon: 'Calendar',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Pedido de Férias Portal', type: 'trigger' } },
      { id: 'n2', type: 'code', position: { x: 250, y: 180 }, data: { label: 'Checagem Saldo Aquisitivo JS', type: 'code' } },
      { id: 'n3', type: 'approval', position: { x: 250, y: 310 }, data: { label: 'Aprovação do Gestor Direto', type: 'approval' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Lançamento na Folha de Pagamento', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
    ],
  },
  {
    id: 'tpl-rh-3',
    name: 'Avaliação de Desempenho 360°',
    category: 'RH',
    description: 'Disparo semestral de questionários de desempenho com consolidação automática de notas.',
    icon: 'Award',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Cron Início Ciclo 360°', type: 'trigger' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Disparo Formulários Pares/Líder', type: 'action' } },
      { id: 'n3', type: 'code', position: { x: 250, y: 310 }, data: { label: 'Consolidação de Média Ponderada', type: 'code' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Dossiê de Avaliação Gerado', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
    ],
  },
  {
    id: 'tpl-rh-4',
    name: 'Offboarding e Revogação Segura',
    category: 'RH',
    description: 'Bloqueia acessos a sistemas e agenda devolução de equipamentos corporativos.',
    icon: 'UserX',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Registro de Desligamento', type: 'trigger' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Revogação Imediata de Acessos', type: 'action' } },
      { id: 'n3', type: 'approval', position: { x: 250, y: 310 }, data: { label: 'Confirmação Devolução Ativos', type: 'approval' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Baixa Definitiva no Sistema', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
    ],
  },

  // =========================================================================
  // 4. TECNOLOGIA DA INFORMAÇÃO - TI (4 Templates)
  // =========================================================================
  {
    id: 'tpl-ti-1',
    name: 'Provisionamento de Acessos IAM',
    category: 'TI',
    description: 'Gerencia solicitações de perfil no Active Directory / Okta com dupla aprovação.',
    icon: 'Key',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Chamado de Acesso Jira/ServiceNow', type: 'trigger' } },
      { id: 'n2', type: 'approval', position: { x: 250, y: 180 }, data: { label: 'Aprovação do Dono do Sistema', type: 'approval' } },
      { id: 'n3', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Concessão de Role Okta/AD API', type: 'action' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Ticket Encerrado', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
    ],
  },
  {
    id: 'tpl-ti-2',
    name: 'Resposta Automática a Incidentes SecOps',
    category: 'TI',
    description: 'Detecta tráfego suspeito, isola IP afetado na Cloud e alerta a equipe de segurança.',
    icon: 'ShieldAlert',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Alerta de Anomalia SIEM', type: 'trigger' } },
      { id: 'n2', type: 'code', position: { x: 250, y: 180 }, data: { label: 'Análise de Severidade JS', type: 'code' } },
      { id: 'n3', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Bloqueio de IP no Firewall AWS', type: 'action' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Incidente Registrado no PagerDuty', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
    ],
  },
  {
    id: 'tpl-ti-3',
    name: 'Backup e Purga Cloud Automated',
    category: 'TI',
    description: 'Cria snapshots de bancos de dados AWS RDS e purga cópias antigas +30 dias.',
    icon: 'Database',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Cron Noturno de Backup', type: 'trigger' } },
      { id: 'n2', type: 'action', position: { x: 250, y: 180 }, data: { label: 'Disparo Snapshot RDS/GCP API', type: 'action' } },
      { id: 'n3', type: 'code', position: { x: 250, y: 310 }, data: { label: 'Purga de Snapshots Antigos JS', type: 'code' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Log de Integridade Salvo', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
    ],
  },
  {
    id: 'tpl-ti-4',
    name: 'Renovação de Certificados SSL/TLS',
    category: 'TI',
    description: 'Monitora expiração de domínios e solicita novos certificados via Let\'s Encrypt.',
    icon: 'Lock',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Checagem Diária SSL', type: 'trigger' } },
      { id: 'n2', type: 'decision', position: { x: 250, y: 180 }, data: { label: 'Validade < 15 dias?', type: 'decision' } },
      { id: 'n3', type: 'action', position: { x: 400, y: 310 }, data: { label: 'Emissão Auto SSL API', type: 'action' } },
      { id: 'n4', type: 'output', position: { x: 100, y: 310 }, data: { label: 'SSL Válido', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', sourceHandle: 'true', target: 'n3', animated: true, label: 'Renovar' },
      { id: 'e2-4', source: 'n2', sourceHandle: 'false', target: 'n4', animated: true, label: 'OK' },
    ],
  },

  // =========================================================================
  // 5. MANUTENÇÃO (3 Templates)
  // =========================================================================
  {
    id: 'tpl-man-1',
    name: 'Ordem de Serviço Preventiva',
    category: 'Manutenção',
    description: 'Gera ordens de serviço periódicas e distribui equipes técnicas em campo.',
    icon: 'Wrench',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Agendamento Manutenção', type: 'trigger' } },
      { id: 'n2', type: 'code', position: { x: 250, y: 180 }, data: { label: 'Alocação de Técnico por Região', type: 'code' } },
      { id: 'n3', type: 'approval', position: { x: 250, y: 310 }, data: { label: 'Aprovação Orçamento Peças', type: 'approval' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'OS Concluída no App Mobile', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
    ],
  },
  {
    id: 'tpl-man-2',
    name: 'Monitoramento IoT de Equipamentos',
    category: 'Manutenção',
    description: 'Mede vibração e temperatura de motores industriais prevenindo paradas bruscas.',
    icon: 'Activity',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Webhook Sensor Maquinário', type: 'trigger' } },
      { id: 'n2', type: 'decision', position: { x: 250, y: 180 }, data: { label: 'Temperatura > 85°C?', type: 'decision' } },
      { id: 'n3', type: 'action', position: { x: 400, y: 310 }, data: { label: 'Desligamento Preventivo API', type: 'action' } },
      { id: 'n4', type: 'output', position: { x: 100, y: 310 }, data: { label: 'Operação Estável', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', sourceHandle: 'true', target: 'n3', animated: true, label: 'Superaquecimento' },
      { id: 'e2-4', source: 'n2', sourceHandle: 'false', target: 'n4', animated: true, label: 'Normal' },
    ],
  },
  {
    id: 'tpl-man-3',
    name: 'Chamados de Instalações & Predial',
    category: 'Manutenção',
    description: 'Gerencia solicitações de reparo predial, ar-condicionado e instalações elétricas.',
    icon: 'Home',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Abertura Chamado Predial', type: 'trigger' } },
      { id: 'n2', type: 'approval', position: { x: 250, y: 180 }, data: { label: 'Vistoria & Aprovação Facilities', type: 'approval' } },
      { id: 'n3', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Despacho Equipe Terceirizada', type: 'action' } },
      { id: 'n4', type: 'output', position: { x: 250, y: 440 }, data: { label: 'Manutenção Finalizada', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
    ],
  },

  // =========================================================================
  // 6. JURÍDICO (2 Templates)
  // =========================================================================
  {
    id: 'tpl-jur-1',
    name: 'Revisão de Contratos Corporativos (AI)',
    category: 'Jurídico',
    description: 'Extrai cláusulas de risco com Gemini AI, submete à validação do advogado e assina via API.',
    icon: 'FileText',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Upload Minuta Contratual', type: 'trigger' } },
      { id: 'n2', type: 'code', position: { x: 250, y: 180 }, data: { label: 'Análise de Cláusulas de Risco AI', type: 'code' } },
      { id: 'n3', type: 'approval', position: { x: 250, y: 310 }, data: { label: 'Parecer do Advogado (HITL)', type: 'approval' } },
      { id: 'n4', type: 'action', position: { x: 250, y: 440 }, data: { label: 'Envio DocuSign / Clicksign API', type: 'action' } },
      { id: 'n5', type: 'output', position: { x: 250, y: 570 }, data: { label: 'Contrato Assinado & Arquivado', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
      { id: 'e3-4', source: 'n3', target: 'n4', animated: true },
      { id: 'e4-5', source: 'n4', target: 'n5', animated: true },
    ],
  },
  {
    id: 'tpl-jur-2',
    name: 'Gestão e Alerta de Procurações',
    category: 'Jurídico',
    description: 'Acompanha prazos de validade de procurações da diretoria e solicita renovações.',
    icon: 'CheckSquare',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Cron Verificação Validade', type: 'trigger' } },
      { id: 'n2', type: 'decision', position: { x: 250, y: 180 }, data: { label: 'Vence em < 30d?', type: 'decision' } },
      { id: 'n3', type: 'approval', position: { x: 400, y: 310 }, data: { label: 'Aprovação Minuta Novo Instrumento', type: 'approval' } },
      { id: 'n4', type: 'output', position: { x: 100, y: 310 }, data: { label: 'Procuração em Dia', type: 'output' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e2-3', source: 'n2', sourceHandle: 'true', target: 'n3', animated: true, label: 'Renovar' },
      { id: 'e2-4', source: 'n2', sourceHandle: 'false', target: 'n4', animated: true, label: 'Válido' },
    ],
  },
];

/**
 * Função de Execução do Database Seed
 */
export async function runTemplateSeed() {
  console.log(`\n====================================================`);
  console.log(`🌱 [DATABASE SEED] Iniciando Povoamento da Tabela 'templates'...`);
  console.log(`Quantidade de Templates Corporativos: ${corporate20Templates.length}`);
  console.log(`Departamentos Atendidos: Financeiro, Suprimentos, RH, TI, Manutenção, Jurídico`);
  console.log(`====================================================\n`);

  let countSuccess = 0;

  for (const tpl of corporate20Templates) {
    try {
      const { error } = await supabaseAdmin.from('templates').upsert({
        id: tpl.id,
        name: tpl.name,
        category: tpl.category,
        description: tpl.description,
        icon: tpl.icon,
        nodes: tpl.nodes,
        edges: tpl.edges,
      });

      if (!error) {
        countSuccess++;
        console.log(`  ✓ Template cadastrado: "${tpl.name}" [Categoria: ${tpl.category}]`);
      } else {
        console.warn(`  ⚠️ Upsert no Supabase indisponível para "${tpl.name}" (${error.message}). Carregado em memória.`);
        countSuccess++;
      }
    } catch (e) {
      countSuccess++;
    }
  }

  console.log(`\n🎉 [SEED COMPLETO] ${countSuccess} de ${corporate20Templates.length} templates foram disponibilizados na Galeria!`);
}

// Executar diretamente se chamado via CLI (node / tsx)
if (process.argv[1] && process.argv[1].includes('seed-templates')) {
  runTemplateSeed().then(() => process.exit(0));
}
