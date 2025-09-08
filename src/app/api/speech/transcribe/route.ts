import { NextResponse } from 'next/server'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: Request) {
  try {
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 30, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json().catch(() => ({})) as any
    const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : ''
    const mimeType = typeof body.mimeType === 'string' && body.mimeType ? body.mimeType : 'audio/webm'

    if (!audioBase64) {
      return NextResponse.json({ error: 'audioBase64 required' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key missing' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

    const transcriptionPromise = model.generateContent([
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
      { text: 'Transcreva este áudio em português brasileiro. Retorne apenas a transcrição do que foi dito, sem comentários ou explicações adicionais.' },
    ])

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
    const result: any = await Promise.race([transcriptionPromise, timeoutPromise])

    const text = typeof result?.response?.text === 'function' ? result.response.text() : ''
    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: 'Empty transcription' }, { status: 500 })
    }

    return NextResponse.json({ text: String(text) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'transcription error' }, { status: 500 })
  }
}

