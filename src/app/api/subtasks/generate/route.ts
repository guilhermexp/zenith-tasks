import { NextResponse } from 'next/server'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { createGemini } from '@/services/ai/client'
import { subtasksWithAI } from '@/services/ai'

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

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key missing' }, { status: 500 })
    }

    const gemini = createGemini(apiKey)
    const list = await subtasksWithAI(gemini, { title, summary, type }, { force })

    return NextResponse.json({ subtasks: list })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown error' }, { status: 500 })
  }
}

