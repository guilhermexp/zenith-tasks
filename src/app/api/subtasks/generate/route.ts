import { NextResponse } from 'next/server'

import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { subtasksWithAI } from '@/services/ai'
import { ProviderFallbackManager } from '@/server/ai/provider-fallback'

export async function POST(req: Request) {
  let title: string, summary: string | undefined, force: boolean

  try {
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json().catch(() => ({})) as any
    title = String(body?.title || '').trim()
    summary = typeof body?.summary === 'string' ? body.summary : undefined
    const type = typeof body?.type === 'string' ? body.type : undefined
    force = Boolean(body?.force)

    if (!title) {
      return NextResponse.json({ error: 'title required' }, { status: 400 })
    }

    const fallbackManager = ProviderFallbackManager.getInstance()

    // Tenta gerar subtarefas com fallback automático entre provedores
    const result = await fallbackManager.executeWithFallback(
      async (provider) => {
        process.env.AI_SDK_PROVIDER = provider
        const aiModule = await import('@/services/ai')
        const list = await aiModule.subtasksWithAI({ title, summary, type }, { force })
        return { subtasks: list }
      },
      { operation: 'generate-subtasks' }
    )

    return NextResponse.json(result.result)
  } catch (e: any) {
    // Fallback final: retorna subtarefas vazias se todos falharem
    return NextResponse.json({ subtasks: [] })
  }
}
