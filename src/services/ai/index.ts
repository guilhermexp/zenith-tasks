import type { MindFlowItem, ChatMessage, MindFlowItemType } from '@/types'
import { extractJson, coerceItems, trimHistory } from './parse'
import { buildAnalyzePrompt, buildSubtasksPrompt } from './prompts'
import { getAISDKModel } from '@/server/aiProvider'
import { generateObject, generateText } from 'ai'

export async function analyzeWithAI(text: string): Promise<MindFlowItem[]> {
  const prompt = buildAnalyzePrompt(text)
  const model = await getAISDKModel()
  // Let the API layer validate shape when needed; keep parser fallback here
  try {
    const { z } = await import('zod')
    const itemSchema = z.object({
      title: z.string(),
      type: z.enum(['Tarefa','Ideia','Nota','Lembrete','Financeiro','Reunião']),
      summary: z.string().optional(),
      dueDate: z.string().nullable().optional(),
      subtasks: z.array(z.object({ title: z.string() })).optional(),
      amount: z.number().optional(),
      transactionType: z.enum(['Entrada','Saída']).optional()
    })
    const schema = z.object({ items: z.array(itemSchema).default([]) })
    const res = await generateObject({ model, schema, prompt })
    return coerceItems(res.object)
  } catch {
    // Fallback to free-form parse if schema call fails
    const res = await generateText({ model, prompt })
    const parsed = extractJson(res.text)
    return coerceItems(parsed)
  }
}

export async function subtasksWithAI(item: { title: string; summary?: string; type?: MindFlowItemType }, opts?: { force?: boolean }) {
  const level0 = estimateComplexity(item.title, item.summary)
  const level = opts?.force ? (level0 === 'simple' ? 'medium' : level0) : level0
  if (!opts?.force && level === 'simple') return []
  const prompt = buildSubtasksPrompt(item.title, item.summary, item.type, level)
  const model = await getAISDKModel()
  let parsed: any
  try {
    const { z } = await import('zod')
    const schema = z.object({ subtasks: z.array(z.object({ title: z.string() })).default([]) })
    const res = await generateObject({ model, schema, prompt })
    parsed = res.object
  } catch {
    const res = await generateText({ model, prompt })
    parsed = extractJson(res.text)
  }
  let list: string[] = Array.isArray(parsed?.subtasks) ? parsed.subtasks.map((s: any) => String(s.title || '').trim()).filter(Boolean) : []
  // Pós-processamento: limitar tamanho conforme complexidade e remover trivialidades comuns
  const trivial = /(retornar|voltar|lavar as mãos|pegar (a |o )?(chave|coleira|guia)|sair de casa)/i
  list = list.filter(t => !trivial.test(t))
  const cap = level === 'medium' ? 3 : 6
  return list.slice(0, cap)
}

export function estimateComplexity(title: string, summary?: string): 'simple'|'medium'|'complex' {
  const text = `${title} ${summary || ''}`.toLowerCase()
  const simpleHints = [/passear/, /caminh(ar|ada)/, /ligar/, /enviar e?-?mail/, /pagar conta/, /comprar pão|leite/, /ir ao mercado/, /levar.*(lixo|cachorro)/]
  if (simpleHints.some(r => r.test(text)) || text.split(' ').length <= 4) return 'simple'
  const complexHints = [/planejar|organizar|projeto|lançamento|apresenta(ç|c)ão|estrat(é|e)gia|pesquisa|integrar|arquitetura|especifica(ç|c)ão/, /reuni(ã|a)o|workshop/]
  if (complexHints.some(r => r.test(text)) || text.split(' ').length >= 10) return 'complex'
  return 'medium'
}

export async function chatForItem(itemContext: { title: string; type: string; summary?: string; financeInfo?: string; history?: ChatMessage[] }, message: string) {
  const model = await getAISDKModel()
  const history = trimHistory(itemContext.history || [], 10).map(m => ({
    role: m.role === 'model' ? 'assistant' as const : 'user' as const,
    content: [{ type: 'text' as const, text: m.parts?.[0]?.text || '' }]
  }))
  const context = `Você está ajudando com este item. Seja conciso e prático.\nTítulo: ${itemContext.title}\nTipo: ${itemContext.type}\nResumo: ${itemContext.summary || '—'}\n${itemContext.financeInfo || ''}`
  const { text } = await generateText({
    model,
    messages: [
      ...history,
      { role: 'user', content: [ { type: 'text', text: context + '\n\nPergunta: ' + message } ] }
    ]
  })
  return text
}
