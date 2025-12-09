# Prompt: Implementar Sistema Inteligente de Subtarefas Automáticas

## Contexto
Você precisa implementar um sistema que **decide automaticamente** se deve criar subtarefas para uma tarefa, e quando criar, faz isso de forma **inteligente e controlada** - sem exageros, sem trivialidades, sem aleatoriedade.

## 🎯 Objetivo Principal
Criar subtarefas **apenas quando agregam valor real** ao usuário, evitando:
- ❌ Quebrar tarefas simples desnecessariamente
- ❌ Criar subtarefas óbvias ou triviais
- ❌ Gerar excesso de subtarefas (poluição)
- ❌ Subtarefas genéricas ou sem sentido

## 📐 PARTE 1: Algoritmo de Decisão - Quando Criar Subtarefas

### Níveis de Complexidade

Implemente uma função `estimateComplexity()` que classifica tarefas em 3 níveis:

#### **SIMPLES** → NÃO cria subtarefas (retorna array vazio)
**Critérios:**
- Título tem **≤ 3 palavras** (ex: "Pagar conta luz")
- OU contém **padrões de tarefas triviais:**
  ```typescript
  const simplePatterns = [
    'passear', 'caminhar', 'correr', 'exercício',
    'enviar email', 'ligar para', 'telefonar',
    'pagar conta', 'pagar boleto',
    'comprar', 'compras',
    'lavar', 'limpar',
    'agendar', 'marcar consulta',
    'verificar', 'checar', 'conferir',
    'ler', 'assistir', 'estudar' (sozinhos, sem contexto)
  ]
  ```

**Razão:** Tarefas atômicas que não se beneficiam de decomposição.

#### **MÉDIO** → Cria até **3 subtarefas**
**Critérios:**
- Título tem **4-7 palavras**
- OU contém **palavras de projeto simples:**
  ```typescript
  const mediumPatterns = [
    'criar', 'desenvolver', 'implementar',
    'landing page', 'formulário', 'dashboard',
    'reunião', 'meeting', 'apresentação',
    'planejar', 'organizar', 'preparar',
    'revisar', 'atualizar', 'melhorar'
  ]
  ```

**Razão:** Tarefas de escopo limitado que se beneficiam de estrutura básica.

#### **COMPLEXO** → Cria até **6 subtarefas**
**Critérios:**
- Título tem **≥ 12 palavras**
- OU contém **múltiplos indicadores de complexidade:**
  ```typescript
  const complexPatterns = [
    'sistema completo', 'arquitetura',
    'múltiplos', 'integração', 'migração',
    'refatorar todo', 'reestruturar',
    'campanha', 'estratégia', 'projeto completo',
    'lançamento', 'release', 'deploy'
  ]
  ```

**Razão:** Projetos grandes que precisam ser quebrados para serem gerenciáveis.

### Código de Referência

```typescript
function estimateComplexity(
  title: string,
  summary?: string
): 'simple' | 'medium' | 'complex' {
  const text = `${title} ${summary || ''}`.toLowerCase()
  const wordCount = title.trim().split(/\s+/).length

  // SIMPLES: Padrões triviais ou muito curto
  const simpleHints = [
    /\b(passear|caminhar|correr|exercício)\b/,
    /\b(enviar\s+email|ligar\s+para|telefonar)\b/,
    /\b(pagar\s+(conta|boleto))\b/,
    /\b(comprar|compras)\b/,
    /\b(lavar|limpar)\b/,
    /\b(agendar|marcar\s+consulta)\b/
  ]

  if (wordCount <= 3 || simpleHints.some(re => re.test(text))) {
    return 'simple'
  }

  // COMPLEXO: Múltiplas palavras ou padrões complexos
  const complexHints = [
    /\b(sistema\s+completo|arquitetura)\b/,
    /\b(múltiplos|múltiplas|integração|migração)\b/,
    /\b(refatorar\s+todo|reestruturar)\b/,
    /\b(campanha|estratégia|projeto\s+completo)\b/
  ]

  if (wordCount >= 12 || complexHints.some(re => re.test(text))) {
    return 'complex'
  }

  // MÉDIO: Padrões intermediários
  const mediumHints = [
    /\b(criar|desenvolver|implementar)\b/,
    /\b(landing\s+page|formulário|dashboard)\b/,
    /\b(reunião|meeting|apresentação)\b/,
    /\b(planejar|organizar|preparar)\b/
  ]

  if (wordCount >= 4 && wordCount <= 7) return 'medium'
  if (mediumHints.some(re => re.test(text))) return 'medium'

  return 'simple' // Fallback conservador
}
```

### Lógica de Aplicação

```typescript
async function generateSubtasksIfNeeded(
  item: Task,
  options?: { force?: boolean }
): Promise<Subtask[]> {
  const complexity = estimateComplexity(item.title, item.summary)

  // REGRA 1: Não criar para tarefas simples (exceto se forçado)
  if (!options?.force && complexity === 'simple') {
    return [] // ← Ponto crítico: evita over-tasking
  }

  // REGRA 2: Determinar limite de subtarefas
  const maxSubtasks = complexity === 'complex' ? 6 : 3

  // REGRA 3: Gerar com AI (ver Parte 2)
  return await generateWithAI(item, maxSubtasks)
}
```

## 🤖 PARTE 2: Geração Inteligente com AI

### Prompt Engineering - Instrução para o AI

O segredo está em **instruir o AI claramente** sobre o que fazer e o que evitar:

```typescript
function buildSubtasksPrompt(item: Task, maxSubtasks: number): string {
  return `Você é um assistente de produtividade especializado em quebrar tarefas complexas.

**TAREFA A ANALISAR:**
Título: ${item.title}
${item.summary ? `Descrição: ${item.summary}` : ''}
Tipo: ${item.type}

**SUA MISSÃO:**
Gere uma lista de ${maxSubtasks <= 3 ? '2-3' : '3-6'} subtarefas **concretas e acionáveis**.

**REGRAS ESTRITAS:**

1. **Seja ESPECÍFICO e ACIONÁVEL**
   ✅ BOM: "Criar schema do banco de dados com tabelas users e tasks"
   ❌ RUIM: "Configurar banco de dados"

2. **NÃO crie subtarefas TRIVIAIS ou ÓBVIAS**
   ❌ Evite: "Começar", "Finalizar", "Retornar", "Lavar mãos", "Pegar chave"
   ❌ Evite: "Abrir projeto", "Salvar arquivo", "Fechar IDE"

3. **NÃO repita informações da tarefa principal**
   ❌ Se a tarefa é "Criar landing page", não crie "Criar landing page do produto"

4. **Seja PROGRESSIVO e LÓGICO**
   ✅ Siga ordem natural de execução (setup → desenvolvimento → teste → deploy)

5. **Contextualize para o TIPO de tarefa:**
   - **Tarefa de desenvolvimento**: Setup, implementação, testes, documentação
   - **Reunião**: Preparar agenda, enviar convites, conduzir, enviar ata
   - **Financeiro**: Verificar valor, gerar boleto, confirmar pagamento
   - **Nota/Ideia**: Não gere subtarefas (retorne array vazio)

6. **Use VERBOS DE AÇÃO no início:**
   ✅ "Criar", "Implementar", "Testar", "Revisar", "Deploy"

7. **Limite de ${maxSubtasks} subtarefas NO MÁXIMO**
   - Priorize as mais importantes se houver mais possibilidades

**FORMATO DE RESPOSTA (JSON apenas):**
{
  "subtasks": [
    { "title": "Primeira subtarefa acionável", "position": 0 },
    { "title": "Segunda subtarefa acionável", "position": 1 }
  ]
}

**IMPORTANTE:** Se a tarefa for muito simples ou não se beneficiar de subtarefas, retorne:
{ "subtasks": [] }
`
}
```

### Configuração do AI

```typescript
const aiConfig = {
  model: 'gpt-4o-mini', // Rápido e barato para essa tarefa
  temperature: 0.3,      // Baixa criatividade = mais consistente
  maxTokens: 500,        // Suficiente para 6 subtarefas
  responseFormat: { type: 'json_object' } // Força JSON válido
}
```

### Implementação da Geração

```typescript
async function generateWithAI(
  item: Task,
  maxSubtasks: number
): Promise<Subtask[]> {
  const prompt = buildSubtasksPrompt(item, maxSubtasks)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 500,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Você é um especialista em quebrar tarefas complexas de forma inteligente.'
      },
      { role: 'user', content: prompt }
    ]
  })

  const result = JSON.parse(response.choices[0].message.content)
  const subtasks = result.subtasks || []

  // PÓS-PROCESSAMENTO: Filtrar trivialidades que o AI possa ter criado
  return postProcessSubtasks(subtasks, maxSubtasks)
}
```

## 🧹 PARTE 3: Pós-Processamento - Filtros de Qualidade

Mesmo com bom prompt, o AI pode errar. Implemente filtros:

```typescript
function postProcessSubtasks(
  subtasks: Subtask[],
  maxSubtasks: number
): Subtask[] {
  // FILTRO 1: Remover trivialidades
  const trivialPatterns = [
    /^(iniciar|começar|finalizar|concluir|retornar)$/i,
    /^(abrir|fechar|salvar)\s+(projeto|arquivo|ide)/i,
    /^(lavar mãos|pegar chave|acender luz)/i,
    /^(verificar|checar)$/i, // Genérico demais
  ]

  let filtered = subtasks.filter(sub => {
    const title = sub.title.toLowerCase().trim()
    return !trivialPatterns.some(pattern => pattern.test(title))
  })

  // FILTRO 2: Remover duplicatas (títulos muito similares)
  filtered = removeSimilarSubtasks(filtered)

  // FILTRO 3: Limitar ao máximo permitido
  filtered = filtered.slice(0, maxSubtasks)

  // FILTRO 4: Garantir posições corretas
  return filtered.map((sub, index) => ({
    ...sub,
    position: index,
    completed: false
  }))
}

function removeSimilarSubtasks(subtasks: Subtask[]): Subtask[] {
  const seen = new Set<string>()
  return subtasks.filter(sub => {
    const normalized = sub.title.toLowerCase().replace(/[^\w\s]/g, '')
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}
```

## 📊 PARTE 4: Contextualização por Tipo de Tarefa

Diferentes tipos de tarefas precisam de abordagens diferentes:

```typescript
function getContextForTaskType(type: string): string {
  const contexts = {
    'Tarefa': `
      Foco em etapas de execução.
      Exemplo: Setup → Implementação → Teste → Deploy
    `,
    'Reunião': `
      Foco em preparação e follow-up.
      Exemplo: Preparar agenda → Enviar convites → Conduzir reunião → Enviar ata
    `,
    'Financeiro': `
      Foco em verificação e confirmação.
      Exemplo: Verificar valor → Gerar boleto → Efetuar pagamento → Confirmar recebimento
    `,
    'Projeto': `
      Foco em fases do projeto.
      Exemplo: Planejamento → Design → Implementação → Testes → Lançamento
    `,
    'Nota': `
      NÃO gere subtarefas para notas - são registros simples.
    `,
    'Ideia': `
      NÃO gere subtarefas para ideias - são brainstorms.
    `
  }

  return contexts[type] || contexts['Tarefa']
}
```

## 🎨 PARTE 5: Experiência do Usuário

### Opções de Forçar Geração

Mesmo para tarefas simples, dê controle ao usuário:

```typescript
// Botão com modificadores
<button
  onClick={(e) => {
    const force = e.shiftKey || e.ctrlKey || e.metaKey
    generateSubtasks({ force })
  }}
>
  Gerar Subtarefas
</button>

// Tooltip
"Clique para gerar (Shift+Click força geração mesmo para tarefas simples)"
```

### Feedback Visual

```typescript
const [isGenerating, setIsGenerating] = useState(false)
const [message, setMessage] = useState('')

async function handleGenerate(force: boolean) {
  setIsGenerating(true)

  const complexity = estimateComplexity(task.title)

  if (!force && complexity === 'simple') {
    setMessage('Tarefa muito simples - não precisa de subtarefas')
    setIsGenerating(false)
    return
  }

  try {
    const subtasks = await generateSubtasks(task.id, { force })
    setMessage(`${subtasks.length} subtarefas criadas!`)
  } catch (error) {
    setMessage('Erro ao gerar subtarefas')
  } finally {
    setIsGenerating(false)
  }
}
```

## 📋 PARTE 6: Exemplos Práticos

### Exemplo 1: Tarefa Simples (NÃO gera)
```typescript
Input: "Pagar conta de luz"
Complexity: 'simple' (≤3 palavras + padrão "pagar conta")
Output: [] (array vazio)
Razão: Tarefa atômica, não há o que quebrar
```

### Exemplo 2: Tarefa Média (gera 2-3)
```typescript
Input: "Criar landing page do produto X"
Complexity: 'medium' (5 palavras + padrão "criar" + "landing page")
Max Subtasks: 3

AI Prompt: "Gere 2-3 subtarefas concretas..."
Output: [
  { title: "Criar wireframe e layout da página", position: 0 },
  { title: "Implementar seções hero, features e CTA", position: 1 },
  { title: "Configurar formulário de captura de leads", position: 2 }
]
```

### Exemplo 3: Tarefa Complexa (gera 4-6)
```typescript
Input: "Desenvolver sistema completo de autenticação com OAuth, JWT e recuperação de senha"
Complexity: 'complex' (16 palavras + padrões "sistema completo" + múltiplas features)
Max Subtasks: 6

Output: [
  { title: "Configurar banco de dados e tabelas de usuários", position: 0 },
  { title: "Implementar registro e login com email/senha", position: 1 },
  { title: "Integrar OAuth com Google e GitHub", position: 2 },
  { title: "Implementar geração e validação de JWT", position: 3 },
  { title: "Criar fluxo de recuperação de senha por email", position: 4 },
  { title: "Adicionar testes de autenticação e segurança", position: 5 }
]
```

### Exemplo 4: Nota/Ideia (NÃO gera)
```typescript
Input: "Ideia: aplicativo de meditação com sons da natureza"
Type: 'Ideia'
Complexity: Irrelevante
Output: [] (array vazio)
Razão: Ideias não precisam de subtarefas - são registros criativos
```

## 🔧 PARTE 7: Configurações Avançadas

### Rate Limiting
```typescript
// Evitar spam de geração
const rateLimiter = {
  maxRequestsPerMinute: 10,
  cooldownAfterGeneration: 3000 // 3 segundos
}
```

### Cache de Complexidade
```typescript
// Evitar recalcular para mesma tarefa
const complexityCache = new Map<string, Complexity>()

function getCachedComplexity(taskId: string, title: string): Complexity {
  const cacheKey = `${taskId}-${title}`
  if (!complexityCache.has(cacheKey)) {
    complexityCache.set(cacheKey, estimateComplexity(title))
  }
  return complexityCache.get(cacheKey)!
}
```

### Fallback para AI Indisponível
```typescript
async function generateWithFallback(item: Task): Promise<Subtask[]> {
  try {
    return await generateWithAI(item, maxSubtasks)
  } catch (error) {
    // Fallback: Regras básicas sem AI
    return generateBasicSubtasks(item)
  }
}

function generateBasicSubtasks(item: Task): Subtask[] {
  // Lógica simples baseada em tipo
  if (item.type === 'Reunião') {
    return [
      { title: 'Preparar agenda da reunião', position: 0 },
      { title: 'Conduzir reunião', position: 1 },
      { title: 'Enviar resumo e próximos passos', position: 2 }
    ]
  }
  return []
}
```

## 📚 Checklist de Implementação

- [ ] Implementar função `estimateComplexity()` com 3 níveis
- [ ] Criar padrões regex para cada nível de complexidade
- [ ] Implementar lógica de decisão (gerar ou não gerar)
- [ ] Criar prompt detalhado para o AI com todas as regras
- [ ] Configurar AI com temperatura baixa (0.3) e JSON mode
- [ ] Implementar pós-processamento para filtrar trivialidades
- [ ] Adicionar filtro de duplicatas
- [ ] Limitar número de subtarefas por complexidade (3 ou 6)
- [ ] Adicionar contextualização por tipo de tarefa
- [ ] Implementar opção de forçar geração (Shift+Click)
- [ ] Adicionar feedback visual (loading, mensagens)
- [ ] Implementar tratamento de erros e fallback
- [ ] Adicionar testes para cada nível de complexidade
- [ ] Documentar padrões e critérios de decisão

## 🎓 Princípios Fundamentais

1. **Conservador por padrão**: Melhor NÃO criar subtarefas do que criar desnecessárias
2. **Qualidade > Quantidade**: 2-3 subtarefas úteis > 6 genéricas
3. **Acionável e específico**: Cada subtarefa deve ter ação clara
4. **Respeitar o contexto**: Tipo de tarefa influencia abordagem
5. **Dar controle ao usuário**: Opção de forçar geração
6. **Falhar graciosamente**: Sempre ter fallback se AI falhar

## 🚀 Resultado Esperado

Um sistema que:
- ✅ Só cria subtarefas quando agregam valor
- ✅ Gera subtarefas específicas e acionáveis
- ✅ Respeita limites (3 ou 6 máximo)
- ✅ Filtra trivialidades automaticamente
- ✅ Funciona de forma consistente e previsível
- ✅ Dá controle ao usuário quando necessário

---

**Versão**: 1.0
**Baseado em**: zenith-tasks (sistema de subtarefas inteligente)
**Última atualização**: 2025-11-26
