# Guia Completo de Configuração do Vercel AI SDK v5 para Zenith Tasks

## 📚 Índice
1. [Introdução e Visão Geral](#introdução)
2. [Arquitetura e Estrutura](#arquitetura)
3. [Configuração de Modelos](#configuração-de-modelos)
4. [Implementação de Tools e Tool Calling](#tools-e-tool-calling)
5. [MCP (Model Context Protocol)](#mcp-integration)
6. [Streaming e Eventos](#streaming-e-eventos)
7. [Structured Output com Zod](#structured-output)
8. [Melhores Práticas e Padrões](#melhores-práticas)
9. [Exemplos de Implementação](#exemplos-completos)
10. [Tratamento de Erros e Segurança](#erros-e-segurança)

---

## 1. Introdução e Visão Geral {#introdução}

### O que é o AI SDK v5?

O Vercel AI SDK v5 é o primeiro framework de IA com integração de chat totalmente tipada e altamente personalizável para React, Svelte, Vue e Angular. Lançado em 2025, representa uma evolução significativa com:

- **Type-safety completo** com TypeScript
- **Suporte nativo para MCP** (Model Context Protocol)
- **Streaming otimizado** com Server-Sent Events (SSE)
- **Ferramentas dinâmicas** e estáticas
- **Controle granular** sobre agentes e fluxos

### Principais Mudanças do v4 para v5

```typescript
// v4 (antigo)
const { messages, append } = useChat({
  toolCallStreaming: true, // opcional
});

// v5 (novo)
const { messages, sendMessage } = useChat({
  // toolCallStreaming sempre ativo por padrão
});
```

### Feedback da Comunidade (2024-2025)

- "A única abstração perfeita que vi até agora"
- "API muito mais limpa e intuitiva"
- "Construído por pessoas obcecadas com TypeScript"
- Redis recomendado para persistência em produção
---

##
 2. Arquitetura e Estrutura {#arquitetura}

### Estrutura Recomendada do Projeto

```
zenith-tasks/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── assistant/
│   │       │   ├── route.ts          # Endpoint principal do assistente
│   │       │   ├── chat/route.ts     # Chat streaming
│   │       │   └── act/route.ts      # Execução de ferramentas
│   │       └── mcp/
│   │           └── servers/
│   │               └── [id]/
│   │                   ├── route.ts
│   │                   ├── tools/route.ts
│   │                   └── call/route.ts
│   ├── server/
│   │   ├── aiProvider.ts             # Configuração de modelos
│   │   ├── mcpRegistry.ts            # Registro de servidores MCP
│   │   └── tools/                    # Definições de ferramentas
│   └── services/
│       └── ai/
│           ├── assistant.ts          # Lógica do assistente
│           ├── tools.ts              # Implementação de ferramentas
│           └── schemas.ts            # Schemas Zod
```

### Configuração do Provider Melhorada

```typescript
// src/server/aiProvider.ts
import { LanguageModel } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

export interface AIProviderConfig {
  provider: 'google' | 'openrouter' | 'anthropic' | 'openai';
  model?: string;
  apiKey?: string;
  baseURL?: string;
  structuredOutputs?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export class AIProvider {
  private static instance: AIProvider;
  private models: Map<string, LanguageModel> = new Map();

  static getInstance(): AIProvider {
    if (!this.instance) {
      this.instance = new AIProvider();
    }
    return this.instance;
  }

  async getModel(config?: Partial<AIProviderConfig>): Promise<LanguageModel> {
    const provider = config?.provider || process.env.AI_SDK_PROVIDER || 'google';
    const cacheKey = `${provider}-${config?.model || 'default'}`;

    if (this.models.has(cacheKey)) {
      return this.models.get(cacheKey)!;
    }

    const model = await this.createModel(provider, config);
    this.models.set(cacheKey, model);
    return model;
  }

  private async createModel(
    provider: string,
    config?: Partial<AIProviderConfig>
  ): Promise<LanguageModel> {
    switch (provider.toLowerCase()) {
      case 'google': {
        const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY missing');

        const google = createGoogleGenerativeAI({
          apiKey,
          // Configurações específicas do Google
          providerOptions: {
            google: {
              structuredOutputs: config?.structuredOutputs ?? true,
            }
          }
        });

        const modelName = config?.model || process.env.GEMINI_MODEL || 'gemini-2.5-pro';
        return google(modelName);
      }

      case 'openrouter': {
        const apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

        const openai = createOpenAI({
          apiKey,
          baseURL: config?.baseURL || 'https://openrouter.ai/api/v1',
          // Headers customizados para OpenRouter
          headers: {
            'X-Title': 'Zenith Tasks AI Assistant',
            'HTTP-Referer': process.env.NEXT_PUBLIC_URL || 'http://localhost:3457'
          }
        });

        const modelName = config?.model || process.env.OPENROUTER_MODEL || 'openrouter/auto';
        return openai(modelName);
      }

      case 'anthropic': {
        const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

        const anthropic = createAnthropic({ apiKey });
        const modelName = config?.model || 'claude-3-5-sonnet-20241022';
        return anthropic(modelName);
      }

      case 'openai': {
        const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OPENAI_API_KEY missing');

        const openai = createOpenAI({ apiKey });
        const modelName = config?.model || 'gpt-4o';
        return openai(modelName);
      }

      default:
        throw new Error(`Provider ${provider} not supported`);
    }
  }
}

// Helper function para compatibilidade com código existente
export async function getAISDKModel(config?: Partial<AIProviderConfig>) {
  return AIProvider.getInstance().getModel(config);
}
```