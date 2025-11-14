# Voice Agent Design Document
**Feature**: Agente de Voz com Google Gemini Live API
**Status**: Em Planejamento
**Data**: 2025-11-14
**Versão**: 1.0

---

## 📋 Visão Geral

Implementação de um agente de voz interativo usando a nova API Google Gemini Multimodal Live, que permite conversação em tempo real com o sistema Zenith Tasks por voz, com capacidade de executar todas as funcionalidades da aplicação através de comandos naturais.

### Objetivos

1. **Ativação Simples**: Clicar no botão AI existente ativa o agente sem abrir modais
2. **Feedback Visual**: Esfera (SiriOrb) anima-se para indicar estado ativo e escuta
3. **Interação Natural**: Conversa por voz em tempo real com latência sub-segundo
4. **Funcionalidade Completa**: Acesso a todas as 27 ferramentas existentes do sistema
5. **Experiência Fluida**: Sem interrupções, com suporte a pausas e retomadas naturais

---

## 🏗️ Arquitetura Técnica

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Client)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐        ┌──────────────────────────────┐   │
│  │ MorphSurface │◄──────►│  VoiceAgentProvider          │   │
│  │  (Botão AI)  │        │  - Estado global             │   │
│  └──────────────┘        │  - WebSocket connection      │   │
│                          │  - Audio streaming           │   │
│  ┌──────────────┐        │  - Tool execution callbacks  │   │
│  │   SiriOrb    │        └──────────────────────────────┘   │
│  │  (Feedback)  │                      │                     │
│  └──────────────┘                      │                     │
│                                        ▼                     │
│                          ┌──────────────────────────────┐   │
│                          │  useVoiceAgent Hook          │   │
│                          │  - connect()                 │   │
│                          │  - disconnect()              │   │
│                          │  - sendAudio()               │   │
│                          │  - executeTools()            │   │
│                          └──────────────────────────────┘   │
│                                        │                     │
└────────────────────────────────────────┼─────────────────────┘
                                         │
                                   WebSocket
                                         │
┌────────────────────────────────────────┼─────────────────────┐
│                     BACKEND (API)      ▼                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/voice/live (WebSocket Handler)                 │   │
│  │  - Authenticação                                      │   │
│  │  - Proxy para Gemini Live API                        │   │
│  │  - Tool execution orchestration                       │   │
│  │  - Session management                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GeminiLiveClient (Service Layer)                    │   │
│  │  - WebSocket connection to Gemini                    │   │
│  │  - Audio encoding/decoding                           │   │
│  │  - Function calling registry                         │   │
│  │  - Error handling & reconnection                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTPS/WSS
                                 ▼
                    Google Gemini Live API
                 (wss://generativelanguage.googleapis.com/...)
```

---

## 🔧 Implementação Detalhada

### 1. Backend - WebSocket Handler

**Arquivo**: `src/app/api/voice/live/route.ts`

```typescript
// WebSocket route handler para proxy com Gemini Live API
import { Server } from 'ws';
import { GeminiLiveClient } from '@/services/voice/gemini-live-client';
import { getAllTools } from '@/server/ai/tools';

export async function GET(req: Request) {
  // Upgrade HTTP to WebSocket
  const upgrade = req.headers.get('upgrade');

  if (upgrade !== 'websocket') {
    return new Response('Expected websocket', { status: 426 });
  }

  // Autenticação
  const userId = getUserIdFromRequest(req); // Clerk ou bypass

  // Criar cliente Gemini Live
  const geminiClient = new GeminiLiveClient({
    apiKey: process.env.GEMINI_API_KEY!,
    model: 'gemini-2.0-flash-exp',
    tools: getAllTools(),
    userId
  });

  // Estabelecer conexão bidirecional
  await geminiClient.connect();

  // Proxy mensagens entre cliente web e Gemini
  // Executar tools quando solicitado
  // Retornar respostas de áudio
}
```

**Responsabilidades**:
- Autenticação de usuário
- Gerenciamento de sessão WebSocket
- Proxy de mensagens entre frontend e Gemini
- Execução de ferramentas (tools) quando invocadas
- Tratamento de erros e reconexão

---

### 2. Service Layer - Gemini Live Client

**Arquivo**: `src/services/voice/gemini-live-client.ts`

```typescript
import { WebSocket } from 'ws';
import type { ToolDefinition } from '@/server/ai/tools';

export interface GeminiLiveConfig {
  apiKey: string;
  model: string;
  tools: Record<string, ToolDefinition>;
  userId: string;
  systemInstruction?: string;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private config: GeminiLiveConfig;
  private sessionId: string | null = null;

  constructor(config: GeminiLiveConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const wsUrl = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      this.sendSetupMessage();
    });

    this.ws.on('message', (data) => {
      this.handleGeminiMessage(data);
    });

    this.ws.on('error', (error) => {
      this.handleError(error);
    });
  }

  private sendSetupMessage(): void {
    // Configuração inicial da sessão
    const setupMessage = {
      setup: {
        model: this.config.model,
        generation_config: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: 'Kore' // Voz em português
              }
            }
          }
        },
        system_instruction: {
          parts: [{
            text: this.buildSystemPrompt()
          }]
        },
        tools: this.convertToolsToGeminiFormat()
      }
    };

    this.ws?.send(JSON.stringify(setupMessage));
  }

  private buildSystemPrompt(): string {
    return `Você é um assistente de voz para o Zenith Tasks, um aplicativo de gerenciamento de tarefas e produtividade.

Você pode:
- Criar, editar e remover tarefas, notas, ideias, lembretes, reuniões e itens financeiros
- Buscar e listar itens usando filtros diversos
- Gerenciar agenda e calendário
- Adicionar e gerenciar subtarefas
- Trabalhar com assinaturas e pagamentos recorrentes
- Gerar resumos de reuniões
- Fornecer estatísticas de produtividade

Sempre seja natural, objetivo e confirme ações importantes antes de executá-las.
Use português brasileiro em todas as interações.`;
  }

  private convertToolsToGeminiFormat() {
    // Converter ferramentas do formato AI SDK para formato Gemini
    const tools = this.config.tools;

    return {
      function_declarations: Object.entries(tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        parameters: this.zodToJsonSchema(tool.parameters)
      }))
    };
  }

  async sendAudio(audioData: ArrayBuffer): Promise<void> {
    const message = {
      realtime_input: {
        media_chunks: [{
          mime_type: 'audio/pcm',
          data: Buffer.from(audioData).toString('base64')
        }]
      }
    };

    this.ws?.send(JSON.stringify(message));
  }

  private async handleGeminiMessage(data: any): Promise<void> {
    const message = JSON.parse(data.toString());

    // Tipos de mensagem:
    // 1. setupComplete - Confirmação de setup
    // 2. serverContent - Resposta de áudio
    // 3. toolCall - Solicitação de execução de ferramenta
    // 4. toolCallCancellation - Cancelamento de tool call

    if (message.toolCall) {
      await this.executeToolCall(message.toolCall);
    }

    if (message.serverContent) {
      this.emitAudioResponse(message.serverContent);
    }
  }

  private async executeToolCall(toolCall: any): Promise<void> {
    const { name, args, id } = toolCall.functionCalls[0];

    try {
      // Executar ferramenta através do ToolRegistry
      const tool = this.config.tools[name];
      const result = await tool.execute(args);

      // Enviar resultado de volta para Gemini
      const responseMessage = {
        tool_response: {
          function_responses: [{
            id,
            name,
            response: result
          }]
        }
      };

      this.ws?.send(JSON.stringify(responseMessage));
    } catch (error) {
      // Enviar erro para Gemini
      this.sendToolError(id, name, error);
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.sessionId = null;
  }
}
```

**Funcionalidades**:
- Conexão WebSocket com Gemini Live API
- Codificação/decodificação de áudio (PCM 16-bit, 24kHz)
- Registro de ferramentas no formato Gemini
- Execução de tool calls
- Streaming bidirecional de áudio
- Gerenciamento de sessão

---

### 3. Frontend - Voice Agent Provider

**Arquivo**: `src/contexts/VoiceAgentContext.tsx`

```typescript
'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface VoiceAgentState {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  error: string | null;
}

interface VoiceAgentContextValue {
  state: VoiceAgentState;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (text: string) => Promise<void>;
}

const VoiceAgentContext = createContext<VoiceAgentContextValue | null>(null);

export function VoiceAgentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VoiceAgentState>({
    isActive: false,
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    error: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const connect = useCallback(async () => {
    try {
      // 1. Solicitar permissão de microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      mediaStreamRef.current = stream;

      // 2. Criar AudioContext para processar áudio
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // 3. Conectar ao WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/voice/live`);

      ws.onopen = () => {
        setState(prev => ({ ...prev, isActive: true, isListening: true }));
        startAudioCapture();
      };

      ws.onmessage = (event) => {
        handleServerMessage(event.data);
      };

      ws.onerror = (error) => {
        setState(prev => ({ ...prev, error: 'Erro na conexão' }));
      };

      ws.onclose = () => {
        setState(prev => ({
          ...prev,
          isActive: false,
          isListening: false,
          isSpeaking: false
        }));
        cleanup();
      };

      wsRef.current = ws;

    } catch (error) {
      console.error('Erro ao conectar agente de voz:', error);
      setState(prev => ({
        ...prev,
        error: 'Não foi possível acessar o microfone'
      }));
    }
  }, []);

  const startAudioCapture = useCallback(() => {
    if (!audioContextRef.current || !mediaStreamRef.current) return;

    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);

      // Converter Float32Array para Int16Array (PCM 16-bit)
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Enviar para WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(pcm16.buffer);
      }
    };

    source.connect(processor);
    processor.connect(audioContextRef.current.destination);
  }, []);

  const handleServerMessage = useCallback((data: any) => {
    try {
      const message = JSON.parse(data);

      // Mensagem de áudio do Gemini
      if (message.audio) {
        playAudioResponse(message.audio);
      }

      // Atualização de estado
      if (message.state) {
        setState(prev => ({ ...prev, ...message.state }));
      }

      // Resultado de tool execution
      if (message.toolResult) {
        // Feedback visual ou toast de confirmação
        console.log('Tool executado:', message.toolResult);
      }

    } catch (error) {
      console.error('Erro ao processar mensagem do servidor:', error);
    }
  }, []);

  const playAudioResponse = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current) return;

    setState(prev => ({ ...prev, isSpeaking: true, isListening: false }));

    try {
      // Decodificar base64 para ArrayBuffer
      const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));

      // Decodificar e reproduzir áudio
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        setState(prev => ({ ...prev, isSpeaking: false, isListening: true }));
      };

      source.start();

    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
      setState(prev => ({ ...prev, isSpeaking: false, isListening: true }));
    }
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    cleanup();
  }, []);

  const cleanup = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();

    mediaStreamRef.current = null;
    audioContextRef.current = null;
    wsRef.current = null;
  }, []);

  const value: VoiceAgentContextValue = {
    state,
    connect,
    disconnect,
    sendMessage: async (text: string) => {
      // Implementação futura para mensagens de texto
    }
  };

  return (
    <VoiceAgentContext.Provider value={value}>
      {children}
    </VoiceAgentContext.Provider>
  );
}

export function useVoiceAgent() {
  const context = useContext(VoiceAgentContext);
  if (!context) {
    throw new Error('useVoiceAgent deve ser usado dentro de VoiceAgentProvider');
  }
  return context;
}
```

---

### 4. Frontend - MorphSurface Component (Atualizado)

**Arquivo**: `src/components/ui/AiInput.tsx`

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import SiriOrb from '@/components/ui/SiriOrb';
import { useVoiceAgent } from '@/contexts/VoiceAgentContext';
import { MicIcon, MicOffIcon } from '@/components/Icons';

interface MorphSurfaceProps {
  placeholder?: string;
}

export function MorphSurface({ placeholder }: MorphSurfaceProps) {
  const { state, connect, disconnect } = useVoiceAgent();

  const handleClick = async () => {
    if (state.isActive) {
      disconnect();
    } else {
      await connect();
    }
  };

  return (
    <motion.div
      className="bg-neutral-950 border border-neutral-800 rounded-full overflow-hidden shadow-lg shadow-black/20"
      animate={{
        scale: state.isActive ? 1.02 : 1,
        borderColor: state.isActive ? 'rgb(139, 92, 246)' : 'rgb(38, 38, 38)'
      }}
      transition={{ duration: 0.3 }}
    >
      <footer className="mt-auto flex h-[44px] items-center justify-center whitespace-nowrap select-none">
        <div className="flex items-center justify-center gap-2 px-3 max-sm:h-10 max-sm:px-2">
          <div className="flex w-fit items-center gap-2">
            <SiriOrb
              size="24px"
              isActive={state.isActive}
              isListening={state.isListening}
              isSpeaking={state.isSpeaking}
            />
          </div>

          <Button
            type="button"
            onClick={handleClick}
            className="flex h-fit flex-1 justify-center rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-neutral-400 bg-neutral-900/60 hover:bg-neutral-800/80 transition-colors min-w-[50px] sm:min-w-[60px]"
            variant="ghost"
            title={state.isActive ? 'Desativar assistente de voz' : 'Ativar assistente de voz'}
          >
            <AnimatePresence mode="wait">
              {state.isActive ? (
                <motion.div
                  key="active"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <MicIcon className="w-4 h-4" />
                  <span className="font-semibold text-sm sm:text-base text-purple-400">
                    {state.isListening ? 'Ouvindo...' : state.isSpeaking ? 'Falando...' : 'Ativo'}
                  </span>
                </motion.div>
              ) : (
                <motion.span
                  key="inactive"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-semibold text-sm sm:text-base"
                >
                  AI
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </footer>

      {/* Status indicator (erro) */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg"
          >
            {state.error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

---

### 5. Frontend - SiriOrb Component (Atualizado)

**Arquivo**: `src/components/ui/SiriOrb.tsx`

```typescript
'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface SiriOrbProps {
  size?: string;
  isActive?: boolean;
  isListening?: boolean;
  isSpeaking?: boolean;
}

const SiriOrb: React.FC<SiriOrbProps> = ({
  size = '24px',
  isActive = false,
  isListening = false,
  isSpeaking = false
}) => {
  // Estados de animação
  const getAnimationState = () => {
    if (isSpeaking) {
      return {
        scale: [1, 1.3, 1.1, 1.4, 1],
        opacity: [0.8, 1, 0.9, 1, 0.8],
        transition: {
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut'
        }
      };
    }

    if (isListening) {
      return {
        scale: [1, 1.15, 1],
        opacity: [0.7, 1, 0.7],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }
      };
    }

    if (isActive) {
      return {
        scale: [1, 1.1, 1],
        opacity: [0.6, 0.8, 0.6],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }
      };
    }

    return {
      scale: 1,
      opacity: 0.6,
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    };
  };

  const gradientColors = isSpeaking
    ? 'from-green-500 via-emerald-500 to-teal-500'
    : isListening
    ? 'from-purple-500 via-violet-500 to-fuchsia-500'
    : 'from-purple-500 via-blue-500 to-pink-500';

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Glow effect */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-r ${gradientColors} blur-md opacity-60`}
        style={{
          animation: isActive ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
        }}
      />

      {/* Main orb */}
      <motion.div
        className={`relative rounded-full bg-gradient-to-r ${gradientColors}`}
        style={{ width: size, height: size }}
        animate={getAnimationState()}
      />

      {/* Sound waves (quando falando) */}
      {isSpeaking && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-green-400/40"
            animate={{
              scale: [1, 1.5, 2],
              opacity: [0.6, 0.3, 0]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut'
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-green-400/40"
            animate={{
              scale: [1, 1.5, 2],
              opacity: [0.6, 0.3, 0]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
              delay: 0.5
            }}
          />
        </>
      )}
    </div>
  );
};

export default SiriOrb;
```

---

## 🛠️ Ferramentas Expostas ao Agente

Todas as 27 ferramentas existentes serão expostas ao agente de voz:

### Gerenciamento de Itens
1. `createItem` - Criar tarefa/nota/ideia/lembrete/reunião/financeiro
2. `updateItem` - Atualizar item existente
3. `deleteItem` - Remover item
4. `markAsDone` - Marcar como concluído
5. `setDueDate` - Definir prazo

### Busca e Consulta
6. `searchItems` - Buscar itens por texto/filtros
7. `listItems` - Listar todos os itens
8. `getItemDetails` - Obter detalhes completos

### Agenda e Calendário
9. `listAgenda` - Ver agenda (hoje, semana, mês)

### Subtarefas
10. `generateSubtasks` - Gerar subtarefas com IA
11. `addSubtask` - Adicionar subtarefa manual
12. `toggleSubtask` - Marcar subtarefa

### Análise
13. `analyzeInbox` - Analisar texto livre
14. `getStatistics` - Estatísticas de produtividade

### Financeiro
15. `getFinancialSummary` - Resumo financeiro
16. `addSubscription` - Adicionar assinatura/pagamento recorrente
17. `listSubscriptions` - Listar assinaturas

### Reuniões
18. `summarizeMeeting` - Resumir reunião

### Chat Contextual
19. `chatWithItem` - Conversar sobre item específico

---

## 🎨 Fluxo de Uso

### Cenário 1: Criar Tarefa por Voz

1. **Usuário**: Clica no botão AI
2. **Sistema**:
   - Solicita permissão de microfone
   - Conecta ao WebSocket
   - SiriOrb anima em roxo (listening)
3. **Usuário**: "Cria uma tarefa para comprar leite amanhã às 10h"
4. **Sistema**:
   - Envia áudio para Gemini Live API
   - SiriOrb anima em verde (speaking)
   - Gemini responde por voz: "Ok, criando tarefa..."
   - Gemini chama tool `createItem`
5. **Backend**: Executa `createItem` e retorna resultado
6. **Sistema**:
   - Gemini confirma: "Tarefa criada com sucesso!"
   - SiriOrb volta para roxo (listening)

### Cenário 2: Consultar Agenda

1. **Usuário**: "Quais são minhas tarefas para hoje?"
2. **Sistema**:
   - Gemini chama tool `listAgenda` com `rangeDays: 1`
3. **Backend**: Retorna lista de tarefas do dia
4. **Sistema**:
   - Gemini responde: "Você tem 3 tarefas para hoje: Comprar leite às 10h, Reunião com cliente às 14h, e Revisar relatório às 17h"

### Cenário 3: Adicionar Assinatura

1. **Usuário**: "Adiciona uma assinatura do Netflix de R$ 49,90 todo dia 15"
2. **Sistema**:
   - Gemini chama tool `addSubscription`
3. **Backend**: Cria item financeiro recorrente
4. **Sistema**:
   - Gemini confirma: "Assinatura Netflix adicionada no valor de R$ 49,90 com vencimento todo dia 15"

---

## 📝 Variáveis de Ambiente

Adicionar ao `.env.local`:

```bash
# Google Gemini API
GEMINI_API_KEY=your_api_key_here

# Voice Agent Configuration
VOICE_AGENT_MODEL=gemini-2.0-flash-exp
VOICE_AGENT_VOICE=Kore  # Voz em português
VOICE_AGENT_MAX_TOKENS=2048
```

---

## 🔒 Segurança e Privacidade

1. **Autenticação**: Apenas usuários autenticados podem usar o agente
2. **Rate Limiting**: Limitar número de sessões por usuário
3. **Audio Processing**: Todo áudio processado server-side, sem armazenamento
4. **Tool Execution**: Validação de permissões antes de executar ferramentas
5. **Session Timeout**: Desconectar após inatividade (5 minutos)
6. **Error Handling**: Não expor detalhes técnicos ao usuário

---

## 📊 Métricas e Monitoramento

Rastrear:
- Número de sessões de voz por dia
- Duração média das sessões
- Ferramentas mais usadas por voz
- Taxa de sucesso de tool calls
- Latência de resposta
- Erros e reconexões

---

## 🚀 Roadmap de Implementação

### Fase 1: Foundation (1-2 dias)
- [ ] Configurar variáveis de ambiente
- [ ] Criar `GeminiLiveClient` service
- [ ] Implementar WebSocket handler `/api/voice/live`
- [ ] Testar conexão básica com Gemini Live API

### Fase 2: Frontend Integration (1-2 dias)
- [ ] Criar `VoiceAgentProvider` context
- [ ] Implementar captura de áudio do microfone
- [ ] Implementar reprodução de áudio
- [ ] Atualizar componentes `MorphSurface` e `SiriOrb`
- [ ] Adicionar provider ao `App.tsx`

### Fase 3: Tool Integration (2-3 dias)
- [ ] Converter ferramentas para formato Gemini
- [ ] Implementar execução de tool calls no backend
- [ ] Criar sistema de callback para tools no frontend
- [ ] Testar cada ferramenta individualmente

### Fase 4: UX Polish (1 dia)
- [ ] Animações de estado do SiriOrb
- [ ] Feedback visual de tool execution
- [ ] Tratamento de erros com mensagens amigáveis
- [ ] Toast notifications para confirmações

### Fase 5: Testing & Documentation (1 dia)
- [ ] Testes end-to-end de fluxos principais
- [ ] Documentação de uso
- [ ] Documentação técnica
- [ ] Guia de troubleshooting

---

## 🧪 Casos de Teste

1. ✅ Conexão básica e desconexão
2. ✅ Criar tarefa simples por voz
3. ✅ Criar tarefa com data e hora
4. ✅ Buscar tarefas por filtros
5. ✅ Listar agenda do dia
6. ✅ Adicionar assinatura recorrente
7. ✅ Gerar subtarefas para uma tarefa
8. ✅ Marcar tarefa como concluída
9. ✅ Resumo financeiro
10. ✅ Tratamento de erro (microfone negado)
11. ✅ Tratamento de erro (conexão perdida)
12. ✅ Reconexão automática

---

## 📚 Referências

- [Google Gemini Live API Docs](https://ai.google.dev/gemini-api/docs/live)
- [Gemini Live Web Console (GitHub)](https://github.com/google-gemini/live-api-web-console)
- [WebSocket API Reference](https://ai.google.dev/api/live)
- [Audio Processing Web APIs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

## ✅ Critérios de Sucesso

1. ✅ Usuário pode ativar/desativar agente com 1 clique
2. ✅ Feedback visual claro do estado (inactive/listening/speaking)
3. ✅ Latência < 1 segundo entre pergunta e resposta
4. ✅ 100% das ferramentas acessíveis por voz
5. ✅ Comandos naturais em português funcionam corretamente
6. ✅ Erros tratados gracefully sem crashes
7. ✅ Confirmação de ações importantes (deletar, etc)
8. ✅ Experiência fluida sem interrupções perceptíveis

---

**Próximos Passos**: Começar implementação pela Fase 1 (Foundation)
