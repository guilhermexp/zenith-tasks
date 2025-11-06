import { NextResponse } from 'next/server'

import { ChatService } from '@/server/ai/chat-service'
import { extractClientKey, rateLimit } from '@/server/rateLimit'
import type { ChatMessage } from '@/types'
import { parseRequestBody } from '@/utils/safe-json'
import { logger } from '@/utils/logger'

export async function POST(req: Request) {
  try {
    // Rate limiting
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Extrair dados do corpo
    const body = await parseRequestBody<any>(req)
    const title = String(body?.title || '').trim()
    const type = String(body?.type || '').trim()
    const summary = typeof body?.summary === 'string' ? body.summary : undefined
    const financeInfo = typeof body?.financeInfo === 'string' ? body.financeInfo : undefined
    const history = Array.isArray(body?.history) ? body.history as ChatMessage[] : []
    const message = String(body?.message || '').trim()
    const userId = body?.userId
    const conversationId = body?.conversationId

    // Validação básica
    if (!title || !type || !message) {
      return NextResponse.json({ error: 'title, type and message required' }, { status: 400 })
    }

    // Usar serviço centralizado de chat
    const chatService = ChatService.getInstance()
    const result = await chatService.chatForItem(
      {
        title,
        type,
        summary,
        financeInfo,
      },
      message,
      {
        history,
        userId,
        conversationId,
      }
    )

    // Tratamento de resposta
    if (result.error) {
      logger.error('[ChatForItem] Erro no chat', {
        error: result.error,
        itemTitle: title,
        itemType: type,
      })
      return NextResponse.json({
        error: result.error,
        text: result.text || 'Assistente temporariamente indisponível.'
      }, { status: 500 })
    }

    return NextResponse.json({ text: result.text })

  } catch (e: any) {
    logger.error('[ChatForItem] Erro não tratado', e)
    return NextResponse.json({
      error: e?.message || 'unknown error',
      text: 'Assistente temporariamente indisponível. Posso registrar isto como uma nota ou tarefa se preferir.'
    }, { status: 500 })
  }
}
