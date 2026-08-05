# Motor de Workflow Visual B2B (Embedded iPaaS)

Monorepo contendo a estrutura inicial do **Motor de Workflow Visual B2B (Embedded iPaaS)** construído com **React (Vite + TypeScript + React Flow)** no frontend e **Node.js (Express + TypeScript)** no backend, integrado ao **Supabase (PostgreSQL & Autenticação)**.

## 🏗️ Estrutura do Monorepo

```
embedded-ipaas-workflow/
├── apps/
│   ├── web/           # Frontend React + Vite + React Flow (@xyflow/react)
│   └── server/        # API Backend Node.js + Express + Supabase Admin SDK
├── packages/
│   └── shared-types/  # Interfaces TypeScript compartilhadas (DB & Flowchart JSON)
└── supabase/
    ├── migrations/    # Schema SQL PostgreSQL (organizations, profiles, flowcharts & RLS)
    └── seed.ts        # Script de Seed (Usuário Master alan.pereira@alp-nexus.com & Org Padrão)
```

---

## 🗄️ Esquema do Banco de Dados (Supabase PostgreSQL)

A migration em `supabase/migrations/20260804_init_schema.sql` cria as 3 tabelas interligadas:

1. **`organizations`**: Organizações B2B (empresas/clientes do Embedded iPaaS).
2. **`profiles`**: Perfis de usuários vinculados às organizações com a coluna `role` aceitando:
   - `'Master'` (Acesso total administrativo)
   - `'Admin'` (Criação e edição de fluxos)
   - `'Viewer'` (Visualização somente leitura)
3. **`flowcharts`**: Gravação dos fluxos de trabalho visuais em colunas `JSONB` (`nodes`, `edges`, `viewport`).

---

## ⚡ Como Rodar o Projeto

### 1. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```
Preencha as chaves da sua instância Supabase:
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (chave service_role para o backend e seed)

### 2. Instalar Dependências
```bash
pnpm install
```

### 3. Aplicar Migrations e Rodar o Seed
Após aplicar o arquivo `supabase/migrations/20260804_init_schema.sql` no SQL Editor do seu dashboard Supabase ou via CLI:
```bash
pnpm db:seed
```
O script criará automaticamente:
- A organização padrão **ALP Nexus Corp**
- O usuário master **`alan.pereira@alp-nexus.com`**
- O vínculo do perfil com a role **`Master`**
- Um fluxo de exemplo inicial com Webhook, Condição e E-mail.

### 4. Executar em Modo de Desenvolvimento
```bash
pnpm dev
```
- **Frontend (Canvas Visual)**: http://localhost:3000
- **Backend API**: http://localhost:4000
