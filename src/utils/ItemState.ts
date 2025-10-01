import { MindFlowItem } from '../types';

const STORAGE_KEY = 'zenith-tasks-items';

export const ItemState = {
  load(): MindFlowItem[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored || !stored.trim()) return [];
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn('[ItemState] Failed to parse localStorage, clearing corrupted data');
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      return [];
    }
  },

  save(items: MindFlowItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },

  toggle(items: MindFlowItem[], id: string): MindFlowItem[] {
    return items.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
  },

  update(items: MindFlowItem[], itemId: string, updates: Partial<MindFlowItem>): MindFlowItem[] {
    return items.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
  },

  remove(items: MindFlowItem[], itemId: string): MindFlowItem[] {
    return items.filter(item => item.id !== itemId);
  },

  setDueDate(items: MindFlowItem[], itemId: string, date: Date | null): MindFlowItem[] {
    return items.map(item =>
      item.id === itemId
        ? {
            ...item,
            dueDate: date ? date.toLocaleDateString('pt-BR') : undefined,
            dueDateISO: date ? date.toISOString() : undefined
          }
        : item
    );
  },

  clearCompleted(items: MindFlowItem[]): MindFlowItem[] {
    return items.filter(item => !item.completed);
  }
};