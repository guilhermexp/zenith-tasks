/**
 * Utility functions for filtering items
 */

import type { MindFlowItem, MindFlowItemType } from '@/types'

/**
 * Filter items by type
 */
export function filterItemsByType(items: MindFlowItem[], type: MindFlowItemType): MindFlowItem[] {
  return items.filter(item => item.type === type)
}

/**
 * Filter items by search query
 */
export function filterItemsBySearch(items: MindFlowItem[], query: string): MindFlowItem[] {
  if (!query.trim()) return items

  const lowerQuery = query.toLowerCase()
  return items.filter(item =>
    item.title.toLowerCase().includes(lowerQuery) ||
    item.summary?.toLowerCase().includes(lowerQuery) ||
    item.type.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get items for navigation section
 */
export function getItemsForNav(items: MindFlowItem[], navId: string): MindFlowItem[] {
  switch (navId) {
    case 'caixa-entrada':
      return items
    case 'tarefas':
      return filterItemsByType(items, 'Tarefa')
    case 'ideias':
      return filterItemsByType(items, 'Ideia')
    case 'notas':
      return filterItemsByType(items, 'Nota')
    case 'lembretes':
      return filterItemsByType(items, 'Lembrete')
    default:
      return items
  }
}

/**
 * Find item by ID
 */
export function findItemById(items: MindFlowItem[], itemId: string): MindFlowItem | undefined {
  return items.find(i => i.id === itemId)
}