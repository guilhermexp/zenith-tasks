# ADR-002: Supabase como Backend-as-a-Service

## Status

✅ **Aceito** - Janeiro 2025

## Contexto

Precisávamos de uma solução de backend que fornecesse:

- Banco de dados relacional escalável
- API REST automática
- Realtime subscriptions (para sync de dados)
- Autenticação e autorização (Row-Level Security)
- Migrations e backups automáticos
- Hosted solution (não queremos gerenciar infra)

### Alternativas Consideradas

| Solução | Prós | Contras |
|---------|------|---------|
| **Supabase** | Postgres, realtime, RLS, API gerada, auth integrada | Vendor lock-in, custos escalam com uso |
| Firebase | Realtime DB, auth, fácil setup | NoSQL (menos adequado), vendor lock-in forte |
| PostgreSQL + Prisma | Controle total, typesafe | Precisa configurar infra, realtime manual |
| MongoDB Atlas | NoSQL flexível, search integrado | Menos adequado para dados relacionais |
| Hasura | GraphQL automático, performance | Complexidade de configuração, overkill |

## Decisão

**Escolhemos Supabase** pelos seguintes motivos:

1. **PostgreSQL Nativo**
   - Banco relacional robusto e testado
   - Suporte a JSON/JSONB para flexibilidade
   - Queries complexas, joins, transactions

2. **API REST Gerada Automaticamente**
   - PostgREST gera endpoints baseados no schema
   - Reduz boilerplate de backend
   - Suporte a filtros, ordenação, paginação

3. **Realtime Subscriptions**
   - WebSocket connections para updates em tempo real
   - Essencial para colaboração e sync
   - Fácil de configurar (`.on('INSERT', callback)`)

4. **Row-Level Security (RLS)**
   - Segurança a nível de banco
   - Políticas SQL expressivas
   - Reduz lógica de auth no app

5. **Migrations e Backups**
   - Migrations como código (SQL)
   - Backups automáticos diários
   - Point-in-time recovery

6. **Ecosystem e DX**
   - Client libraries oficiais (JS, Python, etc)
   - Dashboard web intuitivo
   - CLI poderoso (`supabase` CLI)

## Consequências

### Positivas ✅

- ✅ **Produtividade**: API pronta em minutos, sem backend custom
- ✅ **Performance**: Postgres é rápido, conexões pooled
- ✅ **Escalabilidade**: Auto-scaling de connections e compute
- ✅ **Segurança**: RLS garante isolamento de dados
- ✅ **Realtime**: WebSocket subscriptions funcionam out-of-the-box
- ✅ **Observabilidade**: Logs, metrics, query analyzer no dashboard

### Negativas ⚠️

- ⚠️ **Vendor lock-in**: Migrar para outro provider dá trabalho
- ⚠️ **Custos**: Free tier generoso, mas cresce com tráfego
- ⚠️ **Latência**: Servidor hospedado pode ter latência geográfica
- ⚠️ **Limitações**: Algumas features avançadas de Postgres não expostas

### Riscos Mitigados

| Risco | Mitigação |
|-------|-----------|
| Downtime do Supabase | Fallback para localStorage, retry logic |
| Custos inesperados | Monitoring de uso, alertas, query optimization |
| Vendor lock-in | Uso de abstrações (`ItemsService`), migrations versionadas |
| Segurança | RLS policies rigorosas, input validation, rate limiting |

## Implementação

### Schema Principal

```sql
-- Tabela de itens
CREATE TABLE mind_flow_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  item_type TEXT NOT NULL,
  summary TEXT,
  due_date TEXT,
  chat_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_user_items ON mind_flow_items(user_id);
CREATE INDEX idx_item_type ON mind_flow_items(item_type);
CREATE INDEX idx_due_date ON mind_flow_items(due_date_iso);

-- RLS Policies (a ser implementado em produção)
ALTER TABLE mind_flow_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see only their items"
ON mind_flow_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert only their items"
ON mind_flow_items FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### Cliente Supabase

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
export const isSupabaseConfigured = !!supabase
```

### Abstração de Serviço

```typescript
// src/services/database/items.ts
export class ItemsService {
  static async loadItems(userId: string): Promise<MindFlowItem[]> {
    const { data, error } = await supabase
      .from('mind_flow_items')
      .select('*, subtasks(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data.map(mapToMindFlowItem)
  }

  static async createItem(userId: string, item: Partial<MindFlowItem>) {
    // ... implementation
  }

  // ... outros métodos
}
```

### Fallback para localStorage

```typescript
// Em caso de falha do Supabase
if (error) {
  console.warn('Supabase error, falling back to localStorage')
  const cached = localStorage.getItem('zenith-tasks-items')
  return cached ? JSON.parse(cached) : []
}
```

## Monitoramento

### Métricas a Observar

- **API Requests**: Quantas queries por hora/dia
- **Realtime Connections**: Número de websockets ativos
- **Database Size**: Crescimento do banco
- **Query Performance**: Queries lentas (> 100ms)
- **Error Rate**: % de requests com erro

### Alertas Configurados

```yaml
Alertas:
  - Database usage > 80%
  - Query response time > 200ms (P95)
  - Error rate > 5%
  - Realtime connections > 1000
```

## Custos Estimados

### Free Tier (Atual)

```
✅ 500 MB database
✅ 1 GB file storage
✅ 2 GB bandwidth
✅ 50,000 monthly active users
✅ Realtime connections
```

### Projeção de Custos (1000 usuários)

```
Database: $15/mês (2 GB)
Bandwidth: $5/mês (5 GB)
Realtime: $0 (incluído)
Total: ~$20/mês
```

## Referências

- [Supabase Documentation](https://supabase.com/docs)
- [PostgREST API](https://postgrest.org/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)

---

**Data**: Janeiro 2025
**Autor**: Guilherme Varela
**Revisores**: -
