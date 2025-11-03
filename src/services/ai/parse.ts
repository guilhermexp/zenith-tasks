import type { MindFlowItem, MindFlowItemType, Subtask, ChatMessage } from "@/types"
import { naturalToISO } from "@/utils/date"

export const ALLOWED_TYPES: MindFlowItemType[] = [
  'Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro'
]

export function extractJson(text: string): any | null {
  if (!text) return null
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  try { return JSON.parse(cleaned) } catch {}

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    const slice = cleaned.slice(start, end + 1)
    try { return JSON.parse(slice) } catch {}
  }
  return null
}

function toISO(dateStr?: string | null, textForFallback?: string): { br?: string; iso?: string } {
  if (!dateStr && textForFallback) {
    const nat = naturalToISO(textForFallback)
    if (nat) dateStr = nat
  }
  if (!dateStr) return {}
  const d = /\d{4}-\d{2}-\d{2}/.test(dateStr) ? new Date(dateStr + 'T00:00:00') : new Date(dateStr)
  if (Number.isNaN(d.getTime())) return {}
  const iso = d.toISOString()
  const br = d.toLocaleDateString('pt-BR')
  return { br, iso }
}

export function coerceItems(json: any): MindFlowItem[] {
  if (!json || !Array.isArray(json.items)) return []
  const now = new Date()
  return json.items.map((it: any) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    const type = (ALLOWED_TYPES.includes(it.type) ? it.type : 'Nota') as MindFlowItemType
    const textForFallback = `${it.title || ''} ${it.summary || ''}`.trim()
    const { br, iso } = toISO(it.dueDate, textForFallback)
    const base: MindFlowItem = {
      id,
      title: String(it.title || 'Sem título').slice(0, 200),
      type,
      completed: false,
      createdAt: now.toISOString(),
      summary: it.summary || undefined,
      dueDate: br,
      dueDateISO: iso,
    }
    if (Array.isArray(it.subtasks)) {
      base.subtasks = it.subtasks.map((s: any): Subtask => ({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        title: String(s.title || '').slice(0, 160),
        completed: !!s.completed,
        createdAt: now.toISOString(),
      }))
    }
    if (type === 'Financeiro') {
      base.amount = Number(it.amount || 0)
      base.transactionType = (it.transactionType === 'Entrada' ? 'Entrada' : 'Saída')
      base.isPaid = !!it.isPaid
    }
    return base
  })
}

export function trimHistory(history: ChatMessage[], limit = 10): ChatMessage[] {
  if (!history) return []
  return history.slice(Math.max(0, history.length - limit))
}

