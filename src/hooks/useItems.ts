import { useUser } from '@clerk/nextjs'
import { useState, useEffect, useCallback } from 'react'

import type { MindFlowItem } from '@/types'
import { logger } from '@/utils/logger'

interface ItemsResponse {
  items: MindFlowItem[]
  error?: string
}

interface ItemResponse {
  item: MindFlowItem
  error?: string
}

const isNetworkError = (error: unknown): boolean => error instanceof TypeError

const RESPONSE_BODY_SNIPPET_LIMIT = 180

class ApiResponseParseError extends Error {
  details: Record<string, unknown>

  constructor(message: string, details: Record<string, unknown>) {
    super(message)
    this.name = 'ApiResponseParseError'
    this.details = details
  }
}

const isApiResponseParseError = (error: unknown): error is ApiResponseParseError => error instanceof ApiResponseParseError

const truncateSnippet = (value: string): string => {
  if (!value) {
    return ''
  }
  return value.length > RESPONSE_BODY_SNIPPET_LIMIT ? `${value.slice(0, RESPONSE_BODY_SNIPPET_LIMIT)}...` : value
}

const withParseErrorDetails = (base: Record<string, unknown>, error: unknown): Record<string, unknown> => {
  if (isApiResponseParseError(error)) {
    return {
      ...base,
      ...error.details
    }
  }
  return base
}

const parseJsonResponse = async <T>(response: Response, context: string): Promise<T | null> => {
  const contentType = response.headers.get('content-type') ?? 'unknown'
  const rawBody = await response.text()
  const trimmedBody = rawBody.trim()
  const expectsJson = contentType.includes('application/json')

  if (!trimmedBody) {
    if (!expectsJson && response.status !== 204) {
      throw new ApiResponseParseError('Resposta invalida do servidor', {
        context,
        status: response.status,
        contentType
      })
    }
    return null
  }

  if (!expectsJson) {
    throw new ApiResponseParseError('Resposta invalida do servidor', {
      context,
      status: response.status,
      contentType,
      snippet: truncateSnippet(trimmedBody)
    })
  }

  try {
    return JSON.parse(trimmedBody) as T
  } catch (error) {
    throw new ApiResponseParseError('Resposta invalida do servidor', {
      context,
      status: response.status,
      contentType,
      snippet: truncateSnippet(trimmedBody),
      originalError: error instanceof Error ? error.message : String(error)
    })
  }
}

export function useItems() {
  const { user, isLoaded } = useUser()

  const [items, setItems] = useState<MindFlowItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    // Temporarily allow loading without user for testing
    // if (!user) {
    //   logger.debug('No user available for items hook', { hook: 'useItems' })
    //   return
    // }

    logger.info('Loading items for user', { userId: user?.id || 'test-user', hook: 'useItems' })

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/items', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      const data = await parseJsonResponse<ItemsResponse>(response, 'loadItems')
      if (!response.ok) {
        throw new Error(data?.error ?? 'Falha ao carregar itens')
      }
      const loadedItems = data?.items ?? []

      logger.info('Loaded items from database', { count: loadedItems.length, hook: 'useItems' })
      setItems(loadedItems)
    } catch (err) {
      const networkError = isNetworkError(err)
      if (networkError) {
        logger.warn('Database unavailable (network)', { hook: 'useItems' })
      } else {
        logger.error('Error loading items from database', err, withParseErrorDetails({ hook: 'useItems' }, err))
      }
      setError('Erro ao carregar itens')

      // Fallback to localStorage if database fails
      logger.warn('Falling back to localStorage', {
        hook: 'useItems',
        reason: networkError ? 'network' : 'database-error'
      })
      try {
        const stored = localStorage.getItem('zenith-tasks-items')
        if (stored && stored.trim()) {
          const localItems = JSON.parse(stored)
          logger.info('Loaded from localStorage', { count: localItems.length, hook: 'useItems' })
          setItems(localItems)
        }
      } catch (e) {
        logger.error('Failed to load from localStorage', e, { hook: 'useItems' })
        // Limpar storage corrompido
        try {
          localStorage.removeItem('zenith-tasks-items')
        } catch {}
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load items when user is authenticated
  useEffect(() => {
    // Temporarily allow loading without user for testing
    if (!isLoaded) {
      setIsLoading(false)
      return
    }

    loadItems()
  }, [isLoaded, loadItems])

  const addItem = useCallback(async (item: Omit<MindFlowItem, 'id' | 'createdAt'>): Promise<MindFlowItem | null> => {
    // Temporarily allow adding items without user (test-user fallback in API)
    // if (!user) {
    //   logger.debug('Cannot add item - no user', { hook: 'useItems' })
    //   return null
    // }

    logger.info('Adding item to database', { title: item.title, userId: user?.id || 'test-user', hook: 'useItems' })

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(item)
      })

      const data = await parseJsonResponse<ItemResponse>(response, 'addItem')

      if (!response.ok || !data?.item) {
        throw new Error(data?.error ?? 'Falha ao criar item')
      }

      logger.info('Item saved to database', { itemId: data.item.id, hook: 'useItems' })
      setItems(prev => [data.item, ...prev])
      return data.item
    } catch (err) {
      logger.error('Error saving to database', err, withParseErrorDetails({ hook: 'useItems' }, err))
      setError('Erro ao criar item')
      return null
    }
  }, [])

  const updateItem = useCallback(async (itemId: string, updates: Partial<MindFlowItem>) => {
    // Temporarily allow updating items without user (test-user fallback in API)
    // if (!user) return

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const data = await parseJsonResponse<{ error?: string }>(response, 'updateItem')
        throw new Error(data?.error ?? 'Falha ao atualizar item')
      }

      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ))
    } catch (err) {
      logger.error('Error updating item', err, withParseErrorDetails({ itemId, hook: 'useItems' }, err))
      setError('Erro ao atualizar item')
    }
  }, [])

  const deleteItem = useCallback(async (itemId: string) => {
    // Temporarily allow deleting items without user (test-user fallback in API)
    // if (!user) return

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await parseJsonResponse<{ error?: string }>(response, 'deleteItem')
        throw new Error(data?.error ?? 'Falha ao deletar item')
      }

      setItems(prev => prev.filter(item => item.id !== itemId))
    } catch (err) {
      logger.error('Error deleting item', err, withParseErrorDetails({ itemId, hook: 'useItems' }, err))
      setError('Erro ao deletar item')
    }
  }, [])

  const toggleItem = useCallback(async (itemId: string) => {
    // Temporarily allow toggling items without user (test-user fallback in API)
    // if (!user) return

    try {
      const response = await fetch(`/api/items/${itemId}/toggle`, {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await parseJsonResponse<{ error?: string }>(response, 'toggleItem')
        throw new Error(data?.error ?? 'Falha ao alternar item')
      }

      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ))
    } catch (err) {
      logger.error('Error toggling item', err, withParseErrorDetails({ itemId, hook: 'useItems' }, err))
      setError('Erro ao alternar item')
    }
  }, [])

  const clearCompleted = useCallback(async () => {
    // Temporarily allow clearing items without user (test-user fallback in API)
    // if (!user) return

    try {
      const response = await fetch('/api/items/clear-completed', {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await parseJsonResponse<{ error?: string }>(response, 'clearCompleted')
        throw new Error(data?.error ?? 'Falha ao limpar itens concluídos')
      }

      setItems(prev => prev.filter(item => !item.completed))
    } catch (err) {
      logger.error('Error clearing completed', err, withParseErrorDetails({ userId: user?.id || 'test-user', hook: 'useItems' }, err))
      setError('Erro ao limpar completados')
    }
  }, [])

  interface RecurrenceConfig {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | null;
    interval: number;
    endDate?: string;
    days?: string[];
  }

  const setDueDate = useCallback(async (itemId: string, date: Date | null, recurrence?: RecurrenceConfig) => {
    // Temporarily allow setting due date without user (test-user fallback in API)
    // if (!user) return

    try {
      const payload = date
        ? {
            dueDate: date.toLocaleDateString('pt-BR'),
            dueDateISO: date.toISOString(),
            // Recurrence fields
            recurrenceType: recurrence?.type || null,
            recurrenceInterval: recurrence?.interval || null,
            recurrenceEndDate: recurrence?.endDate || null,
            recurrenceDays: recurrence?.days || null,
          }
        : {
            dueDate: null,
            dueDateISO: null,
            recurrenceType: null,
            recurrenceInterval: null,
            recurrenceEndDate: null,
            recurrenceDays: null,
          }

      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await parseJsonResponse<{ error?: string }>(response, 'setDueDate')
        throw new Error(data?.error ?? 'Falha ao definir data')
      }

      setItems(prev => prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              dueDate: date ? date.toLocaleDateString('pt-BR') : undefined,
              dueDateISO: date ? date.toISOString() : undefined,
              recurrenceType: recurrence?.type || undefined,
              recurrenceInterval: recurrence?.interval || undefined,
              recurrenceEndDate: recurrence?.endDate || undefined,
              recurrenceDays: recurrence?.days || undefined,
            }
          : item
      ))
    } catch (err) {
      logger.error('Error setting due date', err, withParseErrorDetails({ itemId, hook: 'useItems' }, err))
      setError('Erro ao definir data')
    }
  }, [])

  return {
    items,
    isLoading,
    error,
    addItem,
    updateItem,
    deleteItem,
    toggleItem,
    clearCompleted,
    setDueDate,
    refreshItems: loadItems
  }
}
