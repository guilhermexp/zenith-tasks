import { NextResponse } from 'next/server'
import OpenAI from 'openai'

import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { parseRequestBody } from '@/utils/safe-json'
import { logger } from '@/utils/logger'

export async function POST(req: Request) {
  let audioBase64 = ''
  let mimeType = 'audio/webm'
  let sessionId: string | undefined
  let realTime = false

  try {
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 30, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

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

    // Verificar se a chave da OpenAI está configurada
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY não configurada' },
        { status: 500 }
      )
    }

    // Criar cliente OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Converter base64 para Buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64')

    logger.info('Audio buffer prepared for transcription', {
      component: 'speech-transcribe-route',
      bufferSize: audioBuffer.length,
      mimeType,
      realTime,
    })

    // Validar tamanho do buffer
    if (audioBuffer.length < 1000) {
      return NextResponse.json(
        { error: 'Áudio muito curto. Grave por pelo menos 2 segundos.' },
        { status: 400 }
      )
    }

    if (audioBuffer.length > 25 * 1024 * 1024) {
      // 25MB limit for Whisper
      return NextResponse.json(
        { error: 'Áudio muito grande. Limite de 25MB.' },
        { status: 400 }
      )
    }

    // Determinar a extensão do arquivo baseado no mimeType
    const extension = (() => {
      if (mimeType.includes('webm')) return 'webm'
      if (mimeType.includes('wav')) return 'wav'
      if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3'
      if (mimeType.includes('mp4') || mimeType.includes('mp4a')) return 'mp4'
      if (mimeType.includes('ogg')) return 'ogg'
      return 'webm'
    })()

    // Criar um File object para o Whisper
    const audioFile = new File([audioBuffer], `audio.${extension}`, {
      type: mimeType,
    })

    logger.info('Starting Whisper transcription', {
      component: 'speech-transcribe-route',
      fileName: `audio.${extension}`,
      fileSize: audioFile.size,
    })

    // Transcrever com Whisper da OpenAI (timeout aumentado para 90 segundos)
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 90000)
    )

    const transcriptionPromise = openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'pt', // Português
      response_format: 'json',
    })

    const transcriptionResult = await Promise.race([transcriptionPromise, timeout])

    logger.info('Transcription completed', {
      component: 'speech-transcribe-route',
      textLength: transcriptionResult.text?.length || 0,
    })

    const text = transcriptionResult.text?.trim()
    if (!text) {
      logger.warn('Empty transcription result', {
        component: 'speech-transcribe-route',
        audioSize: audioBuffer.length,
      })
      throw new Error('Empty transcription')
    }

    const result = {
      text,
      transcript: text, // Keep backward compatibility
      confidence: 0.95, // Whisper tem alta confiabilidade
      isFinal: !realTime, // Real-time chunks are not final
      sessionId,
      timestamp: Date.now(),
    }

    logger.info('Transcription result prepared', {
      component: 'speech-transcribe-route',
      textPreview: text.substring(0, 50),
      textLength: text.length,
    })

    return NextResponse.json(result)
  } catch (e: any) {
    const rawMessage = typeof e?.message === 'string' ? e.message : ''
    const normalizedMessage = rawMessage.toLowerCase()

    if (normalizedMessage.includes('model is overloaded') || normalizedMessage.includes('overloaded')) {
      logger.warn('Transcription service overloaded', {
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

    if (normalizedMessage.includes('timeout') || normalizedMessage.includes('timed out')) {
      logger.warn('Transcription timed out', {
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

    if (normalizedMessage.includes('not supported') || normalizedMessage.includes('unsupported')) {
      logger.warn('Transcription not supported for current provider', {
        component: 'speech-transcribe-route',
        message: rawMessage,
      })

      return NextResponse.json(
        {
          error: 'Transcrição de áudio não é suportada pelo provedor atual. Use Google ou OpenAI.',
        },
        {
          status: 501,
        },
      )
    }

    logger.error('Transcription failed', e, {
      component: 'speech-transcribe-route',
      message: rawMessage || undefined,
    })

    return NextResponse.json(
      { error: rawMessage || 'transcription error' },
      { status: 500 },
    )
  }
}
