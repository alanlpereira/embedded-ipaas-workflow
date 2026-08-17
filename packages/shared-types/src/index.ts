export type UserRole = 'Master' | 'Admin' | 'Member' | 'Viewer';

export type PlanTier = 'Forge' | 'Kinex' | 'Axiom' | 'Synapse' | 'LegalOps';

export interface Organization {
  id: string;
  name: string;
  plan_tier: PlanTier;
  ai_tokens_limit: number;
  ai_tokens_used: number;
  custom_token_override?: number;
  require_email_verification?: boolean;
  require_phone_verification?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppFeatureFlags {
  require_email_verification: boolean;
  require_phone_verification: boolean;
}

export interface AppSettings {
  key: string;
  value: AppFeatureFlags;
  description?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  professional_id?: string; // Ex: OAB, CREA, CRM
  oab_number?: string;
  oab_uf?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_plan?: string;
  subscription_status?: string;
  ai_monthly_limit?: number;
  ai_monthly_usage?: number;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type NodeType = 'trigger' | 'action' | 'decision' | 'approval' | 'output' | 'code' | 'media' | 'http' | 'schedule' | 'email_trigger' | 'email_approval' | 'end' | 'jump' | 'whatsapp' | 'teams';

export interface HttpNodeConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  credential_id?: string;
  headers?: Record<string, string> | string;
  body?: string;
}

export interface ScheduleNodeConfig {
  recurrenceType: 'daily' | 'weekly' | 'monthly';
  time: string; // "HH:MM" ex: "09:00"
  daysOfWeek: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  dayOfMonth: number; // 1-31
  cronExpression: string; // Ex: "0 9 * * 1-5"
}

export interface EmailTriggerConfig {
  mode: 'synapse_inbound' | 'custom_imap';
  inboundEmail?: string;
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPass?: string;
  filterSubject?: string;
  filterFrom?: string;
  filterDomain?: string;
  filterTld?: string;
  filterSinceDate?: string; // YYYY-MM-DD ex: "2026-01-01"
  filterUntilDate?: string; // YYYY-MM-DD
  emailAction?: 'summarize' | 'save_attachments' | 'summarize_and_save_attachments' | 'raw_pass';
  outputDestinationType?: 'none' | 'whatsapp' | 'email' | 'both';
  outputWhatsappNumber?: string; // ex: "+5532988654825"
  outputEmailAddress?: string; // ex: "alanlpereira@hotmail.com"
  attachmentPassword?: string; // Senha para abrir PDFs protegidos (ex: CPF/CNPJ)
  maxEmails?: number;
  onlyWithAttachments?: boolean;
  useTls?: boolean;
}

export interface EmailApprovalConfig {
  sender?: string;
  recipients: string;
  to?: string;
  subject: string;
  message: string;
  [key: string]: any;
}

export interface JumpNodeConfig {
  jumpId: string; // Ex: "1", "2", "3" ou "A"
}

export interface WhatsAppNodeConfig {
  destinationNumber: string;
  message: string;
  apiUrl?: string;
  apiKey?: string;
  provider?: 'default_gateway' | 'ultramsg' | 'zapi' | 'callmebot' | 'custom_webhook';
}

export interface TeamsNodeConfig {
  webhookUrl: string;
  cardMessage: string;
}

export interface WorkflowNodeData {
  label: string;
  type: NodeType;
  description?: string;
  config?: Record<string, any>;
  settings?: Record<string, any>;
  httpConfig?: HttpNodeConfig;
  scheduleConfig?: ScheduleNodeConfig;
  emailConfig?: EmailTriggerConfig;
  approvalConfig?: EmailApprovalConfig;
  jumpConfig?: JumpNodeConfig;
  whatsappConfig?: WhatsAppNodeConfig;
  teamsConfig?: TeamsNodeConfig;
  cronExpression?: string;
  outputs?: Array<{ key: string; label: string; type: string }>;
  [key: string]: any;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, any>;
}

export interface Folder {
  id: string;
  organization_id?: string;
  user_id?: string;
  name: string;
  icon?: string;
  created_at?: string;
}

export interface Flowchart {
  id: string;
  organization_id: string;
  folder_id?: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  is_published: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookTriggerPayload {
  flowchart_id: string;
  event: string;
  data: Record<string, any>;
}

export interface ExecutionResult {
  execution_id: string;
  flowchart_id: string;
  status: 'COMPLETED' | 'PAUSED' | 'FAILED';
  current_node_id?: string;
  logs: Array<{
    timestamp: string;
    node_id: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
  }>;
}

export interface CredentialVaultItem {
  id: string;
  organization_id: string;
  name: string;
  service_type: 'whatsapp' | 'sendgrid' | 'slack' | 'custom_bearer' | 'api_key';
  masked_value: string;
  secret_value?: string;
  created_at: string;
  updated_at: string;
}
