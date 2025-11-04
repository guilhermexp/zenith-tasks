import { generateObject, generateText } from 'ai'

import { getAISDKModel } from '@/server/aiProvider'
import type { MindFlowItem, ChatMessage, MindFlowItemType } from '@/types'

import { extractJson, coerceItems, trimHistory } from './parse'
import { buildAnalyzePrompt, buildSubtasksPrompt } from './prompts'

export async function analyzeWithAI(text: string): Promise<MindFlowItem[]> {
  const prompt = buildAnalyzePrompt(text)
  const model = await getAISDKModel()
  // Let the API layer validate shape when needed; keep parser fallback here
  try {
    const { z } = await import('zod')
    const meetingDetailsSchema = z.object({
      date: z.string().optional(),
      time: z.string().optional(),
      participants: z.array(z.string()).optional(),
      location: z.string().optional(),
      agenda: z.array(z.string()).optional(),
      links: z.array(z.string()).optional()
    }).partial()
    const itemSchema = z.object({
      title: z.string(),
      type: z.enum(['Tarefa','Ideia','Nota','Lembrete','Financeiro','Reunião']),
      summary: z.string().optional(),
      dueDate: z.string().nullable().optional(),
      subtasks: z.array(z.object({ title: z.string() })).optional(),
      amount: z.number().optional(),
      transactionType: z.enum(['Entrada','Saída']).optional(),
      meetingDetails: meetingDetailsSchema.optional()
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
  const words = text.replace(/[^a-z0-9áàâãéêíóôõúüç\s]/gi, ' ').split(/\s+/).filter(Boolean)
  const wordCount = words.length

  const simpleHints = [
    /passear/, /caminh(ar|ada)/, /ligar( para)?/, /enviar e?-?mail/, /pagar (a )?conta/,
    /compr(ar|as)( (pão|leite|café|mercado))?/, /ir ao mercado/, /levar.*(lixo|cachorro|filho)/,
    /lavar/, /arrumar cama/, /reg(ar|a) plantas/
  ]
  if (simpleHints.some(r => r.test(text))) return 'simple'

  const meetingKeywords = /(reuni(ã|a)o|one[-\s]?on[-\s]?one|1:1|sync|alinhamento|call|meet|encontro)/
  const projectKeywords = /(planejar|planejamento|organizar|estruturar|preparar|cronograma|roadmap|campanha|projeto|lançamento|implementa|integrar|arquitet|diagn[oó]stic|auditoria|apresenta(ç|c)ão|estrat(é|e)gia|briefing|kickoff|okrs|keynote|proposta|orçamento|pesquisa|workshop|onboarding|treinamento|revis(ão|ar)|relat[óo]rio|retro|sprint|deploy|migra(ç|c)ão|configur(ar|ação)|backup|atualiz(ar|ação)|documentar|corrig(ir|indo|ido|e|a)|analis(ar|e)|auditar)/
  const complexTriggers = /(projeto|lançamento|implementa|integra|arquitet|especifica(ç|c)ão|workshop|roadmap|campanha|cronograma|okrs|apresenta(ç|c)ão|estrat(é|e)gia|due diligence|benchmark|planejamento estratégico|oficina|treinamento intensivo)/

  if (complexTriggers.test(text)) return 'complex'
  if (wordCount >= 12) return 'complex'

  if (meetingKeywords.test(text)) {
    return wordCount >= 8 ? 'complex' : 'medium'
  }

  if (projectKeywords.test(text)) {
    if (wordCount >= 9) return 'complex'
    return 'medium'
  }

  if (wordCount <= 3) return 'simple'
  if (wordCount <= 5) return 'medium'

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
