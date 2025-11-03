import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import type { MindFlowItem, Subtask } from '@/types'
import { logger } from '@/utils/logger'

type DBItem = Database['public']['Tables']['mind_flow_items']['Row']
type DBSubtask = Database['public']['Tables']['subtasks']['Row']

type RawItem = DBItem & {
  subtasks?: DBSubtask[] | null
}

const ERROR_ALREADY_LOGGED: unique symbol = Symbol('ITEMS_SERVICE_ERROR_ALREADY_LOGGED')

type LoggedError = Error & {
  [typeof ERROR_ALREADY_LOGGED]?: boolean
}

export class ItemsService {
  /**
   * Load all items for a specific user
   */
  static async loadItems(userId: string): Promise<MindFlowItem[]> {
    if (!isSupabaseConfigured) {
      logger.info('ItemsService: Supabase not configured, using local storage')
      return []
    }

    try {
      const { data, error } = await supabase!
        .from('mind_flow_items')
        .select(`
          *,
          subtasks (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw this.logAndWrapError('loadItems.query', error, { userId })
      }

      const items = (data ?? []).map(item => this.mapToMindFlowItem(item as RawItem))
      return items
    } catch (error) {
      throw this.logAndWrapError('loadItems', error, { userId })
    }
  }

  /**
   * Create a new item
   */
  static async createItem(userId: string, item: Omit<MindFlowItem, 'id' | 'createdAt'>): Promise<MindFlowItem> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado')
    }

    try {
      const { data: newItem, error } = await supabase!
        .from('mind_flow_items')
        .insert({
          user_id: userId,
          title: item.title,
          item_type: item.type,
          completed: item.completed ?? false,
          summary: item.summary,
          due_date: item.dueDate,
          due_date_iso: item.dueDateISO,
          suggestions: item.suggestions,
          transaction_type: item.transactionType,
          amount: item.amount,
          is_recurring: item.isRecurring,
          payment_method: item.paymentMethod,
          is_paid: item.isPaid,
          chat_history: item.chatHistory ?? [],
          notes: item.notes
        })
        .select()
        .single()

      if (error) {
        throw this.logAndWrapError('createItem.insert', error, { userId, title: item.title })
      }

      if (!newItem) {
        throw this.logAndWrapError('createItem.insert', 'Supabase returned no item payload', {
          userId,
          title: item.title
        })
      }

      if (item.subtasks && item.subtasks.length > 0) {
        await this.createSubtasks(newItem.id, item.subtasks)
      }

      return this.mapToMindFlowItem({
        ...newItem,
        subtasks: item.subtasks ?? []
      } as RawItem)
    } catch (error) {
      throw this.logAndWrapError('createItem', error, { userId })
    }
  }

  /**
   * Update an existing item
   */
  static async updateItem(itemId: string, updates: Partial<MindFlowItem>): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {}

      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.completed !== undefined) updateData.completed = updates.completed
      if (updates.summary !== undefined) updateData.summary = updates.summary
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate
      if (updates.dueDateISO !== undefined) updateData.due_date_iso = updates.dueDateISO
      if (updates.suggestions !== undefined) updateData.suggestions = updates.suggestions
      if (updates.isGeneratingSubtasks !== undefined) updateData.is_generating_subtasks = updates.isGeneratingSubtasks
      if (updates.transactionType !== undefined) updateData.transaction_type = updates.transactionType
      if (updates.amount !== undefined) updateData.amount = updates.amount
      if (updates.isRecurring !== undefined) updateData.is_recurring = updates.isRecurring
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod
      if (updates.isPaid !== undefined) updateData.is_paid = updates.isPaid
      if (updates.chatHistory !== undefined) updateData.chat_history = updates.chatHistory
      if (updates.notes !== undefined) updateData.notes = updates.notes

      const { error: updateError } = await supabase!
        .from('mind_flow_items')
        .update(updateData)
        .eq('id', itemId)

      if (updateError) {
        throw this.logAndWrapError('updateItem.update', updateError, { itemId })
      }

      if (updates.subtasks !== undefined) {
        const { error: deleteError } = await supabase!
          .from('subtasks')
          .delete()
          .eq('parent_item_id', itemId)

        if (deleteError) {
          throw this.logAndWrapError('updateItem.clearSubtasks', deleteError, { itemId })
        }

        if (updates.subtasks.length > 0) {
          await this.createSubtasks(itemId, updates.subtasks)
        }
      }
    } catch (error) {
      throw this.logAndWrapError('updateItem', error, { itemId })
    }
  }

  /**
   * Delete an item
   */
  static async deleteItem(itemId: string): Promise<void> {
    try {
      const { error } = await supabase!
        .from('mind_flow_items')
        .delete()
        .eq('id', itemId)

      if (error) {
        throw this.logAndWrapError('deleteItem.delete', error, { itemId })
      }
    } catch (error) {
      throw this.logAndWrapError('deleteItem', error, { itemId })
    }
  }

  /**
   * Toggle item completion status
   */
  static async toggleItem(itemId: string): Promise<void> {
    try {
      const { data: item, error: fetchError } = await supabase!
        .from('mind_flow_items')
        .select('completed')
        .eq('id', itemId)
        .single()

      if (fetchError) {
        throw this.logAndWrapError('toggleItem.fetch', fetchError, { itemId })
      }

      if (!item) {
        throw this.logAndWrapError('toggleItem.fetch', 'Supabase returned no item payload', { itemId })
      }

      const { error } = await supabase!
        .from('mind_flow_items')
        .update({ completed: !item.completed })
        .eq('id', itemId)

      if (error) {
        throw this.logAndWrapError('toggleItem.update', error, { itemId })
      }
    } catch (error) {
      throw this.logAndWrapError('toggleItem', error, { itemId })
    }
  }

  /**
   * Clear all completed items for a user
   */
  static async clearCompleted(userId: string): Promise<void> {
    try {
      const { error } = await supabase!
        .from('mind_flow_items')
        .delete()
        .eq('user_id', userId)
        .eq('completed', true)

      if (error) {
        throw this.logAndWrapError('clearCompleted.delete', error, { userId })
      }
    } catch (error) {
      throw this.logAndWrapError('clearCompleted', error, { userId })
    }
  }

  /**
   * Create subtasks for an item
   */
  private static async createSubtasks(parentItemId: string, subtasks: Subtask[]): Promise<void> {
    try {
      const subtasksToInsert = subtasks.map((subtask, index) => ({
        parent_item_id: parentItemId,
        title: subtask.title,
        completed: subtask.completed ?? false,
        position: index
      }))

      const { error } = await supabase!
        .from('subtasks')
        .insert(subtasksToInsert)

      if (error) {
        throw this.logAndWrapError('createSubtasks.insert', error, {
          parentItemId,
          count: subtasks.length
        })
      }
    } catch (error) {
      throw this.logAndWrapError('createSubtasks', error, { parentItemId })
    }
  }

  /**
   * Map database item to MindFlowItem type
   */
  private static mapToMindFlowItem(data: RawItem): MindFlowItem {
    const subtasks = Array.isArray(data.subtasks)
      ? [...data.subtasks]
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map(subtask => ({
            id: subtask.id,
            title: subtask.title,
            completed: subtask.completed,
            createdAt: subtask.created_at
          }))
      : []

    return {
      id: data.id,
      title: data.title,
      completed: data.completed ?? false,
      createdAt: data.created_at,
      summary: data.summary ?? undefined,
      type: data.item_type,
      dueDate: data.due_date ?? undefined,
      dueDateISO: data.due_date_iso ?? undefined,
      subtasks,
      suggestions: data.suggestions ?? undefined,
      isGeneratingSubtasks: data.is_generating_subtasks,
      chatHistory: data.chat_history ?? [],
      transactionType: data.transaction_type ?? undefined,
      amount: data.amount ?? undefined,
      isRecurring: data.is_recurring,
      paymentMethod: data.payment_method ?? undefined,
      isPaid: data.is_paid,
      notes: data.notes ?? undefined
    }
  }

  /**
   * Set due date for an item
   */
  static async setDueDate(itemId: string, date: Date | null): Promise<void> {
    try {
      const updateData: Record<string, string | null> = {}

      if (date) {
        updateData.due_date = date.toLocaleDateString('pt-BR')
        updateData.due_date_iso = date.toISOString()
      } else {
        updateData.due_date = null
        updateData.due_date_iso = null
      }

      const { error } = await supabase!
        .from('mind_flow_items')
        .update(updateData)
        .eq('id', itemId)

      if (error) {
        throw this.logAndWrapError('setDueDate.update', error, { itemId })
      }
    } catch (error) {
      throw this.logAndWrapError('setDueDate', error, { itemId })
    }
  }

  static isNetworkError(error: unknown): error is Error {
    return error instanceof Error && error.name === 'SupabaseNetworkError'
  }

  private static logAndWrapError(operation: string, error: unknown, context: Record<string, unknown> = {}): Error {
    const fallbackMessage = `ItemsService.${operation} failed`
    const normalized = this.normalizeError(error, fallbackMessage) as LoggedError

    if (!normalized[ERROR_ALREADY_LOGGED]) {
      const metadata = this.extractSupabaseErrorContext(error)
      const networkContext = this.isNetworkError(normalized) ? { isNetworkError: true } : {}
      logger.error(fallbackMessage, normalized, {
        operation,
        ...context,
        ...(metadata ?? {}),
        ...networkContext
      })
      normalized[ERROR_ALREADY_LOGGED] = true
    }

    return normalized
  }

  private static normalizeError(error: unknown, fallbackMessage: string): Error {
    if (error instanceof Error) {
      if (!error.message) {
        error.message = fallbackMessage
      }

      if (this.isNetworkErrorMessage(error.message)) {
        return this.createNetworkError(fallbackMessage, error)
      }

      return error
    }

    if (typeof error === 'string' && error.trim().length > 0) {
      const trimmed = error.trim()

      if (this.isNetworkErrorMessage(trimmed)) {
        return this.createNetworkError(fallbackMessage, trimmed)
      }

      return new Error(trimmed)
    }

    if (typeof error === 'object' && error !== null) {
      const errRecord = error as Record<string, unknown>
      const code = typeof errRecord.code === 'string' && errRecord.code.trim().length > 0
        ? errRecord.code.trim()
        : undefined
      const textCandidates = (['message', 'details', 'hint', 'error', 'statusText'] as const)
        .map(key => {
          const value = errRecord[key]
          return typeof value === 'string' ? value.trim() : undefined
        })
        .filter((value): value is string => !!value)

      if (textCandidates.some(value => this.isNetworkErrorMessage(value))) {
        return this.createNetworkError(fallbackMessage, errRecord)
      }

      const seen = new Set<string>()
      const normalizedParts = textCandidates
        .map(value => value.replace(/\s+/g, ' ').trim())
        .filter(value => {
          if (!value) return false
          const key = value.toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })

      const parts: string[] = [fallbackMessage]
      if (code) {
        parts.push(`[${code}]`)
      }
      parts.push(...normalizedParts)

      const message = parts.join(' ').trim()
      return new Error(message || fallbackMessage)
    }

    if (error !== undefined) {
      const stringified = String(error).trim()

      if (this.isNetworkErrorMessage(stringified)) {
        return this.createNetworkError(fallbackMessage, error)
      }

      return stringified
        ? new Error(`${fallbackMessage}: ${stringified}`)
        : new Error(fallbackMessage)
    }

    return new Error(fallbackMessage)
  }

  private static extractSupabaseErrorContext(error: unknown): Record<string, unknown> | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined
    }

    const errRecord = error as Record<string, unknown>
    const context: Record<string, unknown> = {}

    const assignIfPresent = (key: string, targetKey = key) => {
      const value = errRecord[key]
      if (value === undefined || value === null) {
        return
      }

      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (trimmed.length > 0) {
          context[targetKey] = trimmed
        }
      } else {
        context[targetKey] = value
      }
    }

    assignIfPresent('code')
    assignIfPresent('details')
    assignIfPresent('hint')
    assignIfPresent('message', 'supabaseMessage')
    assignIfPresent('status')

    return Object.keys(context).length > 0 ? context : undefined
  }

  private static createNetworkError(fallbackMessage: string, raw: unknown): LoggedError {
    const error = new Error(`${fallbackMessage}: network request failed`) as LoggedError & { cause?: unknown }
    error.name = 'SupabaseNetworkError'
    error.cause = raw
    return error
  }

  private static isNetworkErrorMessage(value?: string | null): boolean {
    if (!value) {
      return false
    }

    const normalized = value.toLowerCase()
    return normalized.includes('failed to fetch')
      || normalized.includes('network request failed')
      || normalized.includes('network error')
      || normalized.includes('net::err')
      || normalized.includes('dns lookup')
  }
}
