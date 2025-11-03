import { useUser } from '@clerk/nextjs'
import { useState, useEffect, useCallback } from 'react'

import { ItemsService } from '@/services/database/items'
import type { MindFlowItem } from '@/types'
import { logger } from '@/utils/logger'

export function useSupabaseItems() {
  const { user, isLoaded } = useUser()

  const [items, setItems] = useState<MindFlowItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    if (!user) {
      logger.debug('No user found for Supabase', { hook: 'useSupabaseItems' })
      return
    }

    logger.info('Loading items for user', { userId: user.id, hook: 'useSupabaseItems' })

    try {
      setIsLoading(true)
      setError(null)
      const loadedItems = await ItemsService.loadItems(user.id)
      logger.info('Loaded from Supabase', { count: loadedItems.length, hook: 'useSupabaseItems' })
      setItems(loadedItems)
    } catch (err) {
      const networkError = ItemsService.isNetworkError(err)
      if (networkError) {
        logger.warn('Supabase unavailable (network)', { hook: 'useSupabaseItems' })
      } else {
        logger.error('Error loading from Supabase', err, { hook: 'useSupabaseItems' })
      }
      setError('Erro ao carregar itens')

      // Fallback to localStorage if Supabase fails
      logger.warn('Falling back to localStorage', {
        hook: 'useSupabaseItems',
        reason: networkError ? 'network' : 'supabase-error'
      })
      try {
        const stored = localStorage.getItem('zenith-tasks-items')
        if (stored && stored.trim()) {
          const localItems = JSON.parse(stored)
          logger.info('Loaded from localStorage', { count: localItems.length, hook: 'useSupabaseItems' })
          setItems(localItems)
        }
      } catch (e) {
        logger.error('Failed to load from localStorage', e, { hook: 'useSupabaseItems' })
        // Limpar storage corrompido
        try {
          localStorage.removeItem('zenith-tasks-items')
        } catch {}
      }
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Load items when user is authenticated
  useEffect(() => {
    if (!isLoaded || !user) {
      setIsLoading(false)
      return
    }

    loadItems()
  }, [user, isLoaded, loadItems])

  const addItem = useCallback(async (item: Omit<MindFlowItem, 'id' | 'createdAt'>): Promise<MindFlowItem | null> => {
    if (!user) {
      logger.debug('Cannot add item - no user', { hook: 'useSupabaseItems' })
      return null
    }

    logger.info('Adding item to Supabase', { title: item.title, hook: 'useSupabaseItems' })

    try {
      const newItem = await ItemsService.createItem(user.id, item)
      logger.info('Item saved to Supabase', { itemId: newItem.id, hook: 'useSupabaseItems' })
      setItems(prev => [newItem, ...prev])
      return newItem
    } catch (err) {
      logger.error('Error saving to Supabase', err, { hook: 'useSupabaseItems' })
      setError('Erro ao criar item')
      return null
    }
  }, [user])

  const updateItem = useCallback(async (itemId: string, updates: Partial<MindFlowItem>) => {
    if (!user) return

    try {
      await ItemsService.updateItem(itemId, updates)
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ))
    } catch (err) {
      logger.error('Error updating item', err, { itemId, hook: 'useSupabaseItems' })
      setError('Erro ao atualizar item')
    }
  }, [user])

  const deleteItem = useCallback(async (itemId: string) => {
    if (!user) return

    try {
      await ItemsService.deleteItem(itemId)
      setItems(prev => prev.filter(item => item.id !== itemId))
    } catch (err) {
      logger.error('Error deleting item', err, { itemId, hook: 'useSupabaseItems' })
      setError('Erro ao deletar item')
    }
  }, [user])

  const toggleItem = useCallback(async (itemId: string) => {
    if (!user) return

    try {
      await ItemsService.toggleItem(itemId)
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ))
    } catch (err) {
      logger.error('Error toggling item', err, { itemId, hook: 'useSupabaseItems' })
      setError('Erro ao alternar item')
    }
  }, [user])

  const clearCompleted = useCallback(async () => {
    if (!user) return

    try {
      await ItemsService.clearCompleted(user.id)
      setItems(prev => prev.filter(item => !item.completed))
    } catch (err) {
      logger.error('Error clearing completed', err, { userId: user.id, hook: 'useSupabaseItems' })
      setError('Erro ao limpar completados')
    }
  }, [user])

  const setDueDate = useCallback(async (itemId: string, date: Date | null) => {
    if (!user) return

    try {
      await ItemsService.setDueDate(itemId, date)
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
      logger.error('Error setting due date', err, { itemId, hook: 'useSupabaseItems' })
      setError('Erro ao definir data')
    }
  }, [user])

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
