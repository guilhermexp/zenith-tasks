# Design Document: Supabase to Neon Migration

## Overview

This design document details the technical architecture and implementation strategy for migrating the Zenith Tasks application from Supabase to Neon PostgreSQL. The migration will use Drizzle ORM for type-safe database operations while maintaining compatibility with the existing Clerk authentication system.

## Architecture Overview

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[React Components]
        B[useItems Hook]
    end
    
    subgraph "API Layer"
        C[Next.js API Routes]
        D[Clerk Middleware]
    end
    
    subgraph "Service Layer"
        E[ItemsService]
        F[Database Services]
    end
    
    subgraph "Data Layer"
        G[Drizzle ORM]
        H[Neon Connection Pool]
        I[Neon PostgreSQL]
    end
    
    A --> B
    B --> E
    C --> D
    D --> E
    E --> F
    E --> G
    F --> G
    G --> H
    H --> I
    
    style I fill:#00E599
    style G fill:#C5F467
    style E fill:#FFB86C
```

### Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Component
    participant useItems
    participant ItemsService
    participant Drizzle
    participant Neon
    
    User->>Component: Interacts with UI
    Component->>useItems: Fetch/Mutate Items
    useItems->>ItemsService: loadItems(userId)
    ItemsService->>Drizzle: select().from(mindFlowItems)
    Drizzle->>Neon: Execute SQL Query
    Neon-->>Drizzle: Return Rows
    Drizzle-->>ItemsService: Return Typed Data
    ItemsService-->>useItems: Return MindFlowItem[]
    useItems-->>Component: Update State
    Component-->>User: Render Updated UI
```

## Component Design

### 1. Database Connection Layer

**File:** `src/lib/db.ts`

**Purpose:** Establish and export a configured Neon database connection with Drizzle ORM.

**Implementation:**

```typescript
import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import * as schema from '@/db/schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const db = drizzle(pool, { schema })
```

**Key Decisions:**
- Use `@neondatabase/serverless` for Neon connection
- Use connection pooling for performance
- Fail fast if DATABASE_URL is missing
- Export single db instance for application-wide use

---

### 2. Database Schema Layer

**File:** `src/db/schema.ts`

**Purpose:** Define type-safe table schemas using Drizzle ORM that match the database migrations.

**Implementation:**

```typescript
import { pgTable, text, boolean, timestamp, jsonb, numeric, integer, varchar } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const mindFlowItems = pgTable('mind_flow_items', {
  id: text('id').primaryKey().default('gen_random_uuid()'),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: text('title').notNull(),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  summary: text('summary'),
  itemType: text('item_type').notNull(),
  dueDate: text('due_date'),
  dueDateIso: text('due_date_iso'),
  suggestions: text('suggestions').array(),
  isGeneratingSubtasks: boolean('is_generating_subtasks').default(false),
  transactionType: text('transaction_type'),
  amount: numeric('amount'),
  isRecurring: boolean('is_recurring').default(false),
  paymentMethod: text('payment_method'),
  isPaid: boolean('is_paid').default(false),
  chatHistory: jsonb('chat_history').default([]),
  meetingDetails: jsonb('meeting_details'),
  transcript: jsonb('transcript').default([]),
  notes: text('notes')
})

export const subtasks = pgTable('subtasks', {
  id: text('id').primaryKey().default('gen_random_uuid()'),
  parentItemId: text('parent_item_id').notNull().references(() => mindFlowItems.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  position: integer('position').notNull()
})

export const mcpServerConfigs = pgTable('mcp_server_configs', {
  id: text('id').primaryKey().default('gen_random_uuid()'),
  userId: varchar('user_id', { length: 255 }).notNull(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  apiKey: text('api_key'),
  headersJson: text('headers_json').notNull(),
  toolsPath: text('tools_path').notNull(),
  callPath: text('call_path').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const mindFlowItemsRelations = relations(mindFlowItems, ({ many }) => ({
  subtasks: many(subtasks)
}))

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  parentItem: one(mindFlowItems, {
    fields: [subtasks.parentItemId],
    references: [mindFlowItems.id]
  })
}))

export type MindFlowItem = typeof mindFlowItems.$inferSelect
export type NewMindFlowItem = typeof mindFlowItems.$inferInsert
export type Subtask = typeof subtasks.$inferSelect
export type NewSubtask = typeof subtasks.$inferInsert
export type McpServerConfig = typeof mcpServerConfigs.$inferSelect
export type NewMcpServerConfig = typeof mcpServerConfigs.$inferInsert
```

**Key Decisions:**
- Use `text` for IDs with UUID default
- Use `varchar(255)` for user_id to match Clerk format
- Use `jsonb` for complex data (chat_history, meeting_details)
- Define relations for type-safe joins
- Export infer types for TypeScript usage
- CASCADE delete on foreign keys

---

### 3. Database Migrations

**Directory:** `drizzle/migrations/`

**Migration Files:**

1. `0000_create_mind_flow_items.sql`
2. `0001_create_subtasks.sql`
3. `0002_create_mcp_server_configs.sql`
4. `0003_add_indexes.sql`

**Migration 1: mind_flow_items table**

```sql
CREATE TABLE IF NOT EXISTS mind_flow_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  summary TEXT,
  item_type TEXT NOT NULL,
  due_date TEXT,
  due_date_iso TEXT,
  suggestions TEXT[],
  is_generating_subtasks BOOLEAN DEFAULT false,
  transaction_type TEXT,
  amount NUMERIC,
  is_recurring BOOLEAN DEFAULT false,
  payment_method TEXT,
  is_paid BOOLEAN DEFAULT false,
  chat_history JSONB DEFAULT '[]'::jsonb,
  meeting_details JSONB,
  transcript JSONB DEFAULT '[]'::jsonb,
  notes TEXT
);
```

**Migration 2: subtasks table**

```sql
CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_item_id TEXT NOT NULL REFERENCES mind_flow_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  position INTEGER NOT NULL
);
```

**Migration 3: mcp_server_configs table**

```sql
CREATE TABLE IF NOT EXISTS mcp_server_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT,
  headers_json TEXT NOT NULL,
  tools_path TEXT NOT NULL,
  call_path TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Migration 4: indexes**

```sql
CREATE INDEX IF NOT EXISTS idx_mind_flow_items_user_id ON mind_flow_items(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_flow_items_created_at ON mind_flow_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mind_flow_items_item_type ON mind_flow_items(item_type);
CREATE INDEX IF NOT EXISTS idx_subtasks_parent_item_id ON subtasks(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_mcp_server_configs_user_id ON mcp_server_configs(user_id);
```

**Key Decisions:**
- Use TEXT for IDs instead of UUID type for flexibility
- Use gen_random_uuid() for automatic ID generation
- Create indexes on frequently queried columns
- Use CASCADE for subtask deletion

---

### 4. Drizzle Configuration

**File:** `drizzle.config.ts`

**Purpose:** Configure Drizzle Kit for migrations and introspection.

**Implementation:**

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!
  },
  verbose: true,
  strict: true
} satisfies Config
```

---

### 5. ItemsService Refactor

**File:** `src/services/database/items.ts`

**Purpose:** Refactor all database operations to use Drizzle ORM instead of Supabase.

**Key Changes:**

**Before (Supabase):**
```typescript
const { data, error } = await supabase!
  .from('mind_flow_items')
  .select('*, subtasks (*)')
  .eq('user_id', userId)
```

**After (Drizzle):**
```typescript
const items = await db.query.mindFlowItems.findMany({
  where: eq(mindFlowItems.userId, userId),
  with: {
    subtasks: true
  },
  orderBy: [desc(mindFlowItems.createdAt)]
})
```

**Implementation Strategy:**

1. **loadItems:** Use `db.query.mindFlowItems.findMany()` with relations
2. **createItem:** Use `db.insert(mindFlowItems).values().returning()`
3. **updateItem:** Use `db.update(mindFlowItems).set().where()`
4. **deleteItem:** Use `db.delete(mindFlowItems).where()`
5. **toggleItem:** Combine select + update in transaction
6. **clearCompleted:** Use `db.delete().where(and(...))`

**Error Handling:**
- Wrap all operations in try/catch
- Map Drizzle errors to consistent format
- Maintain existing logger integration
- Preserve network error detection

---

### 6. Hook Migration

**File:** `src/hooks/useItems.ts` (renamed from `useSupabaseItems.ts`)

**Changes:**
1. Rename file from `useSupabaseItems.ts` to `useItems.ts`
2. Update import statement for ItemsService
3. Remove Supabase-specific references in comments
4. Export `useItems` instead of `useSupabaseItems`

**No logic changes needed** - the hook already abstracts database implementation.

---

### 7. Component Updates

**Files to Update:**
- `src/components/App.tsx`

**Changes:**
```typescript
// Before
import { useSupabaseItems } from "../hooks/useSupabaseItems"

// After
import { useItems } from "../hooks/useItems"

// Usage
const { items, ... } = useItems()
```

---

### 8. API Routes Migration

**File:** `src/app/api/debug/health/route.ts`

**Before:**
```typescript
const supabase = createClient(url, key)
const { data, error } = await supabase.from('mind_flow_items').select('count')
```

**After:**
```typescript
import { db } from '@/lib/db'
import { mindFlowItems } from '@/db/schema'
import { sql } from 'drizzle-orm'

const result = await db.select({ count: sql<number>`count(*)` })
  .from(mindFlowItems)
```

**File:** `src/app/api/inbox/analyze/route.ts`

Update to use ItemsService instead of direct Supabase calls.

---

### 9. Additional Services Migration

**Files:**
- `src/services/database/data-validator.ts`
- `src/services/database/performance-monitor.ts`
- `src/services/database/maintenance-scheduler.ts`

**Strategy:**

For each service, evaluate if it's still needed:

1. **data-validator.ts:** If it validates Supabase-specific features, remove it
2. **performance-monitor.ts:** If it monitors Supabase metrics, remove it
3. **maintenance-scheduler.ts:** If it schedules Supabase maintenance, remove it

If the service provides value independent of database choice, refactor to use Drizzle.

---

## Data Models

### Type Mapping: Supabase → Drizzle

| Supabase Type | Drizzle Type | Notes |
|---------------|--------------|-------|
| `uuid` | `text().default('gen_random_uuid()')` | More flexible |
| `varchar` | `varchar(length)` | Direct mapping |
| `text` | `text()` | Direct mapping |
| `boolean` | `boolean()` | Direct mapping |
| `timestamp` | `timestamp()` | Direct mapping |
| `jsonb` | `jsonb()` | Direct mapping |
| `numeric` | `numeric()` | For monetary values |
| `integer` | `integer()` | Direct mapping |
| `text[]` | `text().array()` | Array support |

### Application Type Updates

**File:** `src/types/index.ts`

**Current Issue:** Types are defined separately from schema.

**Solution:** Keep application types but ensure they align with Drizzle inferred types.

```typescript
// Keep existing types for application use
export type MindFlowItemType = 'Tarefa' | 'Ideia' | 'Nota' | 'Lembrete' | 'Financeiro'

// Import Drizzle types for database layer
export type { MindFlowItem, Subtask } from '@/db/schema'

// OR maintain separate types with mapping logic in ItemsService
```

**Decision:** Maintain separate application types and map in service layer for flexibility.

---

## Security Considerations

### 1. Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Clerk
    participant Middleware
    participant API
    participant Database
    
    User->>Clerk: Sign In
    Clerk-->>User: Session Token
    User->>API: Request with Token
    API->>Middleware: Validate Token
    Middleware->>Clerk: Verify Session
    Clerk-->>Middleware: User ID
    Middleware->>API: Authenticated Request
    API->>Database: Query with User ID filter
    Database-->>API: User's Data Only
    API-->>User: Response
```

### 2. Data Isolation

- All queries MUST filter by `user_id`
- Use Clerk user ID from authenticated session
- Never trust client-provided user IDs
- Implement row-level security at application layer

### 3. Connection Security

- Use SSL for Neon connections (enabled by default)
- Store DATABASE_URL in environment variables
- Never commit connection strings to git
- Use Vercel secrets for production deployment

### 4. SQL Injection Prevention

- Drizzle ORM automatically parameterizes queries
- Never concatenate user input into SQL
- Use Drizzle's query builder exclusively

---

## Testing Strategy

### Unit Tests

**Test Files to Create:**
- `src/services/database/__tests__/items.test.ts`
- `src/hooks/__tests__/useItems.test.ts`

**Testing Approach:**
1. Mock Drizzle db instance
2. Test each ItemsService method
3. Verify correct SQL generation
4. Test error handling paths
5. Test Clerk user ID integration

### Integration Tests

**Test Scenarios:**
1. Create item → Verify in database
2. Update item → Verify changes persisted
3. Delete item → Verify cascade to subtasks
4. Query with user_id filter → Verify isolation
5. Handle database connection errors

### End-to-End Tests

**Critical Paths:**
1. User sign in → Load items → Display in UI
2. Create new task → Save to database → Refresh shows item
3. Toggle task completion → Update persists
4. Delete task → Item removed from UI and database
5. Manage subtasks → Subtasks CRUD operations work

---

## Deployment Strategy

### Phase 1: Preparation

1. Set up Neon project and obtain connection string
2. Run migrations on Neon database
3. Configure environment variables in Vercel
4. Test connection to Neon from local environment

### Phase 2: Code Migration

1. Install new dependencies (drizzle-orm, @neondatabase/serverless)
2. Remove Supabase dependencies
3. Implement database schema and migrations
4. Refactor ItemsService
5. Update hooks and components
6. Update API routes

### Phase 3: Testing

1. Run TypeScript type checking
2. Execute unit tests
3. Perform manual testing of all features
4. Verify no Supabase references remain

### Phase 4: Deployment

1. Deploy to Vercel preview environment
2. Smoke test all features
3. Deploy to production
4. Monitor for errors

---

## Migration Checklist

### Dependencies

- [ ] Install `drizzle-orm`
- [ ] Install `@neondatabase/serverless`
- [ ] Install `drizzle-kit` (dev dependency)
- [ ] Uninstall `@supabase/supabase-js`
- [ ] Uninstall `@supabase/auth-helpers-nextjs`

### Configuration

- [ ] Create `drizzle.config.ts`
- [ ] Create `src/lib/db.ts`
- [ ] Create `src/db/schema.ts`
- [ ] Update `.env.example` with DATABASE_URL
- [ ] Update `vercel.json` environment variables
- [ ] Add `DATABASE_URL` to Vercel secrets

### Migrations

- [ ] Create migration for mind_flow_items
- [ ] Create migration for subtasks
- [ ] Create migration for mcp_server_configs
- [ ] Create migration for indexes
- [ ] Run migrations on Neon database

### Code Changes

- [ ] Refactor `src/services/database/items.ts`
- [ ] Rename `src/hooks/useSupabaseItems.ts` to `useItems.ts`
- [ ] Update `src/components/App.tsx` imports
- [ ] Update `src/app/api/debug/health/route.ts`
- [ ] Update `src/app/api/inbox/analyze/route.ts`
- [ ] Review and update/remove `data-validator.ts`
- [ ] Review and update/remove `performance-monitor.ts`
- [ ] Review and update/remove `maintenance-scheduler.ts`
- [ ] Delete `src/lib/supabase.ts`

### Verification

- [ ] No imports from `@supabase` packages
- [ ] No references to `createClient` from Supabase
- [ ] TypeScript compiles without errors
- [ ] All pages load without errors
- [ ] Items CRUD operations work
- [ ] Subtasks operations work
- [ ] User isolation verified
- [ ] No console errors related to Supabase

---

## Environment Variables

### Required Variables

```bash
# Neon Database
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"

# Clerk Authentication (existing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
CLERK_SECRET_KEY="sk_test_xxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"

# AI Services (existing)
OPENAI_API_KEY="sk-xxx"
ANTHROPIC_API_KEY="sk-ant-xxx"
GOOGLE_GENERATIVE_AI_API_KEY="xxx"
```

### Removed Variables

```bash
# Remove these from Vercel and .env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Package.json Scripts

Add migration scripts:

```json
{
  "scripts": {
    "dev": "next dev -p 3457",
    "build": "next build",
    "start": "next start -p 3456",
    "lint": "next lint",
    "lint:ci": "next lint --max-warnings=0",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## Risk Mitigation

### Risk 1: Data Loss

**Mitigation:**
- This migration does NOT handle data transfer
- Existing Supabase data remains untouched
- Data migration is a separate, careful process

### Risk 2: Type Mismatches

**Mitigation:**
- Use Drizzle's type inference
- Maintain TypeScript strict mode
- Add comprehensive type tests

### Risk 3: Performance Degradation

**Mitigation:**
- Add proper indexes (included in migrations)
- Use connection pooling
- Monitor query performance

### Risk 4: Authentication Issues

**Mitigation:**
- Clerk integration remains unchanged
- Test user ID propagation thoroughly
- Verify data isolation in all queries

---

## Success Metrics

1. Zero Supabase imports in codebase
2. All TypeScript compilation succeeds
3. All pages load without errors
4. All CRUD operations work correctly
5. User data isolation verified
6. No performance degradation
7. Deployment succeeds on Vercel