/**
 * SISTEMA COMPLETO DE SUBTAREFAS INTELIGENTES
 * ============================================
 *
 * Sistema que decide automaticamente quando criar subtarefas e gera
 * subtarefas de qualidade usando AI com filtros de pós-processamento.
 *
 * Baseado em: zenith-tasks
 * Data: 2025-11-26
 */

import OpenAI from 'openai'

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

type Complexity = 'simple' | 'medium' | 'complex'

type TaskType = 'Tarefa' | 'Reunião' | 'Financeiro' | 'Projeto' | 'Nota' | 'Ideia'

interface Task {
  id: string
  title: string
  summary?: string
  type: TaskType
}

interface Subtask {
  title: string
  position: number
  completed: boolean
}

interface GenerateOptions {
  force?: boolean // Forçar geração mesmo para tarefas simples
}

// ============================================================================
// PARTE 1: ESTIMATIVA DE COMPLEXIDADE
// ============================================================================

/**
 * Estima a complexidade de uma tarefa baseado em palavras-chave e tamanho
 *
 * SIMPLES: Não gera subtarefas (retorna array vazio)
 * MÉDIO: Gera até 3 subtarefas
 * COMPLEXO: Gera até 6 subtarefas
 */
export function estimateComplexity(
  title: string,
  summary?: string
): Complexity {
  const text = `${title} ${summary || ''}`.toLowerCase()
  const wordCount = title.trim().split(/\s+/).length

  // SIMPLES: Padrões triviais ou muito curto
  const simpleHints = [
    /\b(passear|caminhar|correr|exercício)\b/,
    /\b(enviar\s+email|ligar\s+para|telefonar)\b/,
    /\b(pagar\s+(conta|boleto))\b/,
    /\b(comprar|compras)\b/,
    /\b(lavar|limpar)\b/,
    /\b(agendar|marcar\s+consulta)\b/,
    /\b(verificar|checar|conferir)\b\s*$/, // Sozinho no final
  ]

  if (wordCount <= 3) {
    return 'simple'
  }

  if (simpleHints.some(re => re.test(text))) {
    return 'simple'
  }

  // COMPLEXO: Múltiplas palavras ou padrões complexos
  const complexHints = [
    /\b(sistema\s+completo|arquitetura)\b/,
    /\b(múltiplos|múltiplas|integração|migração)\b/,
    /\b(refatorar\s+todo|reestruturar)\b/,
    /\b(campanha|estratégia|projeto\s+completo)\b/,
    /\b(lançamento|release|deploy\s+completo)\b/,
  ]

  if (wordCount >= 12) {
    return 'complex'
  }

  if (complexHints.some(re => re.test(text))) {
    return 'complex'
  }

  // MÉDIO: Padrões intermediários
  const mediumHints = [
    /\b(criar|desenvolver|implementar)\b/,
    /\b(landing\s+page|formulário|dashboard)\b/,
    /\b(reunião|meeting|apresentação)\b/,
    /\b(planejar|organizar|preparar)\b/,
    /\b(revisar|atualizar|melhorar)\b\s+\w+/, // Com contexto
  ]

  if (wordCount >= 4 && wordCount <= 7) {
    return 'medium'
  }

  if (mediumHints.some(re => re.test(text))) {
    return 'medium'
  }

  // Fallback conservador: não criar subtarefas se incerto
  return 'simple'
}

// ============================================================================
// PARTE 2: CONSTRUÇÃO DE PROMPT PARA AI
// ============================================================================

/**
 * Constrói o prompt detalhado para o AI gerar subtarefas
 * Inclui todas as regras e exemplos
 */
function buildSubtasksPrompt(item: Task, maxSubtasks: number): string {
  const contextByType = getContextForTaskType(item.type)
  const range = maxSubtasks <= 3 ? '2-3' : '3-6'

  return `Você é um assistente de produtividade especializado em quebrar tarefas complexas.

**TAREFA A ANALISAR:**
Título: ${item.title}
${item.summary ? `Descrição: ${item.summary}` : ''}
Tipo: ${item.type}

**SUA MISSÃO:**
Gere uma lista de ${range} subtarefas **concretas e acionáveis**.

**REGRAS ESTRITAS:**

1. **Seja ESPECÍFICO e ACIONÁVEL**
   ✅ BOM: "Criar schema do banco de dados com tabelas users e tasks"
   ❌ RUIM: "Configurar banco de dados"

2. **NÃO crie subtarefas TRIVIAIS ou ÓBVIAS**
   ❌ Evite: "Começar", "Finalizar", "Retornar", "Lavar mãos", "Pegar chave"
   ❌ Evite: "Abrir projeto", "Salvar arquivo", "Fechar IDE"
   ❌ Evite: "Revisar", "Verificar", "Checar" (sem contexto específico)

3. **NÃO repita informações da tarefa principal**
   ❌ Se a tarefa é "Criar landing page", não crie "Criar landing page do produto"

4. **Seja PROGRESSIVO e LÓGICO**
   ✅ Siga ordem natural de execução (setup → desenvolvimento → teste → deploy)

5. **Contextualize para o TIPO de tarefa:**
${contextByType}

6. **Use VERBOS DE AÇÃO no início:**
   ✅ "Criar", "Implementar", "Testar", "Revisar", "Deploy", "Integrar"
   ❌ "Fazer", "Executar" (muito genéricos)

7. **Limite de ${maxSubtasks} subtarefas NO MÁXIMO**
   - Priorize as mais importantes se houver mais possibilidades
   - Melhor menos subtarefas úteis do que muitas genéricas

**FORMATO DE RESPOSTA (JSON apenas):**
{
  "subtasks": [
    { "title": "Primeira subtarefa acionável", "position": 0 },
    { "title": "Segunda subtarefa acionável", "position": 1 }
  ]
}

**IMPORTANTE:** Se a tarefa for muito simples ou não se beneficiar de subtarefas, retorne:
{ "subtasks": [] }

**EXEMPLOS DE BOAS SUBTAREFAS:**
- "Criar wireframe com 3 seções principais no Figma"
- "Implementar API REST com endpoints CRUD para usuários"
- "Configurar pipeline CI/CD no GitHub Actions"
- "Escrever testes unitários para serviço de autenticação"

**EXEMPLOS DE SUBTAREFAS RUINS (NÃO FAÇA ISSO):**
- "Começar o projeto"
- "Fazer o trabalho"
- "Revisar" (sem especificar o quê)
- "Finalizar tudo"
`
}

/**
 * Retorna contexto específico baseado no tipo de tarefa
 */
function getContextForTaskType(type: TaskType): string {
  const contexts: Record<TaskType, string> = {
    Tarefa: `
   - Foco em etapas de execução práticas
   - Exemplo: Setup → Implementação → Teste → Deploy
   - Cada subtarefa deve ser um passo concreto`,

    Reunião: `
   - Foco em preparação e follow-up
   - Exemplo: Preparar agenda → Enviar convites → Conduzir reunião → Enviar ata
   - Inclua ações antes, durante e depois`,

    Financeiro: `
   - Foco em verificação e confirmação
   - Exemplo: Verificar valor → Gerar boleto → Efetuar pagamento → Confirmar recebimento
   - Cada passo deve ter validação`,

    Projeto: `
   - Foco em fases macro do projeto
   - Exemplo: Planejamento → Design → Implementação → Testes → Lançamento
   - Pense em marcos importantes`,

    Nota: `
   - NÃO gere subtarefas para notas
   - Notas são registros simples, não tarefas acionáveis
   - Retorne array vazio`,

    Ideia: `
   - NÃO gere subtarefas para ideias
   - Ideias são brainstorms, não planos de ação
   - Retorne array vazio`,
  }

  return contexts[type] || contexts.Tarefa
}

// ============================================================================
// PARTE 3: GERAÇÃO COM AI
// ============================================================================

/**
 * Gera subtarefas usando AI (OpenAI GPT-4o-mini)
 */
async function generateWithAI(
  item: Task,
  maxSubtasks: number
): Promise<Subtask[]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const prompt = buildSubtasksPrompt(item, maxSubtasks)

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3, // Baixa criatividade = mais consistente
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Você é um especialista em quebrar tarefas complexas de forma inteligente e prática.',
        },
        { role: 'user', content: prompt },
      ],
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('AI retornou conteúdo vazio')
    }

    const result = JSON.parse(content)
    const subtasks = result.subtasks || []

    // Validação básica
    if (!Array.isArray(subtasks)) {
      console.error('AI retornou formato inválido:', result)
      return []
    }

    return subtasks
  } catch (error) {
    console.error('Erro ao gerar subtarefas com AI:', error)
    return []
  }
}

// ============================================================================
// PARTE 4: PÓS-PROCESSAMENTO (FILTROS DE QUALIDADE)
// ============================================================================

/**
 * Aplica filtros de qualidade nas subtarefas geradas pelo AI
 * Remove trivialidades, duplicatas e normaliza
 */
function postProcessSubtasks(
  subtasks: Subtask[],
  maxSubtasks: number
): Subtask[] {
  // FILTRO 1: Remover trivialidades
  const trivialPatterns = [
    /^(iniciar|começar|finalizar|concluir|terminar|retornar)$/i,
    /^(abrir|fechar|salvar)\s+(projeto|arquivo|ide|editor)/i,
    /^(lavar\s+mãos|pegar\s+chave|acender\s+luz)/i,
    /^(verificar|checar|revisar|conferir)$/i, // Genérico demais
    /^(fazer|executar|realizar)$/i, // Muito vago
    /^preparar$/i, // Sozinho é vago
  ]

  let filtered = subtasks.filter(sub => {
    const title = sub.title.toLowerCase().trim()

    // Remover vazios
    if (!title) return false

    // Remover triviais
    if (trivialPatterns.some(pattern => pattern.test(title))) {
      return false
    }

    // Remover muito curtos (< 10 caracteres)
    if (title.length < 10) return false

    return true
  })

  // FILTRO 2: Remover duplicatas (títulos similares)
  filtered = removeSimilarSubtasks(filtered)

  // FILTRO 3: Limitar ao máximo permitido
  filtered = filtered.slice(0, maxSubtasks)

  // FILTRO 4: Normalizar posições e status
  return filtered.map((sub, index) => ({
    title: sub.title.trim(),
    position: index,
    completed: false,
  }))
}

/**
 * Remove subtarefas com títulos muito similares
 */
function removeSimilarSubtasks(subtasks: Subtask[]): Subtask[] {
  const seen = new Set<string>()

  return subtasks.filter(sub => {
    // Normalizar: lowercase, remover pontuação, remover espaços extras
    const normalized = sub.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (seen.has(normalized)) {
      return false
    }

    seen.add(normalized)
    return true
  })
}

// ============================================================================
// PARTE 5: FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Função principal que decide se deve criar subtarefas e as gera
 *
 * @param item - Tarefa para gerar subtarefas
 * @param options - Opções de geração (force para override)
 * @returns Array de subtarefas (0 a 6)
 */
export async function generateSubtasks(
  item: Task,
  options?: GenerateOptions
): Promise<Subtask[]> {
  // REGRA 0: Não gerar para Notas e Ideias (nunca!)
  if (item.type === 'Nota' || item.type === 'Ideia') {
    return []
  }

  // REGRA 1: Estimar complexidade
  const complexity = estimateComplexity(item.title, item.summary)

  // REGRA 2: Não criar para tarefas simples (exceto se forçado)
  if (!options?.force && complexity === 'simple') {
    console.log(`[Subtasks] Tarefa muito simples, não criando subtarefas: "${item.title}"`)
    return []
  }

  // REGRA 3: Determinar limite de subtarefas baseado na complexidade
  const maxSubtasks = complexity === 'complex' ? 6 : 3

  console.log(`[Subtasks] Gerando até ${maxSubtasks} subtarefas para: "${item.title}"`)

  // REGRA 4: Gerar com AI
  const rawSubtasks = await generateWithAI(item, maxSubtasks)

  // REGRA 5: Pós-processar (filtrar trivialidades, duplicatas, etc)
  const processedSubtasks = postProcessSubtasks(rawSubtasks, maxSubtasks)

  console.log(`[Subtasks] ${processedSubtasks.length} subtarefas geradas com sucesso`)

  return processedSubtasks
}

// ============================================================================
// PARTE 6: FALLBACK SEM AI (OPCIONAL)
// ============================================================================

/**
 * Fallback: Gera subtarefas básicas sem AI
 * Usa regras simples baseadas no tipo de tarefa
 */
export function generateBasicSubtasks(item: Task): Subtask[] {
  const templates: Record<TaskType, string[]> = {
    Reunião: [
      'Preparar agenda e tópicos da reunião',
      'Enviar convites aos participantes',
      'Conduzir reunião e tomar notas',
      'Enviar resumo e próximos passos',
    ],
    Financeiro: [
      'Verificar valor e detalhes da transação',
      'Gerar boleto ou preparar pagamento',
      'Efetuar pagamento',
    ],
    Projeto: [
      'Planejar escopo e requisitos',
      'Executar desenvolvimento',
      'Realizar testes',
    ],
    Tarefa: [], // Sem template genérico
    Nota: [],
    Ideia: [],
  }

  const template = templates[item.type] || []

  return template.map((title, index) => ({
    title,
    position: index,
    completed: false,
  }))
}

/**
 * Gera subtarefas com fallback automático
 */
export async function generateSubtasksWithFallback(
  item: Task,
  options?: GenerateOptions
): Promise<Subtask[]> {
  try {
    // Tentar gerar com AI
    const subtasks = await generateSubtasks(item, options)

    // Se AI não gerou nada e tarefa não é simples, usar fallback
    if (subtasks.length === 0 && estimateComplexity(item.title) !== 'simple') {
      console.log('[Subtasks] AI não gerou subtarefas, usando fallback')
      return generateBasicSubtasks(item)
    }

    return subtasks
  } catch (error) {
    console.error('[Subtasks] Erro na geração, usando fallback:', error)
    return generateBasicSubtasks(item)
  }
}

// ============================================================================
// PARTE 7: CACHE DE COMPLEXIDADE (OTIMIZAÇÃO)
// ============================================================================

const complexityCache = new Map<string, Complexity>()

/**
 * Estima complexidade com cache
 */
export function estimateComplexityWithCache(
  taskId: string,
  title: string,
  summary?: string
): Complexity {
  const cacheKey = `${taskId}-${title}`

  if (complexityCache.has(cacheKey)) {
    return complexityCache.get(cacheKey)!
  }

  const complexity = estimateComplexity(title, summary)
  complexityCache.set(cacheKey, complexity)

  return complexity
}

/**
 * Limpa cache de complexidade
 */
export function clearComplexityCache(taskId?: string): void {
  if (taskId) {
    // Limpar apenas para tarefa específica
    for (const key of complexityCache.keys()) {
      if (key.startsWith(`${taskId}-`)) {
        complexityCache.delete(key)
      }
    }
  } else {
    // Limpar todo o cache
    complexityCache.clear()
  }
}

// ============================================================================
// EXEMPLOS DE USO
// ============================================================================

/**
 * EXEMPLO 1: Tarefa simples (não gera)
 */
async function example1() {
  const task: Task = {
    id: '1',
    title: 'Pagar conta de luz',
    type: 'Tarefa',
  }

  const subtasks = await generateSubtasks(task)
  console.log(subtasks) // []
}

/**
 * EXEMPLO 2: Tarefa média (gera 2-3)
 */
async function example2() {
  const task: Task = {
    id: '2',
    title: 'Criar landing page do produto',
    type: 'Tarefa',
  }

  const subtasks = await generateSubtasks(task)
  console.log(subtasks)
  // [
  //   { title: "Criar wireframe e layout", position: 0, completed: false },
  //   { title: "Implementar seções hero e CTA", position: 1, completed: false },
  //   { title: "Configurar formulário de leads", position: 2, completed: false }
  // ]
}

/**
 * EXEMPLO 3: Tarefa complexa (gera 4-6)
 */
async function example3() {
  const task: Task = {
    id: '3',
    title: 'Desenvolver sistema completo de autenticação com OAuth e JWT',
    type: 'Projeto',
  }

  const subtasks = await generateSubtasks(task)
  console.log(subtasks) // 4-6 subtarefas
}

/**
 * EXEMPLO 4: Forçar geração para tarefa simples
 */
async function example4() {
  const task: Task = {
    id: '4',
    title: 'Comprar leite',
    type: 'Tarefa',
  }

  const subtasks = await generateSubtasks(task, { force: true })
  console.log(subtasks) // Gera mesmo sendo simples
}

/**
 * EXEMPLO 5: Reunião (template específico)
 */
async function example5() {
  const task: Task = {
    id: '5',
    title: 'Reunião trimestral de planejamento',
    type: 'Reunião',
  }

  const subtasks = await generateSubtasks(task)
  console.log(subtasks)
  // [
  //   { title: "Preparar agenda...", position: 0, completed: false },
  //   { title: "Enviar convites...", position: 1, completed: false },
  //   ...
  // ]
}
