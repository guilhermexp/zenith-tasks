import { NextResponse } from 'next/server'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { createGemini } from '@/services/ai/client'
import { chatForItem } from '@/services/ai'
import type { ChatMessage } from '@/types'

export async function POST(req: Request) {
  try {
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json().catch(() => ({})) as any
    const title = String(body?.title || '').trim()
    const type = String(body?.type || '').trim()
    const summary = typeof body?.summary === 'string' ? body.summary : undefined
    const financeInfo = typeof body?.financeInfo === 'string' ? body.financeInfo : undefined
    const history = Array.isArray(body?.history) ? body.history as ChatMessage[] : []
    const message = String(body?.message || '').trim()

    if (!title || !type || !message) {
      return NextResponse.json({ error: 'title, type and message required' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key missing' }, { status: 500 })
    }

    const gemini = createGemini(apiKey)
    const text = await chatForItem(gemini, { title, type, summary, financeInfo, history }, message)

    return NextResponse.json({ text })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unknown error' }, { status: 500 })
  }
}

