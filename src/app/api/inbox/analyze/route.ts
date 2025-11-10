import { NextResponse } from 'next/server'

import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { buildAnalyzePrompt } from '@/services/ai/prompts'
import { ProviderFallbackManager } from '@/server/ai/provider-fallback'

export async function POST(req: Request) {
  let text: string | undefined
  try {
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const body = await req.json()
    text = body.text
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text required' }, { status: 400 })
    }

    const fallbackManager = ProviderFallbackManager.getInstance()

    // AI SDK como padrão com fallback automático entre provedores
    const { generateObject } = await import('ai')
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
    const prompt = buildAnalyzePrompt(text)

    // Executar com fallback automático entre provedores
    const result = await fallbackManager.executeWithFallback(
      async (provider) => {
        // Obter model apropriado para o provedor atual
        process.env.AI_SDK_PROVIDER = provider
        const aiProviderModule = await import('@/server/aiProvider')
        const model = await aiProviderModule.getAISDKModel()

        return await generateObject({ model, schema, prompt })
      },
      { operation: 'analyze-text' }
    )

    return NextResponse.json(result.result.object)
  } catch (e: any) {
    // Fallback final: se todos os provedores falham, retornar nota simples
    const title = text?.slice(0, 80) || 'Nota'
    return NextResponse.json({ items: [{ title, type: 'Nota', summary: text?.slice(0, 280) || '' }] })
  }
}
