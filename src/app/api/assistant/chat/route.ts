import { NextResponse } from 'next/server'

import { ChatService, CHAT_CONTEXTS } from '@/server/ai/chat-service'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { parseRequestBody } from '@/utils/json-helpers'
import { logger } from '@/utils/logger'

export async function POST(req: Request) {
  try {
    // Rate limiting
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Extrair parâmetros
    const url = new URL(req.url)
    const streamQuery = url.searchParams.get('stream') === '1'
    const { message, history, userId, conversationId } = await parseRequestBody<any>(req)

    const text = typeof message === 'string' ? message.trim() : ''
    if (!text) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    // Detectar preferência de stream
    const accept = req.headers.get('accept') || ''
    const wantsStream = streamQuery || accept.includes('text/event-stream')

    // Usar serviço centralizado de chat
    const chatService = ChatService.getInstance()
    const result = await chatService.chat(text, {
      stream: wantsStream,
      history,
      userId,
      conversationId,
      system: CHAT_CONTEXTS.general.system,
      temperature: 0.7
    })

    // Tratamento de resposta
    if (result.error) {
      logger.error('[AssistantChat] Erro no chat', { error: result.error, userId })
      return NextResponse.json({
        error: result.error,
        text: result.text || 'Desculpe, ocorreu um erro inesperado.'
      }, { status: 500 })
    }

    // Se tem Response completa do AI SDK v5, retornar diretamente
    if (result.response) {
      return result.response
    }

    // Fallback: se tem stream manual
    if (result.stream) {
      return new Response(result.stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      })
    }

    return NextResponse.json({ text: result.text })

  } catch (e: any) {
    logger.error('[AssistantChat] Erro não tratado', e)
    return NextResponse.json({
      error: e?.message || 'assistant chat error',
      text: 'Desculpe, ocorreu um erro inesperado. Por favor, tente novamente.'
    }, { status: 500 })
  }
}