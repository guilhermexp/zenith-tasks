# 🔄 Troca de Modelos AI em Tempo Real

Este documento explica como usar a funcionalidade de troca de modelos AI durante conversas.

## 📋 Índice

- [Modelos Disponíveis](#modelos-disponíveis)
- [Como Funciona](#como-funciona)
- [Uso no Backend](#uso-no-backend)
- [Uso no Frontend](#uso-no-frontend)
- [Exemplos Práticos](#exemplos-práticos)

## 🤖 Modelos Disponíveis

| Provider | Modelo | ID | Especialidade | Context Window |
|----------|--------|----|--------------  |----------------|
| **Google** | Gemini 2.5 Pro | `google/gemini-2.5-pro` | Geral, visão | 2M tokens |
| **XAI** | Grok 2 | `xai/grok-2-1212` | Conversas naturais | 131K tokens |
| **ZAI** | GLM-4.6 | `zai/glm-4.6` | Código, agentes | 200K tokens |
| **OpenAI** | GPT-4o | `openai/gpt-4o` | Versátil | 128K tokens |
| **Anthropic** | Claude 3.5 Sonnet | `anthropic/claude-3-5-sonnet-20241022` | Análise profunda | 200K tokens |

## ⚙️ Configuração

### Variáveis de Ambiente

Adicione as credenciais no `.env.local`:

```bash
# Provider principal (padrão para toda aplicação)
AI_SDK_PROVIDER=google

# Google (Gemini)
GEMINI_API_KEY=your_gemini_key

# XAI (Grok)
XAI_API_KEY=your_xai_key
XAI_MODEL=grok-2-1212

# ZAI (GLM)
ZAI_API_KEY=your_zai_key
ZAI_MODEL=glm-4.6

# OpenAI
OPENAI_API_KEY=your_openai_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_key
```

## 🔧 Como Funciona

### 1. Arquitetura

```
Cliente → API Endpoint → ChatService → AIProvider → Modelo AI
                ↓
        { provider, model }
```

### 2. Fluxo de Troca

1. **Usuário seleciona modelo** no UI (ModelSelector)
2. **Cliente envia parâmetros** `provider` e `model` na requisição
3. **ChatService** detecta parâmetros e passa para AIProvider
4. **AIProvider** carrega o modelo solicitado
5. **Histórico é mantido** entre trocas de modelo

## 💻 Uso no Backend

### ChatService (Server-Side)

```typescript
import { ChatService } from '@/server/ai/chat-service';

const chatService = ChatService.getInstance();

// Usar modelo padrão
const result = await chatService.chat('Olá!', {
  history: chatHistory,
  userId: 'user-123'
});

// Trocar para Grok
const result = await chatService.chat('Continue...', {
  history: chatHistory,
  userId: 'user-123',
  provider: 'xai',
  model: 'grok-2-1212'
});

// Trocar para GLM-4.6 (especialista em código)
const result = await chatService.chat('Escreva código...', {
  history: chatHistory,
  userId: 'user-123',
  provider: 'zai',
  model: 'glm-4.6'
});
```

### AIProvider (Direto)

```typescript
import { getAISDKModel } from '@/server/aiProvider';
import { generateText } from 'ai';

// Usar modelo específico
const model = await getAISDKModel({
  provider: 'xai',
  model: 'grok-2-1212'
});

const response = await generateText({
  model,
  prompt: 'Olá!',
  maxTokens: 100
});
```

## 🎨 Uso no Frontend

### Componente ModelSelector

```tsx
import { ModelSelector } from '@/components/ModelSelector';
import { useState } from 'react';

function ChatPanel() {
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-pro');

  return (
    <div>
      <ModelSelector
        value={selectedModel}
        onChange={setSelectedModel}
        context="chat" // ou 'code', 'analysis', etc.
      />
      {/* Chat UI */}
    </div>
  );
}
```

### API Endpoint

```typescript
// POST /api/chat/for-item
const response = await fetch('/api/chat/for-item', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Minha Tarefa',
    type: 'Tarefa',
    message: 'Olá!',
    history: chatHistory,
    // Trocar modelo em tempo real
    provider: 'xai',
    model: 'grok-2-1212'
  })
});
```

## 📝 Exemplos Práticos

### Exemplo 1: Conversa Multi-Modelo

```typescript
const conversation = [];

// 1. Começar com Gemini
const response1 = await chatService.chat('O que é IA?', {
  provider: 'google',
  model: 'gemini-2.5-pro'
});
conversation.push(
  { role: 'user', content: 'O que é IA?' },
  { role: 'assistant', content: response1.text }
);

// 2. Trocar para Grok para conversa
const response2 = await chatService.chat('Me dê exemplos práticos', {
  history: conversation,
  provider: 'xai',
  model: 'grok-2-1212'
});
conversation.push(
  { role: 'user', content: 'Me dê exemplos práticos' },
  { role: 'assistant', content: response2.text }
);

// 3. Trocar para GLM-4.6 para código
const response3 = await chatService.chat('Escreva código Python', {
  history: conversation,
  provider: 'zai',
  model: 'glm-4.6'
});
```

### Exemplo 2: Especialização por Tarefa

```typescript
function selectModelForTask(taskType: string) {
  const modelMap = {
    'code': { provider: 'zai', model: 'glm-4.6' },
    'conversation': { provider: 'xai', model: 'grok-2-1212' },
    'analysis': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
    'general': { provider: 'google', model: 'gemini-2.5-pro' }
  };

  return modelMap[taskType] || modelMap['general'];
}

// Uso
const modelConfig = selectModelForTask('code');
const response = await chatService.chat('Write a function...', {
  ...modelConfig
});
```

## 🎯 Casos de Uso

### Quando usar cada modelo:

**Gemini 2.5 Pro** (`google/gemini-2.5-pro`)
- ✅ Tarefas gerais
- ✅ Análise de documentos longos
- ✅ Processamento de imagens
- ✅ Grande contexto (2M tokens)

**Grok 2** (`xai/grok-2-1212`)
- ✅ Conversas naturais e criativas
- ✅ Resposta rápida
- ✅ Informações atualizadas (integração X)
- ✅ Custo eficiente

**GLM-4.6** (`zai/glm-4.6`)
- ✅ Geração de código
- ✅ Tarefas de agentes
- ✅ Debugging e análise técnica
- ✅ 30% mais eficiente em tokens

**GPT-4o** (`openai/gpt-4o`)
- ✅ Versatilidade
- ✅ Function calling
- ✅ Análise de imagens
- ✅ Raciocínio complexo

**Claude 3.5 Sonnet** (`anthropic/claude-3-5-sonnet-20241022`)
- ✅ Análise profunda
- ✅ Escrita criativa
- ✅ Raciocínio ético
- ✅ Context window grande

## 🔍 Debugging

### Verificar modelo atual

```typescript
const { model, metadata } = await AIProvider.getInstance()
  .getModelForContext('chat', {
    provider: 'xai',
    model: 'grok-2-1212'
  });

console.log('Provider:', metadata?.provider);
console.log('Model:', metadata?.modelId);
```

### Logs

O sistema loga automaticamente as trocas de modelo:

```
[ChatService] Usando modelo customizado { provider: 'xai', model: 'grok-2-1212' }
```

## 🚨 Limitações

1. **Créditos**: Cada provider requer créditos próprios
2. **Rate Limits**: Respeite os limites de cada API
3. **Context Window**: Não exceda o limite de cada modelo
4. **Capabilities**: Nem todos modelos suportam vision/function-calling

## 📚 Referências

- [Vercel AI SDK Docs](https://ai-sdk.dev)
- [Google Gemini API](https://ai.google.dev)
- [XAI Grok Docs](https://docs.x.ai)
- [Zhipu AI Docs](https://docs.z.ai)
- [OpenAI API](https://platform.openai.com)
- [Anthropic Claude](https://docs.anthropic.com)

---

**🎉 Feature implementada!** Agora você pode trocar modelos AI em tempo real durante conversas, mantendo todo o contexto e histórico.
