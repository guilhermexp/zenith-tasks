import { NextResponse } from 'next/server'
import { createGemini } from '@/services/ai/client'
import { planAssistant, buildAssistantPrompt } from '@/services/ai/assistant'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { getAISDKModel } from '@/server/aiProvider'

export async function POST(req: Request) {
  try {
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }
    const { message } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key missing' }, { status: 500 })
    }
    // AI SDK opcional por flag
    if ((process.env.AI_SDK_ENABLED || '').toLowerCase() === 'true') {
      try {
        const { generateObject } = await import('ai')
        const { z } = await import('zod')
        const model = await getAISDKModel()
        const planSchema = z.object({
          commands: z.array(z.object({ action: z.string(), args: z.record(z.string(), z.unknown()).optional() })).default([]),
          reply: z.string().optional()
        })
        const prompt = buildAssistantPrompt(message, new Date().toISOString())
        const result = await generateObject({ model, schema: planSchema, prompt })
        return NextResponse.json(result.object)
      } catch (e: any) {
        // fallback para o plano atual
      }
    }
    const gemini = createGemini(apiKey)
    const plan = await planAssistant(gemini, message)
    return NextResponse.json(plan)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown error' }, { status: 500 })
  }
}
