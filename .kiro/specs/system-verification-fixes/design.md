# Design Document

## Overview

Este documento apresenta o design para verificar e corrigir componentes críticos do sistema Zenith Tasks. Baseado na análise da estrutura atual, identificamos áreas que precisam de verificação e melhorias para garantir funcionamento adequado do chat, serviço de meetings, banco de dados e seletor de modelos.

## Architecture

### Current System Analysis

O sistema atual possui:
- **Frontend**: Next.js com componentes React em TypeScript
- **Backend**: API routes do Next.js com AI SDK v5
- **Database**: Supabase PostgreSQL com RLS
- **AI Integration**: Multiple providers (OpenAI, Anthropic, Google) via AI Gateway
- **Services**: Modular architecture com services para AI, database e MCP

### Problem Areas Identified

1. **Chat System**: Implementação complexa com múltiplas rotas (`/api/assistant`, `/api/chat/for-item`)
2. **Meeting Service**: Interface existe mas funcionalidade de gravação/transcrição incompleta
3. **Database**: Schema bem estruturado mas possíveis inconsistências nas operações
4. **Model Selector**: Limitado a poucos modelos, precisa expansão

## Components and Interfaces

### 1. Chat System Verification

#### Current Implementation Analysis
- **Assistant API** (`/api/assistant/route.ts`): Implementação robusta com AI SDK, ferramentas e streaming
- **Chat for Item API** (`/api/chat/for-item/route.ts`): Implementação mais simples para chat contextual
- **AI Services** (`/services/ai/`): Prompts, tools e assistant logic bem estruturados

#### Issues Identified
- Possível conflito entre diferentes endpoints de chat
- Falta de logs detalhados para debug
- Configuração de modelos pode estar inconsistente

#### Proposed Fixes
```typescript
interface ChatSystemDiagnostics {
  endpoints: {
    assistant: EndpointStatus;
    chatForItem: EndpointStatus;
  };
  aiProvider: ProviderStatus;
  tools: ToolsStatus;
  prompts: PromptsValidation;
}

interface EndpointStatus {
  accessible: boolean;
  responseTime: number;
  lastError?: string;
  modelConfigured: boolean;
}
```

### 2. Meeting Service Enhancement

#### Current State
- **Frontend**: `MeetingPage.tsx` com interface para transcrições
- **Backend**: `/api/speech/transcribe` com suporte básico para Google provider
- **Missing**: Gravação de áudio, processamento em tempo real

#### Required Components
```typescript
interface MeetingService {
  recording: {
    start(): Promise<void>;
    stop(): Promise<AudioBlob>;
    isRecording: boolean;
  };
  transcription: {
    transcribe(audio: AudioBlob): Promise<string>;
    realTimeTranscribe(stream: MediaStream): AsyncGenerator<string>;
  };
  storage: {
    saveMeeting(data: MeetingData): Promise<string>;
    getMeeting(id: string): Promise<MeetingData>;
  };
}

interface MeetingData {
  id: string;
  title: string;
  audioBlob?: Blob;
  transcript: TranscriptSegment[];
  summary?: string;
  topics: MeetingTopic[];
  participants: string[];
  startTime: Date;
  endTime?: Date;
}
```

### 3. Database Verification

#### Current Schema Analysis
- **Tables**: `mind_flow_items`, `subtasks`, `mcp_server_configs`
- **RLS**: Properly configured with user-based policies
- **Indexes**: Good coverage for performance
- **JSON Fields**: Used for complex data (chat_history, meeting_details, transcript)

#### Potential Issues
- JSON field queries may need optimization
- Missing indexes for specific query patterns
- Inconsistent data types between frontend and database

#### Verification Strategy
```typescript
interface DatabaseHealthCheck {
  schema: {
    tablesExist: boolean;
    indexesOptimal: boolean;
    constraintsValid: boolean;
  };
  data: {
    orphanedRecords: number;
    inconsistentTypes: string[];
    performanceIssues: QueryPerformanceIssue[];
  };
  rls: {
    policiesActive: boolean;
    userIsolation: boolean;
  };
}
```

### 4. Model Selector Expansion

#### Current Implementation
- **ModelSelector Component**: Bem estruturado com fallback para modelos padrão
- **API Route** (`/api/models`): Integração com AI Gateway para modelos disponíveis
- **Limited Models**: Apenas 4 modelos padrão configurados

#### Expansion Plan
```typescript
interface ExpandedModelConfig {
  providers: {
    openai: OpenAIModels[];
    anthropic: AnthropicModels[];
    google: GoogleModels[];
    cohere: CohereModels[];
    mistral: MistralModels[];
    perplexity: PerplexityModels[];
  };
  categories: {
    fast: ModelId[];
    balanced: ModelId[];
    powerful: ModelId[];
    economical: ModelId[];
    specialized: ModelId[];
  };
  contextOptimization: {
    chat: ModelId[];
    code: ModelId[];
    analysis: ModelId[];
    creative: ModelId[];
  };
}
```

## Data Models

### Enhanced Error Tracking
```typescript
interface SystemError {
  id: string;
  component: 'chat' | 'meeting' | 'database' | 'models';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  context: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}
```

### Diagnostic Results
```typescript
interface DiagnosticResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  issues: Issue[];
  recommendations: string[];
  metrics: Record<string, number>;
  lastChecked: Date;
}
```

## Error Handling

### Centralized Error Management
- **Error Categories**: Network, Configuration, Data, AI Provider, User Input
- **Logging Strategy**: Structured logs with correlation IDs
- **Recovery Mechanisms**: Automatic retry, fallback providers, graceful degradation
- **User Feedback**: Clear error messages with actionable steps

### Monitoring and Alerting
```typescript
interface MonitoringConfig {
  healthChecks: {
    interval: number;
    endpoints: string[];
    thresholds: HealthThresholds;
  };
  alerts: {
    channels: AlertChannel[];
    conditions: AlertCondition[];
  };
  metrics: {
    responseTime: boolean;
    errorRate: boolean;
    throughput: boolean;
    availability: boolean;
  };
}
```

## Testing Strategy

### Component Testing
1. **Unit Tests**: Individual service functions and utilities
2. **Integration Tests**: API endpoints with database operations
3. **E2E Tests**: Complete user workflows (chat, meeting creation, model selection)

### Performance Testing
1. **Load Testing**: API endpoints under concurrent requests
2. **Database Performance**: Query optimization and index effectiveness
3. **AI Provider Response**: Latency and reliability testing

### Diagnostic Tools
```typescript
interface DiagnosticTools {
  chatTester: {
    testEndpoint(endpoint: string): Promise<TestResult>;
    validatePrompts(): Promise<ValidationResult>;
    checkModelConnectivity(): Promise<ConnectivityResult>;
  };
  meetingTester: {
    testAudioCapture(): Promise<AudioTestResult>;
    testTranscription(sample: AudioBlob): Promise<TranscriptionResult>;
  };
  databaseTester: {
    runHealthCheck(): Promise<DatabaseHealthResult>;
    validateSchema(): Promise<SchemaValidationResult>;
    checkPerformance(): Promise<PerformanceResult>;
  };
  modelTester: {
    testProviderConnectivity(): Promise<ProviderTestResult>;
    validateModelConfigs(): Promise<ConfigValidationResult>;
  };
}
```

### Implementation Phases

#### Phase 1: Diagnostic Implementation
- Create comprehensive diagnostic tools
- Implement health check endpoints
- Set up monitoring and logging

#### Phase 2: Issue Resolution
- Fix identified chat system issues
- Complete meeting service implementation
- Optimize database operations
- Expand model selector options

#### Phase 3: Enhancement and Monitoring
- Implement real-time monitoring
- Add performance optimizations
- Create user-friendly error reporting
- Set up automated testing pipeline

## Security Considerations

- **Input Validation**: Sanitize all user inputs, especially for AI prompts
- **Rate Limiting**: Implement per-user and per-endpoint limits
- **Data Privacy**: Ensure meeting recordings and transcripts are properly secured
- **API Security**: Validate all external AI provider communications
- **Database Security**: Maintain RLS policies and audit access patterns