# 📚 Vercel AI SDK - Documentação Completa

> Documentação compilada em 09/11/2025 para o projeto Zenith Tasks

## 🎯 Índice

1. [Visão Geral](#visão-geral)
2. [AI SDK Core](#ai-sdk-core)
3. [Geração de Texto](#geração-de-texto)
4. [Tool Calling](#tool-calling)
5. [Multi-Step Calls](#multi-step-calls)
6. [Structured Data](#structured-data)
7. [Streaming](#streaming)
8. [AI SDK UI](#ai-sdk-ui)
9. [Providers](#providers)
10. [Embeddings](#embeddings)
11. [Agents](#agents)
12. [Best Practices](#best-practices)

---

## 🌟 Visão Geral

O **AI SDK** é um toolkit TypeScript projetado para ajudar desenvolvedores a construir aplicações e agentes com IA.

### Principais Componentes

- **AI SDK Core**: API unificada para geração de texto, objetos estruturados, tool calls e agents
- **AI SDK UI**: Hooks framework-agnostic para construir UIs de chat

### Providers Suportados

OpenAI, Anthropic, Google, xAI (Grok), Azure, Groq, Mistral, e muitos outros.

### Frameworks Suportados

Next.js, Vue, Svelte, Node.js, Expo, Angular

---

## 🔧 AI SDK Core

### Funções Principais

#### 1. **`generateText`**
```typescript
const { text, toolCalls, usage } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Explique quantum computing',
  maxOutputTokens: 500,
  temperature: 0.7,
});
```

**Uso ideal**: Casos não-interativos (automação, drafts, resumos)

**Retorna**:
- `text`: Texto gerado
- `toolCalls`: Tools invocadas
- `toolResults`: Resultados das tools
- `finishReason`: Por que parou ("stop", "tool-calls", etc)
- `usage`: Métricas de tokens
- `messages`: Histórico da conversa

#### 2. **`streamText`**
```typescript
const { textStream, fullStream } = await streamText({
  model: openai('gpt-4o'),
  prompt: 'Escreva um poema sobre IA',
  maxSteps: 5, // ← Permite múltiplos passos
});

// Stream apenas texto
for await (const chunk of textStream) {
  console.log(chunk);
}

// Stream completo (inclui tool calls)
for await (const event of fullStream) {
  if (event.type === 'text-delta') {
    console.log(event.textDelta);
  }
}
```

**Uso ideal**: Aplicações interativas (chatbots, UIs em tempo real)

**Características**:
- Streaming progressivo de tokens
- Backpressure handling (só gera quando solicitado)
- Callbacks: `onChunk`, `onFinish`, `onError`
- Suporte a transformações customizadas

#### 3. **`generateObject`**
```typescript
const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    name: z.string(),
    age: z.number(),
    skills: z.array(z.string()),
  }),
  prompt: 'Gere um perfil de desenvolvedor',
});
```

**Uso ideal**: Extração de informações estruturadas, classificação

**Output Strategies**:
- **object**: Retorna um objeto único
- **array**: Múltiplos objetos (com `elementStream`)
- **enum**: Classificação (valor específico de uma lista)
- **no-schema**: Dinâmico sem validação

#### 4. **`streamObject`**
```typescript
const { partialObjectStream } = await streamObject({
  model: openai('gpt-4o'),
  schema: mySchema,
  prompt: 'Gere lista de tarefas',
});

for await (const partial of partialObjectStream) {
  console.log(partial); // Objeto parcial conforme gera
}
```

**Uso ideal**: UIs progressivas, geração incremental

---

## 🛠️ Tool Calling

### Definindo Tools

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get weather for a location',
  inputSchema: z.object({
    location: z.string(),
    unit: z.enum(['celsius', 'fahrenheit']).optional(),
  }),
  execute: async ({ location, unit = 'celsius' }) => {
    const data = await fetchWeather(location, unit);
    return { temperature: data.temp, condition: data.condition };
  },
});
```

### Usando Tools

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  tools: {
    weather: weatherTool,
    search: searchTool,
  },
  toolChoice: 'auto', // 'auto' | 'required' | 'none'
  prompt: 'What is the weather in Tokyo?',
});
```

### Tool Lifecycle Hooks

```typescript
const result = await streamText({
  model: openai('gpt-4o'),
  tools: { myTool },
  onInputStart: ({ toolName, input }) => {
    console.log(`Calling ${toolName} with:`, input);
  },
  onInputDelta: ({ toolName, delta }) => {
    console.log(`Input delta for ${toolName}:`, delta);
  },
  onInputAvailable: ({ toolName, input }) => {
    console.log(`Final input for ${toolName}:`, input);
  },
});
```

### Dynamic Tools

```typescript
import { dynamicTool } from 'ai';

const dynamic = dynamicTool({
  name: 'calculator',
  description: 'Perform calculations',
  inputSchema: runtimeSchema, // Schema definido em runtime
  execute: async (input) => {
    return eval(input.expression);
  },
});
```

---

## 🔁 Multi-Step Calls

### Configuração Básica

Por padrão, `generateText` e `streamText` executam **1 step apenas**. Para permitir múltiplos passos:

#### Método 1: `maxSteps` (Deprecated → use `stopWhen`)

```typescript
const result = await streamText({
  model: openai('gpt-4o'),
  maxSteps: 5, // Até 5 passos (tool calls + resposta)
  tools: { searchTool, analysisTool },
  prompt: 'Analise as notícias de hoje',
});
```

#### Método 2: `stopWhen` (Recomendado)

```typescript
import { stepCountIs, hasToolCall } from 'ai';

const result = await generateText({
  model: openai('gpt-4o'),
  stopWhen: stepCountIs(5), // Para após 5 steps
  tools: { search, analyze },
  prompt: 'Pesquise e analise',
});

// Ou múltiplas condições (para quando QUALQUER for satisfeita)
const result2 = await generateText({
  model: openai('gpt-4o'),
  stopWhen: [
    stepCountIs(10),
    hasToolCall('finalAnswer'),
  ],
  tools: { search, analyze, finalAnswer },
  prompt: 'Pesquise até encontrar resposta',
});
```

### Como Funciona

```
Step 1: User → Model
  ↓
  Model decide chamar "search" tool
  ↓
Step 2: Tool "search" executa → retorna resultados
  ↓
  Model recebe resultados
  ↓
Step 3: Model decide chamar "analyze" tool
  ↓
  Tool "analyze" executa → retorna análise
  ↓
Step 4: Model recebe análise → gera resposta final em texto ✅
```

### Callbacks de Steps

```typescript
const result = await streamText({
  model: openai('gpt-4o'),
  maxSteps: 5,
  tools: { myTools },
  onStepFinish: ({ usage, toolCalls, text, stepType }) => {
    console.log('Step finished:', {
      type: stepType,
      tools: toolCalls?.map(tc => tc.toolName),
      hasText: !!text,
      tokens: usage?.totalTokens,
    });
  },
  onFinish: ({ text, toolCalls, usage }) => {
    console.log('All steps finished:', {
      finalText: text,
      totalTools: toolCalls?.length,
      totalTokens: usage?.totalTokens,
    });
  },
});
```

---

## 📊 Structured Data

### Com Zod

```typescript
import { z } from 'zod';
import { generateObject } from 'ai';

const TaskSchema = z.object({
  title: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  dueDate: z.string().optional(),
  subtasks: z.array(z.object({
    title: z.string(),
    completed: z.boolean(),
  })),
});

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: TaskSchema,
  prompt: 'Crie uma tarefa para lançamento de produto',
});
```

### Streaming de Arrays

```typescript
const { elementStream } = await streamObject({
  model: openai('gpt-4o'),
  output: 'array',
  schema: z.object({
    name: z.string(),
    category: z.string(),
  }),
  prompt: 'Liste 10 produtos de tecnologia',
});

for await (const element of elementStream) {
  console.log('Novo item:', element);
}
```

### Error Handling

```typescript
import { AI_NoObjectGeneratedError } from 'ai';

try {
  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: mySchema,
    prompt: 'Gere dados',
  });
} catch (error) {
  if (error instanceof AI_NoObjectGeneratedError) {
    console.error('Geração falhou:', {
      text: error.text,
      usage: error.usage,
      cause: error.cause,
    });
  }
}
```

---

## 🌊 Streaming

### Por que usar Streaming?

LLMs podem levar **5-40 segundos** para gerar respostas longas. Streaming:
- ✅ Reduz latência percebida
- ✅ Melhora UX em chatbots
- ✅ Permite cancelamento antecipado
- ✅ Mostra progresso em tempo real

### Text Stream vs Full Stream

```typescript
const { textStream, fullStream } = await streamText({
  model: openai('gpt-4o'),
  tools: { myTool },
  prompt: 'Analyze data',
});

// 1. Text Stream - APENAS texto final (sem tool calls)
for await (const chunk of textStream) {
  process.stdout.write(chunk);
}

// 2. Full Stream - TODOS os eventos
for await (const event of fullStream) {
  switch (event.type) {
    case 'text-delta':
      console.log('Text:', event.textDelta);
      break;
    case 'tool-call':
      console.log('Tool called:', event.toolName, event.args);
      break;
    case 'tool-result':
      console.log('Tool result:', event.result);
      break;
    case 'finish':
      console.log('Done!', event.finishReason);
      break;
  }
}
```

### toTextStreamResponse

```typescript
// Para retornar em API routes do Next.js
export async function POST(req: Request) {
  const result = await streamText({
    model: openai('gpt-4o'),
    prompt: await req.text(),
  });

  // Retorna APENAS texto (tool calls filtrados automaticamente)
  return result.toTextStreamResponse();
}
```

**Importante**: `toTextStreamResponse()` **filtra automaticamente** tool calls e metadados, retornando apenas o texto final!

---

## 🎨 AI SDK UI

### useChat (React)

```typescript
'use client';

import { useChat } from 'ai/react';

export default function ChatPage() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
  } = useChat({
    api: '/api/chat',
    initialMessages: [],
    onFinish: (message) => {
      console.log('Mensagem completa:', message);
    },
    onError: (error) => {
      console.error('Erro:', error);
    },
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <button type="submit">Enviar</button>
        {isLoading && <button onClick={stop}>Parar</button>}
      </form>
    </div>
  );
}
```

### Status Management

```typescript
const { status } = useChat();

// status pode ser:
// - 'submitted': Mensagem enviada, aguardando resposta
// - 'streaming': Resposta sendo transmitida
// - 'ready': Pronto para nova mensagem
// - 'error': Erro ocorreu
```

### File Attachments

```typescript
const { append } = useChat();

const handleFileUpload = (files: FileList) => {
  append({
    role: 'user',
    content: 'Analyze this image',
    experimental_attachments: files,
  });
};
```

### useCompletion

```typescript
import { useCompletion } from 'ai/react';

const {
  completion,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
} = useCompletion({
  api: '/api/completion',
});
```

### useObject

```typescript
import { useObject } from 'ai/react';

const { object, submit, isLoading } = useObject({
  api: '/api/generate-object',
  schema: myZodSchema,
});

// object é atualizado progressivamente conforme stream
```

---

## 🔌 Providers

### OpenAI

```typescript
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-4o', {
  structuredOutputs: true, // Default
  reasoningEffort: 'high', // Para o1/o3/o4
});

// Custom instance
import { createOpenAI } from '@ai-sdk/openai';

const custom = createOpenAI({
  apiKey: process.env.CUSTOM_KEY,
  baseURL: 'https://custom-endpoint.com',
  headers: {
    'Custom-Header': 'value',
  },
});
```

**Modelos suportados**:
- Chat: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
- Reasoning: o1, o3-mini, o4-mini
- Vision: gpt-4-vision-preview
- Embeddings: text-embedding-3-large, text-embedding-3-small
- Images: dall-e-3, dall-e-2

**Features**:
- ✅ Tool calling
- ✅ Structured outputs
- ✅ Vision (imagens + PDFs)
- ✅ Prompt caching
- ✅ Predicted outputs

### xAI (Grok)

```typescript
import { xai } from '@ai-sdk/xai';

const model = xai('grok-4-fast-reasoning', {
  liveSearch: 'auto', // 'auto' | 'on' | 'off'
  liveSearchSources: ['web', 'x', 'news', 'rss'],
  reasoningEffort: 'high', // 'low' | 'high'
});

// Custom instance
import { createXai } from '@ai-sdk/xai';

const custom = createXai({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});
```

**Modelos**:
- grok-4-fast-reasoning (2M tokens context)
- grok-3, grok-3-mini
- grok-2-vision (visão)
- grok-2-image (geração de imagens)

**Features únicas**:
- ✅ **Live Search**: Acesso em tempo real a web, X (Twitter), notícias
- ✅ Citações e filtragem por data
- ✅ Geração de imagens (1024x768, até 10 por request)
- ✅ Parallel function calling

### Google (Gemini)

```typescript
import { google } from '@ai-sdk/google';

const model = google('gemini-2.5-pro');
```

**Modelos**:
- gemini-2.5-pro (2M tokens)
- gemini-2.5-flash (1M tokens)
- gemini-1.5-pro, gemini-1.5-flash

### Anthropic (Claude)

```typescript
import { anthropic } from '@ai-sdk/anthropic';

const model = anthropic('claude-3-5-sonnet-20241022');
```

---

## 🧠 Embeddings

### embed (Single)

```typescript
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

const { embedding, usage } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'Como fazer bolo de chocolate',
});

console.log(embedding); // [0.123, -0.456, ...]
console.log(usage); // { tokens: 7 }
```

### embedMany (Batch)

```typescript
import { embedMany } from 'ai';

const { embeddings, usage } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: [
    'Receita de bolo',
    'Ingredientes para pizza',
    'Como fazer pão',
  ],
  maxParallelCalls: 3,
});
```

### Similarity

```typescript
import { cosineSimilarity } from 'ai';

const similarity = cosineSimilarity(embedding1, embedding2);
console.log(similarity); // 0.95 (muito similar)
```

### Providers

| Provider | Modelo | Dimensões |
|----------|--------|-----------|
| OpenAI | text-embedding-3-large | 3072 |
| OpenAI | text-embedding-3-small | 1536 |
| Google | text-embedding-004 | 768 |
| Mistral | mistral-embed | 1024 |
| Cohere | embed-english-v3.0 | 1024 |
| Amazon Bedrock | titan-embed-text-v2 | 1024 |

---

## 🤖 Agents

### Loop Control

```typescript
import { generateText, stepCountIs, hasToolCall } from 'ai';

const result = await generateText({
  model: openai('gpt-4o'),

  // Condição de parada
  stopWhen: [
    stepCountIs(10), // Máximo 10 steps
    hasToolCall('finalAnswer'), // Ou quando chamar finalAnswer
  ],

  // Preparar cada step
  prepareStep: ({ step, messages, toolCalls }) => {
    // Trocar modelo dinamicamente
    if (step > 5) {
      return {
        model: openai('gpt-4o-mini'), // Modelo mais barato
      };
    }

    // Limitar tools por fase
    if (toolCalls.some(tc => tc.toolName === 'search')) {
      return {
        tools: { analyze: analyzeTool, finalAnswer: finalTool },
      };
    }

    // Comprimir histórico
    if (messages.length > 20) {
      return {
        messages: summarizeMessages(messages),
      };
    }
  },

  tools: {
    search: searchTool,
    analyze: analyzeTool,
    finalAnswer: finalTool,
  },

  prompt: 'Pesquise e analise tendências de IA',
});
```

### Custom Loop

```typescript
let messages = [{ role: 'user', content: 'Tarefa complexa' }];
let step = 0;
const maxSteps = 10;

while (step < maxSteps) {
  const result = await generateText({
    model: openai('gpt-4o'),
    messages,
    tools: myTools,
  });

  // Verificar se deve parar
  if (result.finishReason === 'stop') {
    console.log('Finalizado:', result.text);
    break;
  }

  // Adicionar resposta ao histórico
  messages.push(...result.messages);
  step++;
}
```

---

## ✅ Best Practices

### 1. **Escolha o modelo certo**

```typescript
// Tarefas simples → modelo pequeno/rápido
const quick = await generateText({
  model: openai('gpt-4o-mini'),
  prompt: 'Resuma este texto',
});

// Tarefas complexas → modelo grande
const complex = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Analise profundamente esta tese',
});
```

### 2. **Use streaming para UIs**

```typescript
// ❌ Ruim: Usuário espera tudo
const result = await generateText({ ... });
displayText(result.text);

// ✅ Bom: Usuário vê progresso
const { textStream } = await streamText({ ... });
for await (const chunk of textStream) {
  appendToUI(chunk);
}
```

### 3. **Limite maxSteps para evitar loops infinitos**

```typescript
// ✅ Sempre defina um limite
const result = await streamText({
  model: openai('gpt-4o'),
  maxSteps: 5, // Evita loops infinitos
  tools: { myTool },
});
```

### 4. **Valide inputs de tools**

```typescript
const safeTool = tool({
  inputSchema: z.object({
    query: z.string().max(500), // Limite de caracteres
    limit: z.number().min(1).max(100), // Range válido
  }),
  execute: async ({ query, limit }) => {
    // Sanitize
    const clean = sanitize(query);
    return await search(clean, limit);
  },
});
```

### 5. **Handle errors gracefully**

```typescript
try {
  const result = await streamText({ ... });
  return result.toTextStreamResponse();
} catch (error) {
  if (error instanceof AI_APICallError) {
    console.error('API Error:', error.statusCode, error.message);
    return new Response('AI temporarily unavailable', { status: 503 });
  }
  throw error;
}
```

### 6. **Use context compression para históricos longos**

```typescript
const compressMessages = (messages: Message[]) => {
  if (messages.length <= 10) return messages;

  // Manter primeira e últimas 5 mensagens
  return [
    messages[0],
    { role: 'system', content: '[... conversação resumida ...]' },
    ...messages.slice(-5),
  ];
};
```

### 7. **Monitor token usage**

```typescript
const result = await generateText({ ... });
console.log('Tokens:', result.usage);

// Implement tracking
trackUsage({
  model: 'gpt-4o',
  promptTokens: result.usage.promptTokens,
  completionTokens: result.usage.completionTokens,
  totalTokens: result.usage.totalTokens,
});
```

### 8. **Cache prompts quando possível**

```typescript
// OpenAI e Anthropic suportam prompt caching
const result = await generateText({
  model: openai('gpt-4o'),
  messages: [
    {
      role: 'system',
      content: longSystemPrompt, // Automaticamente cached
    },
    { role: 'user', content: userQuery },
  ],
});
```

---

## 📖 Referências

- **Docs oficiais**: https://ai-sdk.dev
- **GitHub**: https://github.com/vercel/ai
- **Templates**: https://vercel.com/templates?type=ai
- **Changelog**: https://ai-sdk.dev/docs/changelog

---

## 🎯 Resumo Rápido

### Quando usar cada função:

| Função | Uso | Streaming | Tools | Structured |
|--------|-----|-----------|-------|------------|
| `generateText` | Automação, drafts | ❌ | ✅ | ❌ |
| `streamText` | Chatbots, UIs | ✅ | ✅ | ❌ |
| `generateObject` | Extração de dados | ❌ | ✅ | ✅ |
| `streamObject` | UIs progressivas | ✅ | ✅ | ✅ |

### Hierarquia de decisão:

```
Precisa de dados estruturados?
  ├─ Sim → generateObject / streamObject
  └─ Não → Precisa de streaming?
            ├─ Sim → streamText
            └─ Não → generateText
```

---

**Documentação compilada para Zenith Tasks - Novembro 2025** 🚀
