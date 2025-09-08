import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { ItemsService } from '@/services/database/items'
import type { MindFlowItem } from '@/types'

export function useSupabaseItems() {
  const { user, isLoaded } = useUser()
  const [items, setItems] = useState<MindFlowItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load items when user is authenticated
  useEffect(() => {
    if (!isLoaded || !user) {
      setIsLoading(false)
      return
    }

    loadItems()
  }, [user, isLoaded])

  const loadItems = useCallback(async () => {
    if (!user) {
      console.log('🔴 No user found for Supabase')
      return
    }

    console.log('🟢 Loading items for user:', user.id)
    
    try {
      setIsLoading(true)
      setError(null)
      const loadedItems = await ItemsService.loadItems(user.id)
      console.log('✅ Loaded from Supabase:', loadedItems.length, 'items')
      setItems(loadedItems)
    } catch (err) {
      console.error('❌ Error loading from Supabase:', err)
      setError('Erro ao carregar itens')
      
      // Fallback to localStorage if Supabase fails
      console.warn('⚠️ Falling back to localStorage')
      try {
        const stored = localStorage.getItem('zenith-tasks-items')
        if (stored) {
          const localItems = JSON.parse(stored)
          console.log('📦 Loaded from localStorage:', localItems.length, 'items')
          setItems(localItems)
        }
      } catch (e) {
        console.error('Failed to load from localStorage:', e)
      }
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const addItem = useCallback(async (item: Omit<MindFlowItem, 'id' | 'createdAt'>): Promise<MindFlowItem | null> => {
    if (!user) {
      console.log('🔴 Cannot add item - no user')
      return null
    }

    console.log('🔵 Adding item to Supabase:', item.title)
    
    try {
      const newItem = await ItemsService.createItem(user.id, item)
      console.log('✅ Item saved to Supabase:', newItem.id)
      setItems(prev => [newItem, ...prev])
      return newItem
    } catch (err) {
      console.error('❌ Error saving to Supabase:', err)
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
      console.error('Error updating item:', err)
      setError('Erro ao atualizar item')
    }
  }, [user])

  const deleteItem = useCallback(async (itemId: string) => {
    if (!user) return

    try {
      await ItemsService.deleteItem(itemId)
      setItems(prev => prev.filter(item => item.id !== itemId))
    } catch (err) {
      console.error('Error deleting item:', err)
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
      console.error('Error toggling item:', err)
      setError('Erro ao alternar item')
    }
  }, [user])

  const clearCompleted = useCallback(async () => {
    if (!user) return

    try {
      await ItemsService.clearCompleted(user.id)
      setItems(prev => prev.filter(item => !item.completed))
    } catch (err) {
      console.error('Error clearing completed:', err)
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
      console.error('Error setting due date:', err)
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