import { NextResponse } from 'next/server'

import { getAISDKModel } from '@/server/aiProvider'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { buildAnalyzePrompt } from '@/services/ai/prompts'

export async function POST(req: Request) {
  try {
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const { text } = await req.json()
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text required' }, { status: 400 })
    }

    // AI SDK como padrão
    const { generateObject } = await import('ai')
    const { z } = await import('zod')
    let model: any
    try {
      model = await getAISDKModel()
    } catch {
      // Fallback: return a single Note item with the text
      const title = text.slice(0, 80)
      return NextResponse.json({ items: [{ title, type: 'Nota', summary: text.slice(0, 280) }] })
    }
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
    const prompt = buildAnalyzePrompt(text)
    const result = await generateObject({ model, schema, prompt })
    return NextResponse.json(result.object)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown error' }, { status: 500 })
  }
}
