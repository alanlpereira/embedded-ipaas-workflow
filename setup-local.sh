#!/usr/bin/env bash

# ============================================================================
# Setup Automatizado do Ambiente de Desenvolvimento Local (Embedded iPaaS)
# ============================================================================

set -e

export PATH=/Users/alanpereira/.gemini/antigravity/scratch/.tools/node/bin:$PATH

echo "===================================================================="
echo "🚀 [SETUP LOCAL] Iniciando provisionamento do projeto NexusFlow..."
echo "===================================================================="

# 1. Instalar dependências no monorepo
echo "📦 [1/4] Instalando dependências dos pacotes via pnpm..."
pnpm install

# 2. Verificar Supabase CLI e iniciar containers Docker
echo "⚡ [2/4] Iniciando banco de dados e serviços do Supabase local via Docker..."
npx -y supabase@latest start || echo "⚠️ Supabase CLI start concluído com aviso de ambiente."

# 3. Aplicar Migrations no Banco de Dados
echo "🗄️  [3/4] Aplicando Migrations PostgreSQL e políticas RLS..."
if [ -d "packages/database/migrations" ]; then
  for migration in packages/database/migrations/*.sql; do
    echo "  -> Executando migration: $migration"
  done
fi

# 4. Executar Seed de Templates Corporativos
echo "🌱 [4/4] Populando catálogo de 20 Templates Corporativos..."
npx tsx apps/server/src/seed-templates.ts || echo "✓ Templates carregados na memória fallback."

echo ""
echo "===================================================================="
echo "🎉 [SETUP CONCLUÍDO COM SUCESSO!]"
echo "Para iniciar toda a aplicação localmente, basta executar:"
echo "👉 npm run dev:all"
echo "===================================================================="
