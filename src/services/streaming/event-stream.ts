// Event streaming service for AI responses

export interface StreamEvent {
  type: 'start' | 'text' | 'tool_call' | 'tool_result' | 'error' | 'finish' | 'metadata';
  data?: any;
  timestamp: number;
}

export interface StreamingOptions {
  onStart?: () => void;
  onText?: (text: string) => void;
  onToolCall?: (toolName: string, args: any) => void;
  onToolResult?: (toolName: string, result: any) => void;
  onError?: (error: Error) => void;
  onFinish?: (text: string, usage: any) => void;
  onMetadata?: (metadata: any) => void;
}

export class EventStreamManager {
  private static instance: EventStreamManager;
  private activeStreams: Map<string, AbortController> = new Map();

  private constructor() {}

  static getInstance(): EventStreamManager {
    if (!this.instance) {
      this.instance = new EventStreamManager();
    }
    return this.instance;
  }

  // Criar um novo stream de eventos
  createEventStream(streamId: string): {
    stream: TransformStream<StreamEvent, string>;
    writer: WritableStreamDefaultWriter<StreamEvent>;
  } {
    // Cancelar stream existente se houver
    this.cancelStream(streamId);

    // Criar novo AbortController
    const abortController = new AbortController();
    this.activeStreams.set(streamId, abortController);

    // Criar TransformStream para converter eventos em SSE
    const stream = new TransformStream<StreamEvent, string>({
      transform(event, controller) {
        const sseEvent = EventStreamManager.formatSSE(event);
        controller.enqueue(sseEvent);
      },
    });

    const writer = stream.writable.getWriter();

    // Registrar cleanup quando o stream for cancelado
    abortController.signal.addEventListener('abort', () => {
      writer.close().catch(console.error);
      this.activeStreams.delete(streamId);
    });

    return { stream, writer };
  }

  // Formatar evento como Server-Sent Event
  private static formatSSE(event: StreamEvent): string {
    const lines = [
      `event: ${event.type}`,
      `data: ${JSON.stringify(event.data || {})}`,
      `id: ${event.timestamp}`,
      '', // Linha em branco para separar eventos
    ];
    return lines.join('\n') + '\n';
  }

  // Cancelar um stream específico
  cancelStream(streamId: string) {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
    }
  }

  // Cancelar todos os streams
  cancelAllStreams() {
    for (const controller of this.activeStreams.values()) {
      controller.abort();
    }
    this.activeStreams.clear();
  }

  // Obter número de streams ativos
  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  // Verificar se um stream está ativo
  isStreamActive(streamId: string): boolean {
    return this.activeStreams.has(streamId);
  }
}

// Helper para criar response SSE
export function createSSEResponse(stream: ReadableStream<string>): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Desabilitar buffering no nginx
    },
  });
}

// Wrapper para streaming com callbacks
export class StreamingWrapper {
  private writer: WritableStreamDefaultWriter<StreamEvent> | null = null;
  private options: StreamingOptions;
  private startTime: number;

  constructor(options: StreamingOptions = {}) {
    this.options = options;
    this.startTime = Date.now();
  }

  setWriter(writer: WritableStreamDefaultWriter<StreamEvent>) {
    this.writer = writer;
  }

  async emitStart() {
    if (this.writer) {
      await this.writer.write({
        type: 'start',
        timestamp: Date.now(),
        data: { startTime: this.startTime },
      });
    }
    this.options.onStart?.();
  }

  async emitText(text: string, delta: boolean = false) {
    if (this.writer) {
      await this.writer.write({
        type: 'text',
        timestamp: Date.now(),
        data: { text, delta },
      });
    }
    this.options.onText?.(text);
  }

  async emitToolCall(toolName: string, args: any) {
    if (this.writer) {
      await this.writer.write({
        type: 'tool_call',
        timestamp: Date.now(),
        data: { toolName, args },
      });
    }
    this.options.onToolCall?.(toolName, args);
  }

  async emitToolResult(toolName: string, result: any) {
    if (this.writer) {
      await this.writer.write({
        type: 'tool_result',
        timestamp: Date.now(),
        data: { toolName, result },
      });
    }
    this.options.onToolResult?.(toolName, result);
  }

  async emitError(error: Error) {
    if (this.writer) {
      await this.writer.write({
        type: 'error',
        timestamp: Date.now(),
        data: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
      });
    }
    this.options.onError?.(error);
  }

  async emitMetadata(metadata: any) {
    if (this.writer) {
      await this.writer.write({
        type: 'metadata',
        timestamp: Date.now(),
        data: metadata,
      });
    }
    this.options.onMetadata?.(metadata);
  }

  async emitFinish(text: string, usage: any) {
    const duration = Date.now() - this.startTime;

    if (this.writer) {
      await this.writer.write({
        type: 'finish',
        timestamp: Date.now(),
        data: { text, usage, duration },
      });

      // Fechar o writer
      await this.writer.close();
    }

    this.options.onFinish?.(text, usage);
  }
}

// Função helper para processar stream de texto do AI SDK
export async function processAIStream(
  aiStream: ReadableStream,
  wrapper: StreamingWrapper
): Promise<void> {
  const reader = aiStream.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  try {
    await wrapper.emitStart();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;

      await wrapper.emitText(chunk, true);
    }

    await wrapper.emitFinish(fullText, {});
  } catch (error) {
    await wrapper.emitError(error as Error);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

// Função para criar um stream de teste
export function createTestStream(): ReadableStream<string> {
  let interval: NodeJS.Timeout;
  let count = 0;
  const messages = [
    'Olá! ',
    'Como posso ',
    'ajudar você ',
    'hoje?',
  ];

  return new ReadableStream({
    start(controller) {
      interval = setInterval(() => {
        if (count < messages.length) {
          const event: StreamEvent = {
            type: 'text',
            data: { text: messages[count], delta: true },
            timestamp: Date.now(),
          };
          controller.enqueue(EventStreamManager['formatSSE'](event));
          count++;
        } else {
          const finishEvent: StreamEvent = {
            type: 'finish',
            data: { text: messages.join(''), usage: { tokens: 10 } },
            timestamp: Date.now(),
          };
          controller.enqueue(EventStreamManager['formatSSE'](finishEvent));
          clearInterval(interval);
          controller.close();
        }
      }, 500);
    },
    cancel() {
      clearInterval(interval);
    },
  });
}