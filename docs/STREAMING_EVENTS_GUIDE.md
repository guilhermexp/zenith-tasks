# Guia Completo de Streaming e Eventos no AI SDK v5

## 📚 Índice
1. [Visão Geral do Streaming](#visão-geral)
2. [Server-Sent Events (SSE)](#sse-implementation)
3. [Implementação de Streaming](#streaming-implementation)
4. [Eventos e Callbacks](#eventos-callbacks)
5. [UI Streaming Components](#ui-streaming)
6. [Structured Output com Streaming](#structured-streaming)
7. [Exemplos Completos](#exemplos-completos)

---

## 1. Visão Geral do Streaming {#visão-geral}

### Conceitos Fundamentais

O AI SDK v5 usa Server-Sent Events (SSE) como padrão para streaming, oferecendo:

- **Streaming em tempo real** de respostas do modelo
- **Tool call streaming** habilitado por padrão
- **Eventos granulares** para cada parte da resposta
- **Suporte nativo** em todos os navegadores modernos

### Tipos de Streaming Disponíveis

```typescript
// 1. Text Streaming - Para respostas de texto
const textStream = await streamText({ model, prompt });

// 2. Object Streaming - Para dados estruturados
const objectStream = await streamObject({ model, schema, prompt });

// 3. UI Streaming - Para componentes React (RSC)
const uiStream = await streamUI({ model, prompt, tools });
```

### Mudanças do v4 para v5

```typescript
// v4 (antigo)
const result = await streamText({
  toolCallStreaming: true, // Opcional
  // ...
});

// v5 (novo)
const result = await streamText({
  // toolCallStreaming sempre ativo
  // Novos eventos granulares disponíveis
  onInputStart: () => {},
  onInputDelta: () => {},
  onInputAvailable: () => {},
  // ...
});
```

---

## 2. Server-Sent Events (SSE) {#sse-implementation}

### Implementação Básica de SSE

```typescript
// src/app/api/assistant/sse/route.ts
import { streamText } from 'ai';
import { getAISDKModel } from '@/server/aiProvider';

export async function POST(req: Request) {
  const { message } = await req.json();
  const model = await getAISDKModel();

  const result = await streamText({
    model,
    prompt: message
  });

  // Converter para SSE Response
  return new Response(result.toTextStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
```

### SSE Customizado com TransformStream

```typescript
// src/services/streaming/sse-transformer.ts
export class SSETransformer {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private eventId = 0;

  createTransformStream() {
    return new TransformStream({
      transform: async (chunk, controller) => {
        // Processar chunk do AI SDK
        const processed = this.processChunk(chunk);

        // Formatar como SSE
        const sseData = this.formatSSE(processed);

        // Enviar para o cliente
        controller.enqueue(this.encoder.encode(sseData));
      },

      flush: (controller) => {
        // Enviar evento de finalização
        const doneEvent = this.formatSSE({
          type: 'done',
          timestamp: Date.now()
        });
        controller.enqueue(this.encoder.encode(doneEvent));
      }
    });
  }

  private processChunk(chunk: any) {
    // Processar diferentes tipos de chunks
    switch (chunk.type) {
      case 'text-delta':
        return {
          type: 'text',
          content: chunk.textDelta,
          id: this.eventId++
        };

      case 'tool-call-streaming-start':
        return {
          type: 'tool-start',
          toolId: chunk.toolCallId,
          toolName: chunk.toolName,
          id: this.eventId++
        };

      case 'tool-call-delta':
        return {
          type: 'tool-delta',
          toolId: chunk.toolCallId,
          delta: chunk.argsTextDelta,
          id: this.eventId++
        };

      case 'tool-call':
        return {
          type: 'tool-complete',
          toolId: chunk.toolCallId,
          result: chunk.toolResult,
          id: this.eventId++
        };

      case 'finish':
        return {
          type: 'finish',
          usage: chunk.usage,
          finishReason: chunk.finishReason,
          id: this.eventId++
        };

      default:
        return chunk;
    }
  }

  private formatSSE(data: any): string {
    const lines = [
      `id: ${data.id || this.eventId}`,
      `event: ${data.type || 'message'}`,
      `data: ${JSON.stringify(data)}`,
      '', // Linha em branco necessária
      '' // Double newline para separar eventos
    ];

    return lines.join('\n');
  }
}
```

---

## 3. Implementação de Streaming {#streaming-implementation}

### Streaming Avançado com Controle Fino

```typescript
// src/app/api/assistant/stream/advanced/route.ts
import { streamText, StreamTextResult } from 'ai';
import { getAISDKModel } from '@/server/aiProvider';
import { taskTools } from '@/services/ai/tools';

export async function POST(req: Request) {
  const { messages, options = {} } = await req.json();
  const model = await getAISDKModel();

  // Configurações avançadas de streaming
  const streamConfig = {
    model,
    messages,
    tools: taskTools,

    // Controle de streaming
    experimental_streamSpan: true, // Spans detalhados

    // Callbacks granulares (novo em v5)
    onStart: async () => {
      console.log('[Stream] Started');
      await trackStreamStart();
    },

    onToken: async (token: string) => {
      // Callback para cada token individual
      console.log('[Token]', token);
    },

    onText: async (text: string) => {
      // Texto acumulado até agora
      console.log('[Text]', text.length, 'chars');
    },

    onToolCall: async ({ toolCall }) => {
      console.log('[Tool] Called:', toolCall.toolName);
      await logToolCall(toolCall);
    },

    onStepFinish: async ({ usage, finishReason }) => {
      console.log('[Step] Finished:', finishReason);
      await trackStepUsage(usage);
    },

    onFinish: async ({ text, usage, steps }) => {
      console.log('[Stream] Finished');
      await trackStreamComplete({
        totalTokens: usage.totalTokens,
        steps: steps.length,
        duration: Date.now() - startTime
      });
    },

    onError: async (error) => {
      console.error('[Stream] Error:', error);
      await logStreamError(error);
    }
  };

  const startTime = Date.now();
  const result = await streamText(streamConfig);

  // Criar um stream customizado com métricas
  const metricsStream = new TransformStream({
    transform: async (chunk, controller) => {
      // Adicionar métricas ao chunk
      const enrichedChunk = {
        ...chunk,
        timestamp: Date.now(),
        elapsed: Date.now() - startTime
      };

      controller.enqueue(enrichedChunk);

      // Coletar métricas
      await collectStreamMetrics(enrichedChunk);
    }
  });

  // Pipeline de streams
  const stream = result
    .fullStream
    .pipeThrough(metricsStream);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Stream-Id': generateStreamId()
    }
  });
}
```

### Diferentes Tipos de Streams do AI SDK v5

```typescript
// src/services/streaming/stream-types.ts
import { streamText } from 'ai';

export async function demonstrateStreamTypes(model: any, prompt: string) {
  const result = await streamText({ model, prompt });

  // 1. Text Stream - Apenas texto
  const textStream = result.textStream;
  for await (const textChunk of textStream) {
    console.log('Text chunk:', textChunk);
  }

  // 2. Full Stream - Todos os eventos
  const fullStream = result.fullStream;
  for await (const chunk of fullStream) {
    switch (chunk.type) {
      case 'text-delta':
        console.log('Text delta:', chunk.textDelta);
        break;
      case 'tool-call-streaming-start':
        console.log('Tool streaming started:', chunk.toolName);
        break;
      case 'tool-call-delta':
        console.log('Tool arg delta:', chunk.argsTextDelta);
        break;
      case 'tool-call':
        console.log('Tool call complete:', chunk.toolName);
        break;
      case 'finish':
        console.log('Stream finished:', chunk.finishReason);
        break;
    }
  }

  // 3. Tool Call Stream - Apenas tool calls
  const toolCallStream = result.toolCallStream;
  for await (const toolCall of toolCallStream) {
    console.log('Tool call:', toolCall);
  }

  // 4. Tool Result Stream - Resultados de ferramentas
  const toolResultStream = result.toolResultStream;
  for await (const toolResult of toolResultStream) {
    console.log('Tool result:', toolResult);
  }

  // 5. UI Message Stream - Para componentes UI
  const uiStream = result.toUIMessageStream();
  for await (const uiMessage of uiStream) {
    console.log('UI Message:', uiMessage);
  }
}
```

---

## 4. Eventos e Callbacks {#eventos-callbacks}

### Sistema Completo de Eventos

```typescript
// src/services/streaming/event-manager.ts
import { EventEmitter } from 'events';

export class StreamEventManager extends EventEmitter {
  private metrics = {
    startTime: 0,
    endTime: 0,
    tokensGenerated: 0,
    toolCalls: 0,
    errors: 0,
    chunks: 0
  };

  // Registrar handlers para diferentes eventos
  setupHandlers() {
    // Início do stream
    this.on('stream:start', () => {
      this.metrics.startTime = Date.now();
      console.log('[Event] Stream started');
    });

    // Chunk de texto
    this.on('stream:text', (data) => {
      this.metrics.tokensGenerated++;
      this.metrics.chunks++;
      console.log('[Event] Text chunk:', data.length);
    });

    // Tool call
    this.on('stream:tool', (data) => {
      this.metrics.toolCalls++;
      console.log('[Event] Tool call:', data.toolName);
    });

    // Erro
    this.on('stream:error', (error) => {
      this.metrics.errors++;
      console.error('[Event] Error:', error);
    });

    // Fim do stream
    this.on('stream:end', () => {
      this.metrics.endTime = Date.now();
      const duration = this.metrics.endTime - this.metrics.startTime;
      console.log('[Event] Stream ended. Duration:', duration, 'ms');
      console.log('[Event] Metrics:', this.metrics);
    });
  }

  // Emitir evento customizado
  emitCustomEvent(event: string, data: any) {
    this.emit(`custom:${event}`, data);
  }

  // Obter métricas
  getMetrics() {
    return { ...this.metrics };
  }

  // Reset métricas
  resetMetrics() {
    this.metrics = {
      startTime: 0,
      endTime: 0,
      tokensGenerated: 0,
      toolCalls: 0,
      errors: 0,
      chunks: 0
    };
  }
}
```

### Implementação de Callbacks Avançados

```typescript
// src/app/api/assistant/stream/callbacks/route.ts
import { streamText } from 'ai';
import { StreamEventManager } from '@/services/streaming/event-manager';

export async function POST(req: Request) {
  const { message } = await req.json();
  const eventManager = new StreamEventManager();
  eventManager.setupHandlers();

  const model = await getAISDKModel();

  const result = await streamText({
    model,
    messages: [{ role: 'user', content: message }],
    tools: taskTools,

    // Callbacks detalhados
    onStart: async () => {
      eventManager.emit('stream:start', {});

      // Inicializar recursos
      await initializeStreamResources();
    },

    onToken: async (token) => {
      eventManager.emit('stream:token', { token });

      // Processar token individual
      if (isSensitiveToken(token)) {
        console.warn('Sensitive token detected');
      }
    },

    onText: async (text) => {
      eventManager.emit('stream:text', { text });

      // Análise em tempo real
      if (text.length % 100 === 0) {
        await analyzePartialResponse(text);
      }
    },

    onToolCall: async ({ toolCall }) => {
      eventManager.emit('stream:tool', toolCall);

      // Validar tool call
      const isValid = await validateToolCall(toolCall);
      if (!isValid) {
        throw new Error(`Invalid tool call: ${toolCall.toolName}`);
      }
    },

    onStepFinish: async ({ usage, finishReason, stepIndex }) => {
      eventManager.emit('stream:step', {
        index: stepIndex,
        reason: finishReason,
        tokens: usage.totalTokens
      });

      // Verificar limites
      if (usage.totalTokens > MAX_TOKENS_PER_STEP) {
        console.warn('Step exceeded token limit');
      }
    },

    onFinish: async ({ text, usage, steps, response }) => {
      eventManager.emit('stream:end', {
        totalTokens: usage.totalTokens,
        steps: steps.length
      });

      // Salvar resultado
      await saveStreamResult({
        message,
        response: text,
        usage,
        steps,
        metrics: eventManager.getMetrics()
      });
    },

    onError: async (error) => {
      eventManager.emit('stream:error', error);

      // Tratamento de erro específico
      await handleStreamError(error, { message, context: 'streaming' });
    }
  });

  // Criar stream com eventos customizados
  const eventStream = new TransformStream({
    transform: async (chunk, controller) => {
      // Emitir evento para cada chunk
      eventManager.emit('stream:chunk', chunk);

      // Adicionar dados do evento ao chunk
      const enrichedChunk = {
        ...chunk,
        eventId: generateEventId(),
        metrics: eventManager.getMetrics()
      };

      controller.enqueue(enrichedChunk);
    }
  });

  const finalStream = result.fullStream.pipeThrough(eventStream);

  return new Response(finalStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'X-Stream-Events': 'enabled'
    }
  });
}
```

---

## 5. UI Streaming Components {#ui-streaming}

### Componente React com Streaming Completo

```typescript
// src/components/StreamingAssistant.tsx
'use client';

import { useChat, readUIMessageStream } from '@ai-sdk/react';
import { useState, useEffect, useRef } from 'react';

interface StreamMetrics {
  tokensPerSecond: number;
  totalTokens: number;
  streamDuration: number;
  toolCallCount: number;
}

export function StreamingAssistant() {
  const [metrics, setMetrics] = useState<StreamMetrics>({
    tokensPerSecond: 0,
    totalTokens: 0,
    streamDuration: 0,
    toolCallCount: 0
  });

  const [streamingParts, setStreamingParts] = useState<any[]>([]);
  const streamStartTime = useRef<number>(0);
  const tokenCount = useRef<number>(0);

  const {
    messages,
    input,
    isLoading,
    error,
    sendMessage,
    setInput,
    stop,
    reload,
    append,
    setMessages
  } = useChat({
    api: '/api/assistant/stream/advanced',

    // Configurações de streaming
    streamProtocol: 'sse', // ou 'websocket'

    // Callbacks de streaming
    onResponse: (response) => {
      console.log('Response started:', response.status);
      streamStartTime.current = Date.now();
      tokenCount.current = 0;
    },

    onFinish: (message, { usage, finishReason }) => {
      const duration = Date.now() - streamStartTime.current;
      const tps = tokenCount.current / (duration / 1000);

      setMetrics({
        tokensPerSecond: Math.round(tps),
        totalTokens: usage?.totalTokens || 0,
        streamDuration: duration,
        toolCallCount: message.toolCalls?.length || 0
      });

      console.log('Stream finished:', {
        duration: `${duration}ms`,
        tokensPerSecond: tps.toFixed(2),
        totalTokens: usage?.totalTokens
      });
    },

    onError: (error) => {
      console.error('Stream error:', error);
      showNotification({
        type: 'error',
        message: `Erro no streaming: ${error.message}`
      });
    },

    onToolCall: ({ toolCall }) => {
      console.log('Tool called during stream:', toolCall);
      setStreamingParts(prev => [...prev, {
        type: 'tool',
        name: toolCall.toolName,
        args: toolCall.args,
        timestamp: Date.now()
      }]);
    },

    // Novo em v5: processar partes do stream
    onData: (data) => {
      tokenCount.current++;

      // Processar diferentes tipos de dados
      if (data.type === 'text') {
        setStreamingParts(prev => [...prev, {
          type: 'text',
          content: data.content,
          timestamp: Date.now()
        }]);
      } else if (data.type === 'tool-input-streaming') {
        setStreamingParts(prev => [...prev, {
          type: 'tool-streaming',
          input: data.input,
          timestamp: Date.now()
        }]);
      }
    }
  });

  // Processar stream manualmente para análise detalhada
  useEffect(() => {
    if (!messages.length) return;

    const processMessageStream = async () => {
      const lastMessage = messages[messages.length - 1];

      if (lastMessage.role === 'assistant' && lastMessage.id) {
        // Ler stream UI para processar partes
        for await (const uiMessage of readUIMessageStream({
          stream: lastMessage.stream // Assumindo que temos acesso ao stream
        })) {
          uiMessage.parts.forEach(part => {
            switch (part.type) {
              case 'text':
                console.log('UI Text:', part.text);
                break;

              case 'tool-call':
                console.log('UI Tool Call:', part.toolName, part.args);
                break;

              case 'tool-result':
                console.log('UI Tool Result:', part.result);
                break;

              case 'dynamic-tool':
                if (part.state === 'input-streaming') {
                  console.log('UI Tool Input Streaming:', part.input);
                } else if (part.state === 'output-available') {
                  console.log('UI Tool Output:', part.output);
                } else if (part.state === 'output-error') {
                  console.log('UI Tool Error:', part.errorText);
                }
                break;
            }
          });
        }
      }
    };

    processMessageStream().catch(console.error);
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Métricas de Streaming */}
      {isLoading && (
        <div className="bg-blue-50 border-b p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full" />
                Streaming...
              </span>
              <span>Tokens/s: {metrics.tokensPerSecond}</span>
              <span>Total: {tokenCount.current} tokens</span>
            </div>
            <button
              onClick={stop}
              className="px-3 py-1 bg-red-500 text-white rounded text-xs"
            >
              Parar Stream
            </button>
          </div>
        </div>
      )}

      {/* Visualização de Partes do Stream */}
      {streamingParts.length > 0 && (
        <div className="bg-gray-100 p-3 max-h-32 overflow-y-auto">
          <div className="text-xs font-mono space-y-1">
            {streamingParts.slice(-10).map((part, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-gray-500">
                  {new Date(part.timestamp).toLocaleTimeString()}
                </span>
                <span className={`px-1 rounded ${
                  part.type === 'text' ? 'bg-green-100' :
                  part.type === 'tool' ? 'bg-blue-100' :
                  'bg-yellow-100'
                }`}>
                  {part.type}
                </span>
                <span className="truncate flex-1">
                  {part.content || part.name || 'streaming...'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagens */}
      <div className="flex-1 overflow-auto p-4">
        <StreamingMessages messages={messages} isLoading={isLoading} />
      </div>

      {/* Estatísticas após conclusão */}
      {!isLoading && metrics.streamDuration > 0 && (
        <div className="bg-gray-50 border-t p-2 text-xs text-gray-600">
          <div className="flex justify-around">
            <span>Duração: {metrics.streamDuration}ms</span>
            <span>Tokens: {metrics.totalTokens}</span>
            <span>Velocidade: {metrics.tokensPerSecond} t/s</span>
            <span>Tools: {metrics.toolCallCount}</span>
          </div>
        </div>
      )}

      {/* Input */}
      <StreamingInput
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}

// Componente para renderizar mensagens com streaming
function StreamingMessages({
  messages,
  isLoading
}: {
  messages: any[],
  isLoading: boolean
}) {
  return (
    <>
      {messages.map((message, i) => (
        <div
          key={i}
          className={`mb-4 ${
            message.role === 'user' ? 'text-right' : 'text-left'
          }`}
        >
          <div
            className={`inline-block p-3 rounded-lg max-w-2xl ${
              message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-white shadow'
            }`}
          >
            {/* Renderizar partes da mensagem */}
            {message.parts ? (
              <MessageParts parts={message.parts} />
            ) : (
              <div>{message.content}</div>
            )}
          </div>
        </div>
      ))}

      {/* Indicador de digitação com animação */}
      {isLoading && (
        <div className="text-left mb-4">
          <div className="inline-block bg-white shadow p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                     style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                     style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                     style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-gray-500">Assistente digitando...</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Componente para renderizar partes de mensagem
function MessageParts({ parts }: { parts: any[] }) {
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        switch (part.type) {
          case 'text':
            return <div key={i}>{part.text}</div>;

          case 'tool-call':
            return (
              <div key={i} className="bg-gray-100 p-2 rounded text-sm">
                <div className="font-mono text-xs mb-1">
                  🔧 {part.toolName}
                </div>
                {part.state === 'input-streaming' && (
                  <div className="text-gray-600 animate-pulse">
                    Recebendo argumentos...
                  </div>
                )}
                {part.state === 'input-available' && (
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(part.input, null, 2)}
                  </pre>
                )}
                {part.state === 'output-available' && (
                  <div className="mt-1 pt-1 border-t">
                    <div className="text-xs text-gray-500">Resultado:</div>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(part.output, null, 2)}
                    </pre>
                  </div>
                )}
                {part.state === 'output-error' && (
                  <div className="text-red-600 text-xs mt-1">
                    Erro: {part.errorText}
                  </div>
                )}
              </div>
            );

          case 'dynamic-tool':
            return (
              <DynamicToolPart key={i} part={part} />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
```

---

## 6. Structured Output com Streaming {#structured-streaming}

### Streaming de Objetos Estruturados

```typescript
// src/app/api/assistant/structured-stream/route.ts
import { streamObject, Output } from 'ai';
import { z } from 'zod';
import { getAISDKModel } from '@/server/aiProvider';

// Schema complexo para análise
const analysisSchema = z.object({
  summary: z.object({
    title: z.string(),
    description: z.string(),
    confidence: z.number().min(0).max(1)
  }),
  insights: z.array(z.object({
    category: z.enum(['performance', 'quality', 'risk', 'opportunity']),
    finding: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    evidence: z.array(z.string()),
    recommendation: z.string()
  })),
  metrics: z.object({
    score: z.number().min(0).max(100),
    breakdown: z.record(z.string(), z.number()),
    trends: z.array(z.object({
      metric: z.string(),
      direction: z.enum(['up', 'down', 'stable']),
      change: z.number()
    }))
  }),
  nextSteps: z.array(z.object({
    priority: z.number().min(1).max(5),
    action: z.string(),
    deadline: z.string().optional(),
    impact: z.enum(['low', 'medium', 'high'])
  }))
});

export async function POST(req: Request) {
  const { data, analysisType } = await req.json();
  const model = await getAISDKModel();

  const result = await streamObject({
    model,
    schema: analysisSchema,
    schemaName: 'DetailedAnalysis',
    schemaDescription: 'Análise detalhada com insights e métricas',
    system: 'Você é um analista especializado em fornecer insights detalhados.',
    prompt: `Analise os seguintes dados e forneça uma análise completa:
      Tipo: ${analysisType}
      Dados: ${JSON.stringify(data)}

      Inclua insights acionáveis, métricas relevantes e próximos passos prioritizados.`,

    // Configurações de streaming
    mode: 'partial', // Permite objetos parciais durante streaming

    // Callbacks para monitorar progresso
    onFinish: async ({ object, usage, error }) => {
      if (error) {
        console.error('Schema validation failed:', error);
        await logValidationError(error, data);
        return;
      }

      console.log('Analysis completed:', {
        insights: object.insights.length,
        metrics: object.metrics.score,
        usage: usage.totalTokens
      });

      // Salvar análise completa
      await saveAnalysis(object);
    },

    onError: ({ error }) => {
      console.error('Streaming error:', error);
    }
  });

  // Stream parcial para atualizações em tempo real
  const { partialObjectStream } = result;

  // Criar SSE stream customizado
  const encoder = new TextEncoder();
  const customStream = new ReadableStream({
    async start(controller) {
      let partIndex = 0;

      for await (const partialObject of partialObjectStream) {
        // Formatar como SSE
        const event = {
          id: partIndex++,
          type: 'partial',
          data: partialObject,
          timestamp: Date.now()
        };

        const sseData = `id: ${event.id}\n` +
                       `event: ${event.type}\n` +
                       `data: ${JSON.stringify(event.data)}\n\n`;

        controller.enqueue(encoder.encode(sseData));

        // Log de progresso
        if (partialObject.insights?.length) {
          console.log(`Streaming: ${partialObject.insights.length} insights`);
        }
      }

      // Evento final
      const doneEvent = `event: done\ndata: {"complete": true}\n\n`;
      controller.enqueue(encoder.encode(doneEvent));

      controller.close();
    }
  });

  return new Response(customStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Analysis-Type': analysisType
    }
  });
}
```

### Cliente React para Structured Streaming

```typescript
// src/components/StructuredStreamingAnalysis.tsx
'use client';

import { experimental_useObject as useObject } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import { analysisSchema } from '@/schemas/analysis';

export function StructuredStreamingAnalysis() {
  const [partialData, setPartialData] = useState<any>({});
  const [streamProgress, setStreamProgress] = useState(0);

  const {
    object,
    submit,
    isLoading,
    error,
    stop
  } = useObject({
    api: '/api/assistant/structured-stream',
    schema: analysisSchema,

    // Configurações de streaming
    mode: 'partial', // Receber objetos parciais

    // Callbacks
    onFinish: ({ object, error }) => {
      if (error) {
        console.error('Validation error:', error);
        return;
      }

      console.log('Analysis complete:', object);
      setStreamProgress(100);
    },

    onError: (error) => {
      console.error('Stream error:', error);
    },

    // Processar dados parciais
    onData: (data) => {
      setPartialData(data);

      // Calcular progresso baseado em campos preenchidos
      const totalFields = Object.keys(analysisSchema.shape).length;
      const filledFields = Object.keys(data).filter(k => data[k] !== undefined).length;
      const progress = Math.round((filledFields / totalFields) * 100);
      setStreamProgress(progress);
    }
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Análise com Streaming Estruturado</h2>

      {/* Formulário de entrada */}
      <div className="mb-6">
        <button
          onClick={() => submit({
            data: { /* seus dados */ },
            analysisType: 'comprehensive'
          })}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isLoading ? 'Analisando...' : 'Iniciar Análise'}
        </button>

        {isLoading && (
          <button
            onClick={stop}
            className="ml-2 px-4 py-2 bg-red-500 text-white rounded"
          >
            Parar
          </button>
        )}
      </div>

      {/* Barra de progresso */}
      {isLoading && (
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm">Progresso da Análise</span>
            <span className="text-sm">{streamProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${streamProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Visualização em tempo real */}
      {(partialData || object) && (
        <div className="space-y-6">
          {/* Resumo */}
          {(partialData.summary || object?.summary) && (
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-bold mb-2">Resumo</h3>
              <p className="text-lg">{partialData.summary?.title || object?.summary?.title}</p>
              <p className="text-gray-600">
                {partialData.summary?.description || object?.summary?.description}
              </p>
              {(partialData.summary?.confidence || object?.summary?.confidence) && (
                <div className="mt-2">
                  <span className="text-sm">Confiança: </span>
                  <span className="font-bold">
                    {Math.round((partialData.summary?.confidence || object?.summary?.confidence) * 100)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Insights com animação de entrada */}
          {(partialData.insights || object?.insights) && (
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-bold mb-2">
                Insights ({(partialData.insights || object?.insights)?.length || 0})
              </h3>
              <div className="space-y-2">
                {(partialData.insights || object?.insights)?.map((insight: any, i: number) => (
                  <div
                    key={i}
                    className="border-l-4 pl-3 py-2 animate-slideIn"
                    style={{
                      borderColor: getSeverityColor(insight.severity),
                      animationDelay: `${i * 100}ms`
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{insight.finding}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        getSeverityClass(insight.severity)
                      }`}>
                        {insight.severity}
                      </span>
                    </div>
                    {insight.recommendation && (
                      <p className="text-sm text-gray-600 mt-1">
                        💡 {insight.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Métricas com gráficos */}
          {(partialData.metrics || object?.metrics) && (
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-bold mb-2">Métricas</h3>
              <div className="text-3xl font-bold text-center mb-4">
                {partialData.metrics?.score || object?.metrics?.score}
                <span className="text-lg text-gray-600">/100</span>
              </div>

              {/* Breakdown */}
              {(partialData.metrics?.breakdown || object?.metrics?.breakdown) && (
                <div className="space-y-2">
                  {Object.entries(partialData.metrics?.breakdown || object?.metrics?.breakdown).map(
                    ([key, value]) => (
                      <div key={key} className="flex items-center">
                        <span className="text-sm w-32">{key}:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-green-500 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className="ml-2 text-sm">{value}%</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Próximos passos */}
          {(partialData.nextSteps || object?.nextSteps) && (
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-bold mb-2">Próximos Passos</h3>
              <div className="space-y-2">
                {(partialData.nextSteps || object?.nextSteps)
                  ?.sort((a: any, b: any) => a.priority - b.priority)
                  .map((step: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`text-sm px-2 py-1 rounded ${
                        getPriorityClass(step.priority)
                      }`}>
                        P{step.priority}
                      </span>
                      <div className="flex-1">
                        <p>{step.action}</p>
                        {step.deadline && (
                          <p className="text-xs text-gray-600 mt-1">
                            📅 {step.deadline}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs ${getImpactClass(step.impact)}`}>
                        {step.impact} impact
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          Erro: {error.message}
        </div>
      )}
    </div>
  );
}

// Funções auxiliares para estilos
function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'high': return '#f59e0b';
    case 'medium': return '#3b82f6';
    case 'low': return '#10b981';
    default: return '#6b7280';
  }
}

function getSeverityClass(severity: string) {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-700';
    case 'high': return 'bg-orange-100 text-orange-700';
    case 'medium': return 'bg-blue-100 text-blue-700';
    case 'low': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getPriorityClass(priority: number) {
  if (priority <= 1) return 'bg-red-500 text-white';
  if (priority <= 2) return 'bg-orange-500 text-white';
  if (priority <= 3) return 'bg-yellow-500 text-black';
  return 'bg-gray-400 text-white';
}

function getImpactClass(impact: string) {
  switch (impact) {
    case 'high': return 'text-red-600 font-bold';
    case 'medium': return 'text-orange-600';
    case 'low': return 'text-gray-600';
    default: return 'text-gray-400';
  }
}
```

---

## 7. Exemplos Completos {#exemplos-completos}

### Sistema Completo de Chat com Streaming

```typescript
// src/app/api/chat/complete/route.ts
import { streamText, convertToModelMessages } from 'ai';
import { getAISDKModel } from '@/server/aiProvider';
import { taskTools } from '@/services/ai/tools';
import { StreamEventManager } from '@/services/streaming/event-manager';
import { SSETransformer } from '@/services/streaming/sse-transformer';

export async function POST(req: Request) {
  // Abort controller para cancelamento
  const abortController = new AbortController();

  // Event manager para métricas
  const eventManager = new StreamEventManager();
  eventManager.setupHandlers();

  // SSE transformer
  const sseTransformer = new SSETransformer();

  try {
    const { messages, options = {} } = await req.json();

    // Converter mensagens para formato do modelo
    const modelMessages = convertToModelMessages(messages);

    // Obter modelo
    const model = await getAISDKModel();

    // Configuração completa
    const result = await streamText({
      model,
      messages: modelMessages,
      tools: taskTools,
      abortSignal: abortController.signal,

      // Sistema
      system: `Você é um assistente útil com capacidade de streaming.
               Forneça respostas claras e use ferramentas quando apropriado.`,

      // Parâmetros
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2000,

      // Callbacks detalhados
      onStart: async () => {
        eventManager.emit('stream:start', {
          timestamp: Date.now(),
          messages: messages.length
        });
      },

      onToken: async (token) => {
        eventManager.emit('stream:token', { token });
      },

      onText: async (text) => {
        eventManager.emit('stream:text', {
          length: text.length,
          preview: text.substring(0, 100)
        });
      },

      onToolCall: async ({ toolCall }) => {
        eventManager.emit('stream:tool', {
          id: toolCall.toolCallId,
          name: toolCall.toolName,
          args: toolCall.args
        });
      },

      onStepFinish: async ({ usage, finishReason, stepIndex }) => {
        eventManager.emit('stream:step', {
          index: stepIndex,
          reason: finishReason,
          tokens: usage.totalTokens
        });
      },

      onFinish: async ({ text, usage, steps }) => {
        const metrics = eventManager.getMetrics();

        eventManager.emit('stream:end', {
          totalTokens: usage.totalTokens,
          steps: steps.length,
          duration: Date.now() - metrics.startTime
        });

        // Salvar conversa
        await saveChat({
          messages: modelMessages,
          response: text,
          usage,
          steps,
          metrics
        });
      },

      onError: async (error) => {
        eventManager.emit('stream:error', error);

        // Log detalhado
        console.error('Stream error:', {
          error: error.message,
          stack: error.stack,
          metrics: eventManager.getMetrics()
        });
      },

      onAbort: async ({ steps }) => {
        eventManager.emit('stream:abort', {
          stepsCompleted: steps.length
        });

        // Salvar parcial
        await savePartialChat({
          messages: modelMessages,
          steps,
          aborted: true
        });
      }
    });

    // Pipeline de transformações
    const pipeline = result.fullStream
      .pipeThrough(sseTransformer.createTransformStream())
      .pipeThrough(new CompressionStream('gzip')); // Compressão opcional

    return new Response(pipeline, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Content-Encoding': 'gzip',
        'X-Stream-Id': generateStreamId(),
        'X-Accel-Buffering': 'no' // Para Nginx
      }
    });

  } catch (error) {
    console.error('Chat error:', error);

    // Enviar erro como SSE
    const errorEvent = `event: error\ndata: ${JSON.stringify({
      error: error.message,
      timestamp: Date.now()
    })}\n\n`;

    return new Response(errorEvent, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream'
      }
    });
  }
}
```

---

## Conclusão

Este guia completo fornece toda a implementação necessária para streaming e eventos no AI SDK v5:

- ✅ **SSE Implementation** com transformers customizados
- ✅ **Streaming avançado** com métricas e controle fino
- ✅ **Sistema de eventos** completo com callbacks
- ✅ **UI Components** otimizados para streaming
- ✅ **Structured streaming** com objetos parciais
- ✅ **Exemplos práticos** prontos para produção

O sistema de streaming permite experiências em tempo real com feedback visual instantâneo, métricas detalhadas e controle total sobre o fluxo de dados.