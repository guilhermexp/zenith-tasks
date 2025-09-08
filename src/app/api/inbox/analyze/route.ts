import { NextResponse } from 'next/server'
import { createGemini } from '@/services/ai/client'
import { analyzeWithAI } from '@/services/ai'
import { buildAnalyzePrompt } from '@/services/ai/prompts'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { getAISDKModel } from '@/server/aiProvider'

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

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key missing' }, { status: 500 })
    }

    if ((process.env.AI_SDK_ENABLED || '').toLowerCase() === 'true') {
      try {
        const { generateObject } = await import('ai')
        const { z } = await import('zod')
        const model = await getAISDKModel()
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
        const prompt = buildAnalyzePrompt(text)
        const result = await generateObject({ model, schema, prompt })
        return NextResponse.json(result.object)
      } catch {}
    }

    const gemini = createGemini(apiKey)
    const items = await analyzeWithAI(gemini, text)
    return NextResponse.json({ items })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown error' }, { status: 500 })
  }
}
