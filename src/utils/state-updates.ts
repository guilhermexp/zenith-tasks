/**
 * Utility functions for updating component state
 */

import type { MindFlowItem } from '@/types'

/**
 * Update active item state if it matches the given ID
 */
export function updateActiveItemState(
  activeItem: MindFlowItem | null,
  itemId: string,
  updates: Partial<MindFlowItem>,
  setActiveItem: React.Dispatch<React.SetStateAction<MindFlowItem | null>>
): void {
  if (activeItem?.id === itemId) {
    setActiveItem(prev => prev ? { ...prev, ...updates } : null)
  }
}

/**
 * Clear active item state if it matches the given ID
 */
export function clearActiveItemState(
  activeItem: MindFlowItem | null,
  itemId: string,
  setActiveItem: React.Dispatch<React.SetStateAction<MindFlowItem | null>>
): void {
  if (activeItem?.id === itemId) {
    setActiveItem(null)
  }
}

/**
 * Set item as generating subtasks
 */
export function setGeneratingSubtasks(
  itemId: string,
  isGenerating: boolean,
  activeItem: MindFlowItem | null,
  setActiveItem: React.Dispatch<React.SetStateAction<MindFlowItem | null>>
): void {
  updateActiveItemState(activeItem, itemId, { isGeneratingSubtasks: isGenerating }, setActiveItem)
}