import { NextResponse } from 'next/server'
import { buildAssistantPrompt } from '@/services/ai/assistant'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { getAISDKModel } from '@/server/aiProvider'
import { streamObject } from 'ai'

export async function POST(req: Request) {
  try {
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }
    const url = new URL(req.url)
    const stream = url.searchParams.get('stream') === '1'
    const { message } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }
    const { generateObject } = await import('ai')
    const { z } = await import('zod')
    let model: any
    try {
      model = await getAISDKModel()
    } catch {
      // Graceful fallback when no model configured: return a simple reply with no commands
      const reply = message.length <= 3
        ? 'Olá! Como posso ajudar você hoje?'
        : 'Posso ajudar a criar tarefas, notas, lembretes e responder dúvidas. Diga como posso proceder.'
      return NextResponse.json({ commands: [], reply })
    }
    const planSchema = z.object({
      commands: z.array(z.object({ action: z.string(), args: z.record(z.string(), z.unknown()).optional() })).default([]),
      reply: z.string().optional()
    })
    const prompt = buildAssistantPrompt(message, new Date().toISOString())
    if (stream) {
      const result = await streamObject({ model, schema: planSchema, prompt })
      return result.toAIStreamResponse()
    }
    const result = await generateObject({ model, schema: planSchema, prompt })
    return NextResponse.json(result.object)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown error' }, { status: 500 })
  }
}
