# Requirements: AI Elements Chat

## 1. Overview

**Goal**: Substituir a implementacao atual do chat AI por uma versao completa e robusta usando Vercel AI Elements, mantendo o estilo de abertura existente (modal/painel flutuante) mas com componentes ricos de interacao.

**User Problem**: O chat atual e basico e nao apresenta elementos visuais ricos para diferentes tipos de resposta da IA (codigo, confirmacoes, contexto, imagens, citacoes, fontes, sugestoes, planos, raciocinio, tasks e tools).

**Current State**: 
- Chat implementado em src/components/ui/AiInput.tsx usando useChat do Vercel AI SDK
- Interface modal flutuante com SiriOrb
- Mensagens simples user/assistant sem componentes especializados
- Estilo dark theme com neutral colors

**Target State**:
- Chat completo com todos os componentes do Vercel AI Elements
- Mesma UX de abertura (modal flutuante)
- Componentes especializados para cada tipo de resposta
- Design consistente com o tema atual

## 2. Functional Requirements

### 2.1 Core Features

- **FR-1**: Integrar biblioteca @vercel/ai-elements ou componentes individuais do repositorio github.com/vercel/ai-elements
  - Instalar dependencias necessarias
  - Configurar imports e setup inicial

- **FR-2**: Implementar componentes especializados para diferentes tipos de resposta
  - CodeBlock: blocos de codigo com syntax highlighting
  - Confirmation: solicitacoes de confirmacao interativas
  - Context: exibicao de contexto relevante
  - Image: renderizacao de imagens geradas ou referenciadas
  - InlineCitation: citacoes inline no texto
  - Loader: indicadores de carregamento contextuais
  - Plan: exibicao de planos/passos gerados pela IA
  - Queue: fila de mensagens/processamento
  - Reasoning: processo de raciocinio da IA
  - Response: resposta padrao com formatacao rica
  - Shimmer: efeitos de loading skeleton
  - Sources: painel de fontes "Used 2 sources" como na imagem
  - Suggestion: chips de sugestoes como "What are the latest trends in AI?"
  - Task: exibicao de tarefas geradas
  - Tool: uso de ferramentas pela IA

- **FR-3**: Manter o estilo de abertura atual
  - Modal/painel flutuante no canto inferior direito
  - Animacao de abertura smooth (framer-motion)
  - Header com SiriOrb e titulo "Assistente AI"
  - Botao de fechar (X)
  - Input area com placeholder customizado

- **FR-4**: Adaptar design visual para match com tema atual
  - Dark theme com neutral colors (900/800/700/600/500/300/200/100)
  - Gradientes sutis (from-neutral-950 to-neutral-900/50)
  - Bordas com neutral-800/60 e neutral-700/60
  - Hover states consistentes
  - Spacing e padding harmonizados

### 2.2 User Stories

**US-1**: Como usuario, quero ver codigo formatado com syntax highlighting quando a IA gera codigo, para facilitar leitura e copia.

**US-2**: Como usuario, quero ver as fontes que a IA consultou (ex: "Used 2 sources") com preview expansivel, para validar informacoes.

**US-3**: Como usuario, quero receber sugestoes de perguntas em chips clicaveis, para explorar topicos rapidamente.

**US-4**: Como usuario, quero ver o processo de raciocinio da IA quando ela esta "pensando", para entender como chegou a resposta.

**US-5**: Como usuario, quero visualizar planos/passos gerados pela IA de forma estruturada, para acompanhar execucoes complexas.

**US-6**: Como usuario, quero confirmar acoes criticas antes da execucao, atraves de componentes de confirmacao interativos.

**US-7**: Como usuario, quero ver tarefas geradas pela IA em formato checklist/cards, para gerenciar melhor as acoes sugeridas.

**US-8**: Como usuario, quero entender quando a IA usa ferramentas externas, atraves de indicadores visuais claros.

## 3. Technical Requirements

### 3.1 Performance

- Renderizacao de mensagens deve ser < 100ms para mensagens simples
- Syntax highlighting nao deve bloquear a UI (usar web workers se necessario)
- Animacoes devem rodar a 60fps
- Scroll suave na area de chat mesmo com muitas mensagens

### 3.2 Constraints

- **Technology Stack**:
  - Next.js 16 (App Router)
  - React 19
  - TypeScript 5.9
  - Vercel AI SDK (ai package v5.0.59)
  - Tailwind CSS 3.4
  - Framer Motion 12.23
  
- **Browser Compatibility**:
  - Chrome/Edge 90+
  - Safari 14+
  - Firefox 88+

- **Dependencies**:
  - Nao remover useChat existente, apenas estender
  - Manter compatibilidade com sistema atual de mensagens
  - Integrar com ModelSelector existente em src/components/ai/ModelSelector.tsx

### 3.3 Architecture

- Componentes devem ser client-side ('use client')
- Separacao clara entre container (Feedback) e componentes AI Elements
- Props bem tipadas com TypeScript
- Reutilizacao dos services existentes em src/server/ai/

### 3.4 Data Flow

- Mensagens vem do useChat hook (Vercel AI SDK)
- Cada mensagem pode ter metadata indicando tipo de conteudo
- Componentes decidem renderizacao baseado em message.content ou message.toolInvocations
- Streaming de respostas mantido (isLoading, partial messages)

## 4. Acceptance Criteria

- **AC-1**: WHEN usuario abre o chat THEN todos os componentes AI Elements estao disponiveis e funcionais

- **AC-2**: WHEN IA retorna codigo THEN CodeBlock renderiza com syntax highlighting correto

- **AC-3**: WHEN IA referencia fontes THEN Sources component exibe "Used N sources" com preview expansivel

- **AC-4**: WHEN IA gera sugestoes THEN Suggestion chips aparecem clicaveis abaixo do input

- **AC-5**: WHEN IA esta processando THEN Loader/Shimmer components indicam estado de loading apropriadamente

- **AC-6**: WHEN IA apresenta plano THEN Plan component estrutura os passos de forma clara

- **AC-7**: WHEN IA solicita confirmacao THEN Confirmation component permite aprovar/rejeitar acao

- **AC-8**: WHEN IA usa ferramentas THEN Tool component indica qual ferramenta e parametros

- **AC-9**: WHEN usuario digita mensagem THEN experiencia de input permanece identica (placeholder, Enter para enviar, Shift+Enter para quebra)

- **AC-10**: WHEN chat abre/fecha THEN animacoes sao suaves e consistentes com comportamento atual

- **AC-11**: IF mensagem contem imagem THEN Image component renderiza corretamente

- **AC-12**: IF IA mostra raciocinio THEN Reasoning component expande/colapsa pensamentos

- **AC-13**: WHEN build roda THEN nao ha erros TypeScript relacionados aos novos componentes

- **AC-14**: WHEN usuario interage com componentes THEN todos eventos (clicks, hovers) funcionam sem bugs

## 5. Out of Scope

- Mudancas no backend/API routes (manter src/app/api/assistant/* como esta)
- Alteracoes no sistema de creditos/ModelSelector (apenas integrar)
- Implementacao de voice input (SiriOrb permanece decorativo)
- Mudancas no DetailPanel ou outros componentes nao relacionados ao chat
- Suporte a modo light theme
- Persistencia de historico de chat (fora do escopo inicial)
- Customizacao de temas/cores pelo usuario
- Integracao com ferramentas externas nao previstas no Vercel AI SDK

## 6. Technical Decisions to Make in Design Phase

- Usar package @vercel/ai-elements ou copiar componentes do repositorio?
- Como mapear message.content para componentes corretos?
- Schema de metadata para mensagens (ex: message.type, message.component)?
- Estrutura de pastas para novos componentes (src/components/ai-elements/?)?
- Strategy para syntax highlighting (prism.js, highlight.js, shiki)?
- Como integrar Sources com dados reais (API precisa retornar sources metadata)?
- Pattern para confirmacoes (callbacks, eventos, state management)?

## 7. Non-Functional Requirements

- **NFR-1**: Acessibilidade WCAG 2.1 AA (keyboard navigation, ARIA labels)
- **NFR-2**: Responsive design (mobile, tablet, desktop)
- **NFR-3**: Codigo deve seguir convencoes do projeto (ESLint config)
- **NFR-4**: Componentes devem ter error boundaries
- **NFR-5**: Loading states devem ser claros e nao confundir usuario
