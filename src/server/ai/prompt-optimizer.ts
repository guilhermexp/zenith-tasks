/**
 * Otimizador de prompts e configuração de ferramentas
 * Gerencia prompts dinâmicos e seleção inteligente de ferramentas
 */

import { getAllTools, getToolsByCategory } from '@/server/ai/tools'
import type { MindFlowItem } from '@/types'
import { logger } from '@/utils/logger'

export interface PromptTemplate {
  id: string
  name: string
  system: string
  userPrefix?: string
  userSuffix?: string
  temperature?: number
  maxTokens?: number
  tools?: string[]
  categories?: string[]
}

export interface PromptContext {
  operation?: string
  item?: Partial<MindFlowItem>
  userIntent?: string
  history?: Array<{ role: string; content: string }>
  metadata?: Record<string, any>
}

/**
 * Biblioteca de prompts otimizados
 */
const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  general_chat: {
    id: 'general_chat',
    name: 'Chat Geral',
    system: `Você é um assistente útil e proativo em português do Brasil.
    Responda de forma clara, concisa e direta.
    Seja objetivo mas amigável.`,
    temperature: 0.7,
    categories: ['analysis'],
  },

  task_management: {
    id: 'task_management',
    name: 'Gerenciamento de Tarefas',
    system: `Você é um especialista em gerenciamento de tarefas e produtividade.
    Ajude o usuário a organizar, priorizar e executar suas tarefas de forma eficiente.
    Sempre sugira ações práticas e use as ferramentas disponíveis quando apropriado.`,
    temperature: 0.6,
    tools: ['createTask', 'updateTask', 'searchTasks'],
    categories: ['tasks'],
  },

  item_context: {
    id: 'item_context',
    name: 'Contexto de Item',
    system: `Você é um assistente especializado em ajudar com itens específicos.
    Considere sempre o contexto do item fornecido ao responder.
    Seja específico e relevante para o item em questão.`,
    userPrefix: 'Contexto do item:\n',
    temperature: 0.5,
    categories: ['tasks', 'analysis'],
  },

  financial_assistant: {
    id: 'financial_assistant',
    name: 'Assistente Financeiro',
    system: `Você é um assistente financeiro especializado.
    Ajude o usuário com análises financeiras, controle de gastos e planejamento.
    Sempre forneça informações práticas e acionáveis sobre finanças pessoais.`,
    temperature: 0.4,
    tools: ['createTask'],
    categories: ['analysis'],
  },

  meeting_assistant: {
    id: 'meeting_assistant',
    name: 'Assistente de Reuniões',
    system: `Você é um assistente especializado em reuniões.
    Ajude a organizar, transcrever e resumir reuniões.
    Extraia ações e decisões importantes das discussões.`,
    temperature: 0.5,
    tools: ['createTask', 'updateTask'],
    categories: ['tasks', 'analysis'],
  },

  creative_brainstorm: {
    id: 'creative_brainstorm',
    name: 'Brainstorm Criativo',
    system: `Você é um parceiro criativo para brainstorming e ideação.
    Gere ideias inovadoras e diferentes perspectivas.
    Seja expansivo e exploratório em suas sugestões.`,
    temperature: 0.9,
    categories: ['analysis'],
  },

  code_assistant: {
    id: 'code_assistant',
    name: 'Assistente de Código',
    system: `Você é um assistente de programação experiente.
    Forneça código claro, bem documentado e seguindo boas práticas.
    Explique conceitos técnicos de forma acessível quando necessário.`,
    temperature: 0.3,
    maxTokens: 2000,
    categories: ['analysis'],
  },
}

export class PromptOptimizer {
  private static instance: PromptOptimizer
  private cache: Map<string, { prompt: string; tools: string[]; timestamp: number }>
  private cacheExpiry = 300000 // 5 minutos

  private constructor() {
    this.cache = new Map()
  }

  static getInstance(): PromptOptimizer {
    if (!PromptOptimizer.instance) {
      PromptOptimizer.instance = new PromptOptimizer()
    }
    return PromptOptimizer.instance
  }

  /**
   * Seleciona o melhor template baseado no contexto
   */
  selectTemplate(context: PromptContext): PromptTemplate {
    // Baseado no tipo de operação
    if (context.operation) {
      switch (context.operation) {
        case 'task-planning':
        case 'task-management':
          return PROMPT_TEMPLATES.task_management

        case 'financial':
          return PROMPT_TEMPLATES.financial_assistant

        case 'meeting':
          return PROMPT_TEMPLATES.meeting_assistant

        case 'brainstorm':
          return PROMPT_TEMPLATES.creative_brainstorm

        case 'code':
          return PROMPT_TEMPLATES.code_assistant
      }
    }

    // Baseado no item
    if (context.item) {
      switch (context.item.type) {
        case 'Financeiro':
          return PROMPT_TEMPLATES.financial_assistant
        case 'Tarefa':
        case 'Lembrete':
          return PROMPT_TEMPLATES.task_management
        case 'Ideia':
          return PROMPT_TEMPLATES.creative_brainstorm
      }

      // Se há um item, usar contexto de item
      return PROMPT_TEMPLATES.item_context
    }

    // Análise de intenção do usuário
    if (context.userIntent) {
      const intent = context.userIntent.toLowerCase()

      if (intent.includes('criar') || intent.includes('adicionar') || intent.includes('nova')) {
        return PROMPT_TEMPLATES.task_management
      }

      if (intent.includes('financ') || intent.includes('dinheiro') || intent.includes('gasto')) {
        return PROMPT_TEMPLATES.financial_assistant
      }

      if (intent.includes('reunião') || intent.includes('meeting')) {
        return PROMPT_TEMPLATES.meeting_assistant
      }

      if (intent.includes('ideia') || intent.includes('brainstorm') || intent.includes('sugestão')) {
        return PROMPT_TEMPLATES.creative_brainstorm
      }

      if (intent.includes('código') || intent.includes('programação') || intent.includes('bug')) {
        return PROMPT_TEMPLATES.code_assistant
      }
    }

    // Padrão
    return PROMPT_TEMPLATES.general_chat
  }

  /**
   * Otimiza o prompt baseado no contexto
   */
  optimizePrompt(
    template: PromptTemplate,
    context: PromptContext,
    userMessage: string
  ): string {
    const cacheKey = `${template.id}-${JSON.stringify(context)}-${userMessage}`

    // Verificar cache
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      logger.debug('[PromptOptimizer] Usando prompt do cache', { templateId: template.id })
      return cached.prompt
    }

    let prompt = template.system

    // Adicionar contexto do item se disponível
    if (context.item && template.userPrefix) {
      const itemContext = this.buildItemContext(context.item)
      prompt += `\n\n${template.userPrefix}${itemContext}`
    }

    // Adicionar histórico relevante
    if (context.history && context.history.length > 0) {
      const relevantHistory = this.extractRelevantHistory(context.history, 5)
      if (relevantHistory) {
        prompt += `\n\nHistórico relevante:\n${relevantHistory}`
      }
    }

    // Adicionar metadata
    if (context.metadata) {
      const metadataStr = Object.entries(context.metadata)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')

      if (metadataStr) {
        prompt += `\n\nInformações adicionais:\n${metadataStr}`
      }
    }

    // Adicionar instruções específicas baseadas na intenção
    const intentInstructions = this.getIntentInstructions(userMessage)
    if (intentInstructions) {
      prompt += `\n\n${intentInstructions}`
    }

    // Cache do resultado
    this.cache.set(cacheKey, {
      prompt,
      tools: template.tools || [],
      timestamp: Date.now(),
    })

    // Limpar cache antigo periodicamente
    if (this.cache.size > 100) {
      this.cleanCache()
    }

    return prompt
  }

  /**
   * Seleciona ferramentas apropriadas baseado no contexto
   */
  selectTools(
    template: PromptTemplate,
    context: PromptContext,
    availableTools?: Record<string, any>
  ): Record<string, any> {
    const allTools = availableTools || getAllTools()
    const selectedTools: Record<string, any> = {}

    // Ferramentas específicas do template
    if (template.tools && template.tools.length > 0) {
      for (const toolName of template.tools) {
        if (allTools[toolName]) {
          selectedTools[toolName] = allTools[toolName]
        }
      }
    }

    // Ferramentas por categoria
    if (template.categories && template.categories.length > 0) {
      for (const category of template.categories) {
        const categoryTools = getToolsByCategory(category)
        Object.assign(selectedTools, categoryTools)
      }
    }

    // Ferramentas baseadas em intenção
    if (context.userIntent) {
      const intentTools = this.getToolsForIntent(context.userIntent, allTools)
      Object.assign(selectedTools, intentTools)
    }

    logger.info('[PromptOptimizer] Ferramentas selecionadas', {
      templateId: template.id,
      toolCount: Object.keys(selectedTools).length,
      tools: Object.keys(selectedTools),
    })

    return selectedTools
  }

  /**
   * Constrói contexto do item
   */
  private buildItemContext(item: Partial<MindFlowItem>): string {
    const parts: string[] = []

    if (item.title) parts.push(`Título: ${item.title}`)
    if (item.type) parts.push(`Tipo: ${item.type}`)
    if (item.summary) parts.push(`Resumo: ${item.summary}`)
    if (item.completed !== undefined) parts.push(`Status: ${item.completed ? 'Concluído' : 'Pendente'}`)
    if (item.dueDate) parts.push(`Vencimento: ${item.dueDate}`)

    if (item.subtasks && item.subtasks.length > 0) {
      const completedCount = item.subtasks.filter(st => st.completed).length
      parts.push(`Subtarefas: ${completedCount}/${item.subtasks.length} concluídas`)
    }

    if (item.amount !== undefined && item.type === 'Financeiro') {
      parts.push(`Valor: R$ ${item.amount.toFixed(2)}`)
      if (item.transactionType) parts.push(`Tipo: ${item.transactionType}`)
    }

    return parts.join('\n')
  }

  /**
   * Extrai histórico relevante
   */
  private extractRelevantHistory(
    history: Array<{ role: string; content: string }>,
    maxMessages: number
  ): string {
    const recent = history.slice(-maxMessages)
    return recent
      .map(msg => `${msg.role === 'assistant' ? 'Assistente' : 'Usuário'}: ${msg.content}`)
      .join('\n')
  }

  /**
   * Obtém instruções baseadas na intenção
   */
  private getIntentInstructions(message: string): string | null {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('urgente') || lowerMessage.includes('importante')) {
      return 'Priorize esta solicitação e forneça uma resposta rápida e acionável.'
    }

    if (lowerMessage.includes('detalh') || lowerMessage.includes('explic')) {
      return 'Forneça uma explicação detalhada e completa.'
    }

    if (lowerMessage.includes('resumo') || lowerMessage.includes('resumir')) {
      return 'Seja conciso e forneça apenas os pontos principais.'
    }

    if (lowerMessage.includes('passo a passo') || lowerMessage.includes('tutorial')) {
      return 'Forneça instruções claras e sequenciais.'
    }

    return null
  }

  /**
   * Seleciona ferramentas baseadas na intenção
   */
  private getToolsForIntent(intent: string, allTools: Record<string, any>): Record<string, any> {
    const selected: Record<string, any> = {}
    const lowerIntent = intent.toLowerCase()

    // Detectar necessidade de criar tarefas
    if (
      lowerIntent.includes('criar') ||
      lowerIntent.includes('adicionar') ||
      lowerIntent.includes('nova tarefa')
    ) {
      if (allTools.createTask) selected.createTask = allTools.createTask
    }

    // Detectar necessidade de atualizar
    if (
      lowerIntent.includes('atualizar') ||
      lowerIntent.includes('modificar') ||
      lowerIntent.includes('editar')
    ) {
      if (allTools.updateTask) selected.updateTask = allTools.updateTask
    }

    // Detectar necessidade de busca
    if (
      lowerIntent.includes('buscar') ||
      lowerIntent.includes('procurar') ||
      lowerIntent.includes('listar')
    ) {
      if (allTools.searchTasks) selected.searchTasks = allTools.searchTasks
    }

    // Detectar necessidade de análise
    if (
      lowerIntent.includes('analisar') ||
      lowerIntent.includes('análise') ||
      lowerIntent.includes('estatística')
    ) {
      if (allTools.analyzeData) selected.analyzeData = allTools.analyzeData
    }

    return selected
  }

  /**
   * Limpa cache antigo
   */
  private cleanCache() {
    const now = Date.now()
    const expired: string[] = []

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        expired.push(key)
      }
    }

    for (const key of expired) {
      this.cache.delete(key)
    }

    logger.debug('[PromptOptimizer] Cache limpo', {
      removed: expired.length,
      remaining: this.cache.size,
    })
  }

  /**
   * Obtém estatísticas do otimizador
   */
  getStats(): {
    templatesAvailable: number
    cacheSize: number
    cacheHitRate: number
  } {
    return {
      templatesAvailable: Object.keys(PROMPT_TEMPLATES).length,
      cacheSize: this.cache.size,
      cacheHitRate: 0, // Implementar tracking de hits/misses se necessário
    }
  }

  /**
   * Adiciona template customizado
   */
  addCustomTemplate(template: PromptTemplate) {
    PROMPT_TEMPLATES[template.id] = template
    logger.info('[PromptOptimizer] Template customizado adicionado', { id: template.id })
  }

  /**
   * Remove template
   */
  removeTemplate(templateId: string) {
    if (templateId in PROMPT_TEMPLATES) {
      delete PROMPT_TEMPLATES[templateId]
      logger.info('[PromptOptimizer] Template removido', { id: templateId })
    }
  }
}