# Design Document

## Overview

Este documento descreve o design para integrar o Vercel AI Gateway no Zenith Tasks, criando um sistema unificado de acesso a múltiplos provedores de IA com descoberta dinâmica de modelos, monitoramento de créditos e interface de gerenciamento.

## Architecture

### Arquitetura Proposta

```
src/
├── server/
│   ├── ai/
│   │   ├── gateway/
│   │   │   ├── provider.ts          # AI Gateway provider
│   │   │   ├── models.ts            # Descoberta e cache de modelos
│   │   │   ├── credits.ts           # Monitoramento de créditos
│   │   │   └── selector.ts          # Seleção inteligente de modelos
│   │   ├── providers/
│   │   │   ├── gateway.ts           # Gateway provider
│   │   │   ├── fallback.ts          # Fallback providers
│   │   │   └── registry.ts          # Registry unificado
│   │   └── provider.ts              # Provider principal (atualizado)
├── app/
│   └── api/
│       └── ai/
│           ├── models/route.ts      # API para listar modelos
│           ├── credits/route.ts     # API para créditos
│           └── switch/route.ts      # API para trocar modelos
└── components/
    └── ai/
        ├── ModelSelector.tsx       # Seletor de modelos
        ├── CreditMonitor.tsx       # Monitor de créditos
        └── ModelStats.tsx          # Estatísticas de uso
```

## Components and Interfaces

### 1. AI Gateway Provider

```typescript
interface GatewayConfig {
  apiKey?: string;
  baseURL?: string;
  useOIDC?: boolean;
  metadataCacheRefreshMillis?: number;
  fallbackProviders?: string[];
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
  pricing?: {
    input: number;
    output: number;
    cachedInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
  capabilities: string[];
  contextWindow: number;
  maxOutputTokens: number;
}

class GatewayProvider {
  private gateway: any;
  private modelsCache: Map<string, ModelInfo[]>;
  private lastRefresh: number;
  
  constructor(config: GatewayConfig);
  async getAvailableModels(): Promise<ModelInfo[]>;
  async getModel(modelId: string): Promise<LanguageModel>;
  async getCredits(): Promise<{ balance: number; total_used: number }>;
  async selectBestModel(context: string, requirements?: ModelRequirements): Promise<string>;
}
```

### 2. Model Selector

```typescript
interface ModelRequirements {
  maxCostPerToken?: number;
  minContextWindow?: number;
  requiredCapabilities?: string[];
  preferredProviders?: string[];
  excludeProviders?: string[];
}

interface ModelSelection {
  modelId: string;
  reason: string;
  estimatedCost: number;
  confidence: number;
}

class ModelSelector {
  private models: ModelInfo[];
  private usageStats: Map<string, ModelUsageStats>;
  
  async selectModel(
    context: string, 
    requirements?: ModelRequirements
  ): Promise<ModelSelection>;
  
  async rankModels(
    requirements: ModelRequirements
  ): Promise<Array<{ model: ModelInfo; score: number }>>;
  
  getRecommendations(context: string): ModelInfo[];
}
```

### 3. Credit Monitor

```typescript
interface CreditInfo {
  balance: number;
  total_used: number;
  daily_usage: number;
  monthly_usage: number;
  last_updated: string;
}

interface UsageAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  threshold: number;
  current: number;
  suggestions: string[];
}

class CreditMonitor {
  private creditInfo: CreditInfo | null;
  private alerts: UsageAlert[];
  
  async updateCredits(): Promise<CreditInfo>;
  checkAlerts(): UsageAlert[];
  getUsageProjection(days: number): number;
  suggestOptimizations(): string[];
}
```

### 4. Provider Registry

```typescript
interface ProviderInfo {
  id: string;
  name: string;
  type: 'gateway' | 'direct';
  available: boolean;
  models: string[];
  priority: number;
}

class ProviderRegistry {
  private providers: Map<string, ProviderInfo>;
  private fallbackChain: string[];
  
  registerProvider(provider: ProviderInfo): void;
  async getProvider(providerId: string): Promise<any>;
  async getModelProvider(modelId: string): Promise<any>;
  getFallbackChain(originalProvider: string): string[];
}
```

## Data Models

### Model Information

```typescript
interface ModelMetadata {
  id: string;
  name: string;
  provider: string;
  family: string;
  version: string;
  description: string;
  capabilities: {
    textGeneration: boolean;
    codeGeneration: boolean;
    reasoning: boolean;
    multimodal: boolean;
    functionCalling: boolean;
    structuredOutput: boolean;
  };
  limits: {
    contextWindow: number;
    maxOutputTokens: number;
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  pricing: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
    cacheCreationTokens?: number;
    currency: string;
  };
  performance: {
    averageLatency: number;
    throughput: number;
    reliability: number;
  };
}
```

### Usage Statistics

```typescript
interface ModelUsageStats {
  modelId: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  successRate: number;
  lastUsed: string;
  contexts: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
    satisfaction: number;
  }>;
}
```

### Configuration

```typescript
interface AIGatewayConfig {
  enabled: boolean;
  apiKey?: string;
  useOIDC: boolean;
  defaultModel: string;
  fallbackModels: string[];
  contextMappings: Record<string, {
    preferredModels: string[];
    requirements: ModelRequirements;
    maxCostPerRequest: number;
  }>;
  monitoring: {
    enableUsageTracking: boolean;
    alertThresholds: {
      dailySpend: number;
      monthlySpend: number;
      errorRate: number;
    };
  };
}
```

## Implementation Strategy

### Phase 1: Core Integration

1. **Install AI Gateway**: Configurar dependências e autenticação
2. **Basic Provider**: Implementar provider básico com descoberta de modelos
3. **Fallback System**: Sistema de fallback para providers existentes
4. **Testing**: Testes com modelos populares

### Phase 2: Model Management

1. **Model Discovery**: Cache inteligente de modelos disponíveis
2. **Selection Logic**: Algoritmo de seleção baseado em contexto
3. **Performance Tracking**: Métricas de performance por modelo
4. **Cost Optimization**: Recomendações de modelos econômicos

### Phase 3: User Interface

1. **Model Selector**: Interface para escolher modelos
2. **Credit Monitor**: Dashboard de créditos e uso
3. **Statistics**: Visualização de estatísticas de uso
4. **Configuration**: Interface para configurar preferências

### Phase 4: Advanced Features

1. **Auto-switching**: Troca automática baseada em performance
2. **Load Balancing**: Distribuição de carga entre modelos
3. **A/B Testing**: Comparação de modelos em produção
4. **Alerts**: Sistema de alertas para uso e custos

## Security Considerations

### Authentication

```typescript
interface AuthConfig {
  method: 'api_key' | 'oidc' | 'hybrid';
  apiKey?: string;
  oidcConfig?: {
    tokenRefreshInterval: number;
    fallbackToApiKey: boolean;
  };
}
```

### Access Control

```typescript
interface AccessControl {
  allowedModels: string[];
  blockedModels: string[];
  maxCostPerRequest: number;
  maxRequestsPerHour: number;
  allowedContexts: string[];
}
```

## Performance Optimizations

### Caching Strategy

```typescript
interface CacheConfig {
  modelMetadata: {
    ttl: number; // 5 minutes
    maxSize: number; // 1000 models
  };
  creditInfo: {
    ttl: number; // 1 minute
    refreshOnLowBalance: boolean;
  };
  usageStats: {
    ttl: number; // 1 hour
    aggregationInterval: number; // 15 minutes
  };
}
```

### Connection Pooling

```typescript
interface ConnectionConfig {
  maxConcurrentRequests: number;
  requestTimeout: number;
  retryAttempts: number;
  backoffStrategy: 'exponential' | 'linear';
}
```

## Error Handling

### Fallback Strategy

```typescript
interface FallbackConfig {
  enabled: boolean;
  maxAttempts: number;
  fallbackChain: Array<{
    provider: string;
    condition: 'always' | 'on_error' | 'on_rate_limit';
    delay: number;
  }>;
}
```

### Error Categories

```typescript
enum GatewayErrorType {
  AUTHENTICATION_FAILED = 'auth_failed',
  MODEL_NOT_AVAILABLE = 'model_unavailable',
  RATE_LIMIT_EXCEEDED = 'rate_limit',
  INSUFFICIENT_CREDITS = 'no_credits',
  NETWORK_ERROR = 'network_error',
  INVALID_REQUEST = 'invalid_request'
}
```