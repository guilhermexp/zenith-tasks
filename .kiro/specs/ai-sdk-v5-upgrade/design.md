# Design Document

## Overview

Este documento descreve o design para modernizar a implementação do Vercel AI SDK no Zenith Tasks, migrando para as melhores práticas do v5 e implementando funcionalidades avançadas como tools, MCP, streaming otimizado e structured output.

## Architecture

### Problemas Identificados na Implementação Atual

1. **AIProvider Simples**: Função básica sem cache, configurações limitadas
2. **Sem Tools Estruturados**: Não usa o sistema de tools do AI SDK v5
3. **Streaming Básico**: Sem eventos granulares ou callbacks avançados
4. **Structured Output Limitado**: Schemas simples, sem fallbacks robustos
5. **Sem MCP Integration**: Não aproveita Model Context Protocol
6. **Tratamento de Erro Básico**: Sem retry, backoff ou categorização
7. **Sem Persistência**: Conversas não são salvas
8. **Segurança Limitada**: Validação básica de inputs

### Nova Arquitetura Proposta

```
src/
├── server/
│   ├── ai/
│   │   ├── provider.ts           # AIProvider singleton com cache
│   │   ├── models.ts             # Configurações de modelos
│   │   ├── tools/                # Definições de ferramentas
│   │   │   ├── index.ts
│   │   │   ├── task-tools.ts
│   │   │   ├── analysis-tools.ts
│   │   │   └── mcp-tools.ts
│   │   ├── schemas.ts            # Schemas Zod complexos
│   │   ├── security.ts           # Validação e sanitização
│   │   └── error-handler.ts      # Tratamento robusto de erros
│   ├── mcp/
│   │   ├── manager.ts            # Gerenciador de conexões MCP
│   │   ├── registry.ts           # Registro de servidores
│   │   └── transports.ts         # Diferentes tipos de transporte
│   └── storage/
│       ├── conversation.ts       # Persistência de conversas
│       ├── cache.ts              # Cache inteligente
│       └── analytics.ts          # Métricas e analytics
├── services/
│   └── ai/
│       ├── assistant.ts          # Lógica principal do assistente
│       ├── streaming.ts          # Gerenciamento de streaming
│       └── structured.ts         # Structured output avançado
└── app/api/
    ├── assistant/
    │   ├── route.ts              # Endpoint principal melhorado
    │   ├── chat/route.ts         # Chat com streaming v5
    │   ├── tools/route.ts        # Execução de ferramentas
    │   └── analyze/route.ts      # Análise estruturada
    └── mcp/
        └── [serverId]/
            ├── connect/route.ts
            ├── tools/route.ts
            └── call/route.ts
```

## Components and Interfaces

### 1. AIProvider Melhorado

```typescript
interface AIProviderConfig {
  provider: 'google' | 'openrouter' | 'anthropic' | 'openai';
  model?: string;
  apiKey?: string;
  baseURL?: string;
  structuredOutputs?: boolean;
  temperature?: number;
  maxTokens?: number;
}

class AIProvider {
  private static instance: AIProvider;
  private models: Map<string, LanguageModel>;
  private configs: Map<string, AIProviderConfig>;
  
  static getInstance(): AIProvider;
  async getModel(config?: Partial<AIProviderConfig>): Promise<LanguageModel>;
  private async createModel(provider: string, config?: Partial<AIProviderConfig>): Promise<LanguageModel>;
  clearCache(): void;
}
```

### 2. Sistema de Tools Estruturado

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  outputSchema?: ZodSchema;
  execute: (input: any) => Promise<any>;
  onInputStart?: (data: any) => void;
  onInputDelta?: (data: any) => void;
  onInputAvailable?: (data: any) => void;
}

interface ToolRegistry {
  registerTool(tool: ToolDefinition): void;
  getTool(name: string): ToolDefinition | undefined;
  getAllTools(): Record<string, any>;
  getToolsByCategory(category: string): Record<string, any>;
}
```

### 3. MCP Manager

```typescript
interface MCPServerConfig {
  id: string;
  name: string;
  type: 'stdio' | 'sse' | 'http';
  url?: string;
  command?: string;
  args?: string[];
  apiKey?: string;
  headers?: Record<string, string>;
}

class MCPManager {
  private clients: Map<string, MCPClient>;
  private toolSets: Map<string, any>;
  
  async connectServer(config: MCPServerConfig): Promise<MCPClient>;
  async disconnectServer(serverId: string): Promise<void>;
  async getAllTools(): Promise<Record<string, any>>;
  async disconnectAll(): Promise<void>;
}
```

### 4. Streaming Avançado

```typescript
interface StreamingConfig {
  includeToolCallStreaming: boolean;
  includeRawResponses: boolean;
  includeUsage: boolean;
  onToolCall?: (data: any) => void;
  onStepFinish?: (data: any) => void;
  onFinish?: (data: any) => void;
  onError?: (error: any) => void;
}

interface StreamingManager {
  createStream(config: StreamingConfig): Promise<ReadableStream>;
  handleToolExecution(toolCall: any): Promise<any>;
  emitEvent(type: string, data: any): void;
}
```

### 5. Structured Output Avançado

```typescript
interface StructuredOutputConfig {
  schema: ZodSchema;
  schemaName?: string;
  schemaDescription?: string;
  maxRetries?: number;
  fallbackToText?: boolean;
  onValidationError?: (error: any) => void;
}

interface StructuredOutputManager {
  generate<T>(prompt: string, config: StructuredOutputConfig): Promise<T>;
  stream<T>(prompt: string, config: StructuredOutputConfig): Promise<AsyncIterable<Partial<T>>>;
  validateOutput<T>(output: any, schema: ZodSchema): T;
}
```

## Data Models

### Configurações de Modelo

```typescript
interface ModelSettings {
  temperature: number;
  maxTokens: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
}

const modelSettings: Record<string, ModelSettings> = {
  'task-planning': {
    temperature: 0.3,
    maxTokens: 2000,
    topP: 0.9,
  },
  'creative-writing': {
    temperature: 0.9,
    maxTokens: 4000,
    topP: 0.95,
  },
  'code-generation': {
    temperature: 0.2,
    maxTokens: 3000,
    topP: 0.85,
  }
};
```

### Schemas Complexos

```typescript
const schemas = {
  taskAnalysis: z.object({
    task: z.object({
      id: z.string(),
      title: z.string(),
      complexity: z.enum(['simple', 'moderate', 'complex']),
      estimatedHours: z.number().min(0.5).max(40),
      requiredSkills: z.array(z.string()),
      dependencies: z.array(z.string()).optional(),
    }),
    breakdown: z.array(z.object({
      subtitle: z.string(),
      description: z.string(),
      estimatedHours: z.number(),
      priority: z.number().min(1).max(10)
    })),
    recommendations: z.array(z.string()),
  }),
  
  assistantPlan: z.object({
    commands: z.array(z.object({
      action: z.string(),
      args: z.record(z.string(), z.unknown()).optional(),
      reasoning: z.string().optional()
    })),
    reply: z.string().optional(),
    confidence: z.number().min(0).max(1).optional()
  })
};
```

## Error Handling

### Categorização de Erros

```typescript
interface ErrorCategory {
  type: string;
  userMessage: string;
  shouldRetry: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

const errorCategories: Record<string, ErrorCategory> = {
  'rate_limit': {
    type: 'rate_limit',
    userMessage: 'Sistema sobrecarregado. Tentando novamente...',
    shouldRetry: true,
    retryDelay: 2000,
    maxRetries: 3
  },
  'timeout': {
    type: 'timeout',
    userMessage: 'Operação demorou muito. Tentando novamente...',
    shouldRetry: true,
    retryDelay: 1000,
    maxRetries: 2
  },
  'auth': {
    type: 'auth',
    userMessage: 'Erro de configuração. Contate o suporte.',
    shouldRetry: false
  }
};
```

### Retry com Backoff

```typescript
class ErrorHandler {
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delay?: number;
      backoff?: number;
      onError?: (error: any, attempt: number) => void;
    }
  ): Promise<T>;
  
  static categorizeError(error: any): ErrorCategory;
  static shouldRetry(error: any): boolean;
  static calculateDelay(attempt: number, baseDelay: number): number;
}
```

## Security

### Validação e Sanitização

```typescript
class SecurityManager {
  static sanitizeInput(input: string): string;
  static validateToolAccess(userId: string, toolName: string): boolean;
  static maskSensitiveData(data: any): any;
  static detectPromptInjection(prompt: string): boolean;
  static validateOutputSafety(output: any): boolean;
}
```

### Rate Limiting

```typescript
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
  onLimitReached?: (req: Request) => void;
}

class RateLimiter {
  private limits: Map<string, number[]>;
  
  checkLimit(key: string, config: RateLimitConfig): boolean;
  resetLimits(): void;
  getLimitStatus(key: string): { remaining: number; resetTime: number };
}
```

## Performance Considerations

### Cache Strategy

```typescript
interface CacheConfig {
  ttl: number;
  maxSize?: number;
  strategy: 'lru' | 'fifo' | 'ttl';
}

class SmartCache {
  private cache: Map<string, { data: any; expires: number }>;
  
  async get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T>;
  set(key: string, data: any, ttl?: number): void;
  invalidate(pattern?: string): void;
  getStats(): { hits: number; misses: number; size: number };
}
```

### Connection Pooling

```typescript
class ConnectionPool {
  private pools: Map<string, any[]>;
  private maxConnections: number;
  
  async getConnection(provider: string): Promise<any>;
  releaseConnection(provider: string, connection: any): void;
  closeAll(): Promise<void>;
}
```