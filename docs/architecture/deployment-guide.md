# Guia de Deployment - Zenith Tasks

## 🚀 Overview

Este documento descreve o processo de deployment do Zenith Tasks para produção.

---

## 📋 Pré-requisitos

### Contas e Serviços Necessários

- [ ] Conta Vercel (para hosting)
- [ ] Projeto Supabase (para banco de dados)
- [ ] API Key do Google Gemini (para IA)
- [ ] Conta Clerk (para autenticação)
- [ ] (Opcional) Upstash Redis (para MCP registry)

### Ferramentas Locais

```bash
node >= 18.0.0
npm >= 9.0.0
git >= 2.0.0
vercel CLI (opcional): npm i -g vercel
```

---

## 🔧 Configuração de Ambiente

### 1. Supabase Setup

#### Criar Projeto

1. Acesse [supabase.com](https://supabase.com)
2. Crie novo projeto
3. Aguarde provisioning (~2 minutos)
4. Copie as credenciais:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

#### Criar Tabelas

Execute as migrations em `supabase/migrations/`:

```sql
-- Criar tabela principal
CREATE TABLE mind_flow_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  item_type TEXT NOT NULL CHECK (item_type IN ('Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião')),
  summary TEXT,
  due_date TEXT,
  due_date_iso TEXT,
  suggestions TEXT[],
  is_generating_subtasks BOOLEAN DEFAULT FALSE,
  transaction_type TEXT CHECK (transaction_type IN ('Entrada', 'Saída')),
  amount NUMERIC,
  is_recurring BOOLEAN DEFAULT FALSE,
  payment_method TEXT,
  is_paid BOOLEAN DEFAULT FALSE,
  chat_history JSONB DEFAULT '[]',
  meeting_details JSONB,
  transcript JSONB[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_user_items ON mind_flow_items(user_id);
CREATE INDEX idx_item_type ON mind_flow_items(item_type);
CREATE INDEX idx_due_date ON mind_flow_items(due_date_iso);
CREATE INDEX idx_completed ON mind_flow_items(completed);

-- Criar tabela de subtarefas
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_item_id UUID NOT NULL REFERENCES mind_flow_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  position INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subtask_parent ON subtasks(parent_item_id);

-- Criar tabela de MCP servers
CREATE TABLE mcp_server_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT,
  headers_json TEXT DEFAULT '{}',
  tools_path TEXT DEFAULT '/tools',
  call_path TEXT DEFAULT '/call',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcp_user ON mcp_server_configs(user_id);
```

#### Configurar RLS (Row-Level Security)

```sql
-- Habilitar RLS
ALTER TABLE mind_flow_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_configs ENABLE ROW LEVEL SECURITY;

-- Políticas para mind_flow_items
CREATE POLICY "Users can view own items" ON mind_flow_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items" ON mind_flow_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items" ON mind_flow_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items" ON mind_flow_items
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para subtasks
CREATE POLICY "Users can view own subtasks" ON subtasks
  FOR SELECT USING (
    parent_item_id IN (
      SELECT id FROM mind_flow_items WHERE user_id = auth.uid()
    )
  );

-- ... (adicionar policies para INSERT, UPDATE, DELETE)
```

### 2. Clerk Setup

#### Criar Aplicação

1. Acesse [clerk.com](https://clerk.com)
2. Crie nova aplicação
3. Configure sign-in methods (email, Google, etc)
4. Copie as chaves:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

#### Configurar Webhook (para Supabase sync)

```javascript
// src/app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  const body = await req.text()

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    })
  } catch (err) {
    return new Response('Webhook verification failed', { status: 400 })
  }

  const { type, data } = evt

  // Sincronizar usuário com Supabase
  if (type === 'user.created') {
    await supabase.from('users').insert({
      clerk_user_id: data.id,
      email: data.email_addresses[0]?.email_address,
      created_at: new Date(data.created_at)
    })
  }

  return new Response('OK', { status: 200 })
}
```

### 3. Google Gemini API

1. Acesse [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Crie API key
3. Copie `GEMINI_API_KEY`

### 4. Variáveis de Ambiente

Crie `.env.production`:

```bash
# ============================================
# AI CONFIGURATION
# ============================================
AI_SDK_PROVIDER=google
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-2.5-flash

# ============================================
# CLERK AUTHENTICATION
# ============================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# ============================================
# SUPABASE
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# ============================================
# OPTIONAL
# ============================================
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYxxx...

# ============================================
# PRODUCTION SETTINGS
# ============================================
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://zenith-tasks.vercel.app
NEXT_TELEMETRY_DISABLED=1
```

---

## 🚢 Deploy para Vercel

### Opção 1: Deploy via GitHub (Recomendado)

1. **Push para GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/seu-usuario/zenith-tasks.git
git push -u origin main
```

2. **Conectar no Vercel**

- Acesse [vercel.com/new](https://vercel.com/new)
- Import repository
- Configure environment variables
- Deploy!

3. **Configurar Build Settings** (opcional)

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "framework": "nextjs",
  "installCommand": "npm install"
}
```

### Opção 2: Deploy via CLI

```bash
# Instalar CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Adicionar env vars
vercel env add GEMINI_API_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# ... (adicionar todas as outras)
```

---

## 🔍 Verificação Pós-Deploy

### Checklist de Saúde

```bash
# 1. App carrega?
curl https://seu-app.vercel.app

# 2. API responde?
curl https://seu-app.vercel.app/api/models

# 3. Supabase conecta?
curl https://seu-app.vercel.app/api/debug/health

# 4. IA funciona?
curl -X POST https://seu-app.vercel.app/api/inbox/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "comprar leite"}'
```

### Dashboard de Monitoramento

Acessar no Vercel Dashboard:

- **Deployments**: Histórico de deploys
- **Analytics**: Pageviews, performance
- **Logs**: Runtime logs (Function logs, Edge logs)
- **Speed Insights**: Core Web Vitals

---

## 🔒 Segurança Pós-Deploy

### 1. Remover Bypass de Auth

```typescript
// src/middleware.ts
// ANTES (dev):
export function middleware(request: NextRequest) {
  return NextResponse.next() // BYPASS ATIVO
}

// DEPOIS (prod):
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})
```

### 2. Configurar Rate Limiting

```typescript
// src/server/rateLimit.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
})

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier)

  if (!success) {
    throw new Error("Rate limit exceeded")
  }

  return { success, limit, reset, remaining }
}
```

### 3. Habilitar CORS

```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Apenas para APIs públicas
  if (request.nextUrl.pathname.startsWith('/api/public')) {
    response.headers.set('Access-Control-Allow-Origin', 'https://seu-dominio.com')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST')
  }

  return response
}
```

---

## 📊 Monitoramento

### 1. Setup Sentry (Error Tracking)

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

```javascript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

### 2. Logs Estruturados

```typescript
// src/utils/logger.ts
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
})

export default logger
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 📈 Scaling Considerations

### Database Scaling

```yaml
Supabase Auto-scaling:
  - Connections: Pooling automático (até 15 simultâneas no free tier)
  - Storage: Cresce automaticamente
  - Backups: Diários automáticos

Quando escalar?
  - Database size > 8 GB: Migrar para plano Pro ($25/mês)
  - Realtime connections > 100: Otimizar queries
  - API requests > 50k/dia: Considerar cache Redis
```

### Function Scaling

```yaml
Vercel Limits:
  Free:
    - Executions: 100 GB-Hrs/month
    - Duration: 10s timeout
    - Memory: 1024 MB

  Pro:
    - Executions: 1000 GB-Hrs/month
    - Duration: 60s timeout
    - Memory: 3008 MB
```

---

## 🆘 Troubleshooting

### App não carrega

```bash
# 1. Verificar build
vercel logs --prod

# 2. Verificar env vars
vercel env ls

# 3. Verificar DNS
dig seu-app.vercel.app
```

### Erros de IA

```bash
# Verificar API key
curl https://seu-app.vercel.app/api/debug/providers

# Verificar rate limits
curl -v https://seu-app.vercel.app/api/models
```

### Supabase não conecta

```bash
# Testar conexão direta
curl https://seu-project.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"

# Verificar RLS
# Logar no Supabase Dashboard > Authentication > Policies
```

---

## 📚 Referências

- [Vercel Deployment Docs](https://vercel.com/docs)
- [Next.js Production Checklist](https://nextjs.org/docs/deployment)
- [Supabase Production Best Practices](https://supabase.com/docs/guides/platform/going-to-prod)
- [Clerk Production Checklist](https://clerk.com/docs/deployments/production-checklist)

---

**Última atualização**: Janeiro 2025
