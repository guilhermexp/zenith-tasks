import { NextResponse } from 'next/server'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { getAISDKModel } from '@/server/aiProvider'
import { generateText } from 'ai'

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

    const provider = (process.env.AI_SDK_PROVIDER || 'google').toLowerCase()
    if (provider !== 'google') {
      return NextResponse.json({ error: 'Audio transcription supported only with Google provider' }, { status: 501 })
    }

    const model = await getAISDKModel()
    const format = (() => {
      if (mimeType.includes('webm')) return 'webm'
      if (mimeType.includes('wav')) return 'wav'
      if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3'
      if (mimeType.includes('mp4') || mimeType.includes('mp4a')) return 'mp4'
      if (mimeType.includes('ogg')) return 'ogg'
      return 'webm'
    })()

    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
    const gen = generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'input_audio', audio: { data: audioBase64, format } },
            { type: 'text', text: 'Transcreva este áudio em português brasileiro. Retorne apenas a transcrição do que foi dito, sem comentários adicionais.' }
          ]
        }
      ]
    })
    const result = await Promise.race([gen, timeout])
    const text = result.text?.trim()
    if (!text) return NextResponse.json({ error: 'Empty transcription' }, { status: 500 })
    return NextResponse.json({ text })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'transcription error' }, { status: 500 })
  }
}
