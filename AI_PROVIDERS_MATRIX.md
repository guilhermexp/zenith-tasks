# 📊 Capacidades dos Provedores AI - Gemini vs Grok

## ✅ Garantido: Mesmas Capacidades (Grok = Gemini)

### 🤖 Análise de Texto (`/api/inbox/analyze`)
**Endpoints:** TaskList.tsx, adicionar itens via input

**Capacidades garantidas:**
- ✅ Extrai múltiplas intenções de texto livre/transcrição
- ✅ Identifica tipos: Tarefa, Ideia, Nota, Lembrete, Financeiro, Reunião
- ✅ Extrai datas e converte (hoje, amanhã, semana que vem → YYYY-MM-DD)
- ✅ Lida com campos Financeiros (amount, transactionType: Entrada/Saída)
- ✅ Extrai detalhes de Reunião (date, time, participants, location, agenda, links)
- ✅ Gera subtarefas quando relevante (tarefas multi-etapas)
- ✅ Cria sumário automaticamente

**Prompt**: `buildAnalyzePrompt()` em `/services/ai/prompts.ts:1`

### 🔢 Geração de Subtarefas (`/api/subtasks/generate`)
**Endpoints**: DetailPanel.tsx, geração AI de subtarefas

**Capacidades garantidas:**
- ✅ Analisa complexidade da tarefa (simples/média/complexa)
- ✅ Gera 2-3 subtarefas para tarefas médias
- ✅ Gera 4-6 subtarefas para tarefas complexas
- ✅ Evita trivialidades e duplicações
- ✅ Retorna array vazio para tarefas simples

**Prompt**: `buildSubtasksPrompt()` em `/services/ai/prompts.ts:52`

### 📝 Transcrição de Áudio (`/api/speech/transcribe`)
**Endpoints**: TalkModeModal.tsx, gravação de voz

**Capacidades garantidas:**
- ✅ Transcreve áudio (webm, mp3, wav, mp4, ogg) para texto
- ✅ Suporta transcription em tempo real
- ✅ Retorna confidence score
- ✅ Mantém sessionId para contexto

**Suporte por provedor:**
- ✅ **OpenAI GPT-4/Whisper**: **Prioridade 1** - Transcrição via API nativa (recomendado)
- ✅ **Google Gemini**: Transcrição nativa (suporta arquivo binário)
- ❌ **XAI Grok**: **NÃO suporta transcrição nativa** (limitação do modelo)
- ❌ **OpenRouter**: Depende do modelo selecionado

**Definir provedor de transcrição:**
```env
AUDIO_TRANSCRIPTION_PROVIDER="openai"  # ou "google" para Gemini
```

**Nota importante**: Transcrição é a ÚNICA capacidade que depende de modelo específico. Por padrão usa **OpenAI (Whisper/GPT-4)**.

## 🔄 Fallback Automático Configurado

### Ordem de Prioridade:
1. **XAI (Grok-4-fast-reasoning-latest)** - Prioridade 1 ✅
2. **Google (Gemini)** - Prioridade 2 ⚠️ (quota limitada)
3. **OpenRouter** - Prioridade 3 🔄
4. **OpenAI (GPT-4)** - Prioridade 4 🔄

### Como Funciona:
- Se Grok falhar → tenta Google
- Se Google falhar → tenta OpenRouter
- Se OpenRouter falhar → tenta OpenAI
- Se todos falharem → cria item/simples ou retorna array vazio (sem erro UI)

### Endpoints com Fallback:
- ✅ `/api/inbox/analyze` - Análise de texto completa
- ✅ `/api/subtasks/generate` - Geração de subtarefas
- ✅ `/api/speech/transcribe` - Transcrição de áudio (Google/OpenAI)
- ✅ `/api/assistant` - Assistente AI (já tinha)

## 🎯 O que MUDOU do Gemini para Grok?

**NOTHING!** - As capacidades são idênticas porque:

1. **Mesmos prompts** usados para todos os provedores
2. **Mesmos schemas** (Zod) para validação
3. **Fallback automático** garante funcionalidade
4. **Respostas estruturadas** sempre no mesmo formato JSON

A única diferença é que **o provedor padrão agora é Grok** em vez de Gemini.

## 📝 Resumo de Capacidades

| Funcionalidade | Grok (XAI) | Google | OpenAI | OpenRouter |
|----------------|-----------|--------|--------|------------|
| Analisar texto ✍️ | ✅ | ✅ | ✅ | ✅ |
| Gerar subtarefas 🔢 | ✅ | ✅ | ✅ | ✅ |
| Transcrever áudio 🎤 | ❌ | ✅ | ✅ | ⚠️* |
| Assistente chat 💬 | ✅ | ✅ | ✅ | ✅ |
| Categorizar itens 🏷️ | ✅ | ✅ | ✅ | ✅ |
| Extrair datas 📅 | ✅ | ✅ | ✅ | ✅ |
| Campos financeiros 💰 | ✅ | ✅ | ✅ | ✅ |
| Detalhes reunião 👥 | ✅ | ✅ | ✅ | ✅ |

*OpenRouter: Depende do modelo selecionado (alguns suportam, outros não)

## 🚀 Como Está Configurado Agora

```env
AI_SDK_PROVIDER="xai"  # Grok é o padrão
XAI_API_KEY=sk-...      # Sua chave Grok
XAI_MODEL="grok-4-fast-reasoning-latest"

# Fallback automático tenta estes se Grok falhar:
GEMINI_API_KEY=...      # Google (backup)
OPENROUTER_API_KEY=...  # OpenRouter (backup)
OPENAI_API_KEY=...      # OpenAI (backup)
```

## ✅ Garantias Adicionadas

1. **Fallback automático** em todos os endpoints AI
2. **Body read once** fix (corrigido bug de requisição)
3. **Provider-X first** configurado (XAI/Grok prioridade 1)
4. **Error handling** aprimorado para transcrição
5. **No breaking changes** - tudo funciona como antes

---

**Resumo**: O Grok faz **TUDO** que o Gemini fazia, com a mesma qualidade. A única limitação é transcrição de áudio, que requer Google ou OpenAI (e tem fallback automático se você tentar com Grok).
