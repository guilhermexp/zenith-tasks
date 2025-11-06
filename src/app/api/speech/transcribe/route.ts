import { generateText } from 'ai'
import { NextResponse } from 'next/server'

import { getAISDKModel } from '@/server/aiProvider'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { parseRequestBody } from '@/utils/json-helpers'
import { logger } from '@/utils/logger'

export async function POST(req: Request) {
  try {
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 30, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    let audioBase64 = ''
    let mimeType = 'audio/webm'
    let sessionId: string | undefined
    let realTime = false

    // Check if request is FormData
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with audio file
      const formData = await req.formData()
      const audioFile = formData.get('audio') as File | null

      if (!audioFile) {
        return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
      }

      // Convert audio file to base64
      const arrayBuffer = await audioFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      audioBase64 = buffer.toString('base64')
      mimeType = audioFile.type || 'audio/webm'
      sessionId = formData.get('sessionId') as string | undefined
      realTime = formData.get('realTime') === 'true'
    } else {
      // Handle JSON body (existing logic)
      const body = await parseRequestBody<any>(req)
      audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : ''
      mimeType = typeof body.mimeType === 'string' && body.mimeType ? body.mimeType : 'audio/webm'
      sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined
      realTime = body.realTime === true
    }

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
            {
              type: 'text',
              text: 'Transcreva este áudio em português brasileiro. Retorne apenas a transcrição do que foi dito, sem comentários adicionais.'
            },
            {
              type: 'file',
              mediaType: 'audio/webm',
              data: audioBase64
            }
          ]
        }
      ]
    })
    const result = await Promise.race([gen, timeout])
    const text = result.text?.trim()
    if (!text) return NextResponse.json({ error: 'Empty transcription' }, { status: 500 })
    
    // Return enhanced response for real-time transcription
    const response = {
      text,
      transcript: text, // Keep backward compatibility
      confidence: 0.85, // Mock confidence score
      isFinal: !realTime, // Real-time chunks are not final
      sessionId,
      timestamp: Date.now()
    }

    return NextResponse.json(response)
  } catch (e: any) {
    const rawMessage = typeof e?.message === 'string' ? e.message : ''
    const normalizedMessage = rawMessage.toLowerCase()

    if (normalizedMessage.includes('model is overloaded')) {
      logger.warn('Gemini transcription service overloaded', {
        component: 'speech-transcribe-route',
        message: rawMessage,
      })

      return NextResponse.json(
        {
          error:
            'O serviço de transcrição está temporariamente sobrecarregado. Tente novamente em instantes.',
        },
        {
          status: 503,
          headers: { 'Retry-After': '5' },
        },
      )
    }

    if (normalizedMessage.includes('timeout')) {
      logger.warn('Gemini transcription timed out', {
        component: 'speech-transcribe-route',
        message: rawMessage,
      })

      return NextResponse.json(
        {
          error: 'A transcrição demorou demais para responder. Por favor, tente novamente.',
        },
        {
          status: 504,
        },
      )
    }

    logger.error('Gemini transcription failed', e, {
      component: 'speech-transcribe-route',
      message: rawMessage || undefined,
    })

    return NextResponse.json(
      { error: rawMessage || 'transcription error' },
      { status: 500 },
    )
  }
}
