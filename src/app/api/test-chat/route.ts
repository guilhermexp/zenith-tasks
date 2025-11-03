/**
 * Simple test endpoint for chat functionality
 */

import { generateText } from 'ai'
import { NextResponse } from 'next/server'

import { AIProvider } from '@/server/aiProvider'
import { logger } from '@/utils/logger'

export async function POST(req: Request) {
  const logContext = { route: 'test-chat' } as const
  try {
    const { message } = await req.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Use centralized AIProvider
    const aiProvider = AIProvider.getInstance()
    const { model, settings } = await aiProvider.getModelForContext('chat')
    
    logger.info('Test Chat: using AIProvider with chat context', logContext)

    // Generate response using AIProvider settings
    const result = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente útil. Responda em português brasileiro de forma clara e concisa.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: settings.temperature
    })

    return NextResponse.json({
      text: result.text,
      usage: result.usage,
      settings: {
        temperature: settings.temperature,
        maxTokens: settings.maxTokens
      },
      success: true
    })

  } catch (error: any) {
    logger.error('Test Chat: error', error, logContext)
    
    return NextResponse.json({
      error: error.message || 'Chat failed',
      success: false
    }, { status: 500 })
  }
}
