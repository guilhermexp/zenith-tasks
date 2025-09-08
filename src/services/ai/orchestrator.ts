import type { GeminiClient } from './client'
import type { MindFlowItem } from '@/types'
import { analyzeWithAI } from './index'
import { naturalToISO } from '@/utils/date'

// Pós-processamento por tipo para garantir regras de UX do app
export async function analyzeInput(api: GeminiClient, text: string): Promise<MindFlowItem[]> {
  const items = await analyzeWithAI(api, text)
  const now = new Date().toISOString()

  const processed: MindFlowItem[] = items.map((i) => {
    const clone: MindFlowItem = { ...i }

    // Regras por tipo
    switch (clone.type) {
      case 'Ideia': {
        // Ideias não viram tarefas automaticamente. Converta subtarefas em sugestões.
        if (clone.subtasks && clone.subtasks.length) {
          clone.suggestions = clone.subtasks.map(s => s.title).filter(Boolean)
        }
        delete clone.subtasks
        break
      }
      case 'Nota': {
        // Nota é texto livre; garantir que não tenha subtarefas
        delete clone.subtasks
        break
      }
      case 'Lembrete': {
        // Lembrete deve ter data; tentar inferir caso falte
        if (!clone.dueDateISO) {
          const nat = naturalToISO(`${clone.title} ${clone.summary || ''}`)
          if (nat) {
            const d = new Date(nat)
            clone.dueDateISO = d.toISOString()
            clone.dueDate = d.toLocaleDateString('pt-BR')
          }
        }
        break
      }
      case 'Financeiro': {
        // Já vem normalizado na camada de parse
        break
      }
      case 'Reunião': {
        // Placeholder para integração futura (transcript/resumo). Manter como está.
        break
      }
      case 'Tarefa':
      default:
        break
    }

    // Garantias gerais
    clone.id = clone.id || (Date.now().toString() + Math.random().toString(36).slice(2))
    clone.createdAt = clone.createdAt || now
    clone.completed = !!clone.completed
    return clone
  })

  return processed
}
