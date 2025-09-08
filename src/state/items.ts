import type { MindFlowItem } from '@/types'

const STORAGE_KEY = 'zenith-tasks-items'

export function load(): MindFlowItem[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try { return JSON.parse(raw) as MindFlowItem[] } catch { return [] }
}

export function save(items: MindFlowItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function toggle(items: MindFlowItem[], id: string) {
  return items.map(i => i.id === id ? { ...i, completed: !i.completed } : i)
}

export function update(items: MindFlowItem[], id: string, updates: Partial<MindFlowItem>) {
  return items.map(i => i.id === id ? { ...i, ...updates } : i)
}

export function remove(items: MindFlowItem[], id: string) {
  return items.filter(i => i.id !== id)
}

export function setDueDate(items: MindFlowItem[], id: string, date: Date | null) {
  return items.map(i => i.id === id ? {
    ...i,
    dueDate: date ? date.toLocaleDateString('pt-BR') : undefined,
    dueDateISO: date ? date.toISOString() : undefined,
  } : i)
}

export function clearCompleted(items: MindFlowItem[]) {
  return items.filter(i => !i.completed)
}

