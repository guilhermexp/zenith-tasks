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

      const data = (await response.json()) as ItemsResponse
      if (!response.ok) {
        throw new Error(data.error ?? 'Falha ao carregar itens')
      }
      const loadedItems = data.items ?? []

      logger.info('Loaded items from database', { count: loadedItems.length, hook: 'useItems' })
      setItems(loadedItems)
    } catch (err) {
      const networkError = isNetworkError(err)
      if (networkError) {
        logger.warn('Database unavailable (network)', { hook: 'useItems' })
      } else {
        logger.error('Error loading items from database', err, { hook: 'useItems' })
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

      const data = (await response.json()) as ItemResponse
      if (!response.ok) {
        throw new Error(data.error ?? 'Falha ao criar item')
      }
      logger.info('Item saved to database', { itemId: data.item.id, hook: 'useItems' })
      setItems(prev => [data.item, ...prev])
      return data.item
    } catch (err) {
      logger.error('Error saving to database', err, { hook: 'useItems' })
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
        const data = await response.json()
        throw new Error(data?.error ?? 'Falha ao atualizar item')
      }

      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ))
    } catch (err) {
      logger.error('Error updating item', err, { itemId, hook: 'useItems' })
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
        const data = await response.json()
        throw new Error(data?.error ?? 'Falha ao deletar item')
      }

      setItems(prev => prev.filter(item => item.id !== itemId))
    } catch (err) {
      logger.error('Error deleting item', err, { itemId, hook: 'useItems' })
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
        const data = await response.json()
        throw new Error(data?.error ?? 'Falha ao alternar item')
      }

      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ))
    } catch (err) {
      logger.error('Error toggling item', err, { itemId, hook: 'useItems' })
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
        const data = await response.json()
        throw new Error(data?.error ?? 'Falha ao limpar itens concluídos')
      }

      setItems(prev => prev.filter(item => !item.completed))
    } catch (err) {
      logger.error('Error clearing completed', err, { userId: user?.id || 'test-user', hook: 'useItems' })
      setError('Erro ao limpar completados')
    }
  }, [])

  const setDueDate = useCallback(async (itemId: string, date: Date | null) => {
    // Temporarily allow setting due date without user (test-user fallback in API)
    // if (!user) return

    try {
      const payload = date
        ? {
            dueDate: date.toLocaleDateString('pt-BR'),
            dueDateISO: date.toISOString()
          }
        : {
            dueDate: null,
            dueDateISO: null
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
        const data = await response.json()
        throw new Error(data?.error ?? 'Falha ao definir data')
      }

      setItems(prev => prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              dueDate: date ? date.toLocaleDateString('pt-BR') : undefined,
              dueDateISO: date ? date.toISOString() : undefined
            }
          : item
      ))
    } catch (err) {
      logger.error('Error setting due date', err, { itemId, hook: 'useItems' })
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
