import type { MindFlowItem, MindFlowItemType, Subtask } from "@/types"
import { naturalToISO } from "@/utils/date"

export const ALLOWED_TYPES: MindFlowItemType[] = [
  'Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião'
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
    if (type === 'Reunião' && it.meetingDetails && typeof it.meetingDetails === 'object') {
      const details = it.meetingDetails
      const meetingDateRaw = typeof details.date === 'string' ? details.date : undefined
      const { br: meetingBr, iso: meetingIso } = toISO(meetingDateRaw, textForFallback)
      const normalizedDate = meetingIso ? meetingIso.split('T')[0] : meetingDateRaw
      base.meetingDetails = {
        date: normalizedDate,
        time: typeof details.time === 'string' ? details.time : undefined,
        location: typeof details.location === 'string' ? details.location : undefined,
        links: Array.isArray(details.links) ? details.links.map((link: any) => String(link)).filter(Boolean) : undefined,
        participants: Array.isArray(details.participants) ? details.participants.map((p: any) => String(p)).filter(Boolean) : undefined,
        agenda: Array.isArray(details.agenda) ? details.agenda.map((a: any) => String(a)).filter(Boolean) : undefined,
      }
      if (!base.dueDateISO && meetingIso) {
        base.dueDateISO = meetingIso
        base.dueDate = meetingBr
      }
    }
    return base
  })
}
