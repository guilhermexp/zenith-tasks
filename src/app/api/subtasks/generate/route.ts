import { NextResponse } from 'next/server'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { subtasksWithAI } from '@/services/ai'
import { getAISDKModel } from '@/server/aiProvider'

export async function POST(req: Request) {
  try {
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json().catch(() => ({})) as any
    const title = String(body?.title || '').trim()
    const summary = typeof body?.summary === 'string' ? body.summary : undefined
    const type = typeof body?.type === 'string' ? body.type : undefined
    const force = Boolean(body?.force)

    if (!title) {
      return NextResponse.json({ error: 'title required' }, { status: 400 })
    }

    // AI SDK como padrão; fallback se indisponível
    try {
      await getAISDKModel() // valida provider/chave por meio do provedor
    } catch {
      return NextResponse.json({ subtasks: [] })
    }
    const list = await subtasksWithAI({ title, summary, type }, { force })

    return NextResponse.json({ subtasks: list })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown error' }, { status: 500 })
  }
}
