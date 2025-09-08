import type { GeminiClient } from './client'
import type { MindFlowItem, ChatMessage, MindFlowItemType } from '@/types'
import { extractJson, coerceItems, trimHistory } from './parse'
import { buildAnalyzePrompt, buildSubtasksPrompt } from './prompts'

export async function analyzeWithAI(api: GeminiClient, text: string): Promise<MindFlowItem[]> {
  const prompt = buildAnalyzePrompt(text)
  const model = api.modelJson()
  const result = await model.generateContent(prompt)
  const aiText = result.response.text()
  const parsed = extractJson(aiText)
  return coerceItems(parsed)
}

export async function subtasksWithAI(api: GeminiClient, item: { title: string; summary?: string; type?: MindFlowItemType }, opts?: { force?: boolean }) {
  const level0 = estimateComplexity(item.title, item.summary)
  const level = opts?.force ? (level0 === 'simple' ? 'medium' : level0) : level0
  if (!opts?.force && level === 'simple') return []
  const prompt = buildSubtasksPrompt(item.title, item.summary, item.type, level)
  const model = api.modelJson()
  const result = await model.generateContent(prompt)
  const aiText = result.response.text()
  const parsed = extractJson(aiText)
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

export async function chatForItem(api: GeminiClient, itemContext: { title: string; type: string; summary?: string; financeInfo?: string; history?: ChatMessage[] }, message: string) {
  const model = api.modelText()
  const history = trimHistory(itemContext.history || [], 10).map(m => ({ role: m.role, parts: m.parts }))
  const chat = model.startChat({ history })
  const context = `Você está ajudando com este item. Seja conciso e prático.\nTítulo: ${itemContext.title}\nTipo: ${itemContext.type}\nResumo: ${itemContext.summary || '—'}\n${itemContext.financeInfo || ''}`
  const result = await chat.sendMessage(context + '\n\nPergunta: ' + message)
  return result.response.text()
}
