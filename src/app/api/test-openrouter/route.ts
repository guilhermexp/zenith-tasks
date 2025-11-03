import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

import { logger } from '@/utils/logger'

export async function POST(req: Request) {
  const logContext = { route: 'test-openrouter' } as const
  try {
    const { message } = await req.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    logger.info('Test OpenRouter: creating client', logContext)
    
    // Create OpenRouter client directly
    const openai = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'X-Title': 'Zenith Tasks AI Assistant',
        'HTTP-Referer': process.env.NEXT_PUBLIC_URL || 'http://localhost:3457'
      }
    })

    logger.info('Test OpenRouter: generating text', logContext)

    const model = openai('openai/gpt-3.5-turbo')
    
    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
    })

    logger.info('Test OpenRouter: generation succeeded', {
      preview: result.text?.substring(0, 50) ?? '',
      ...logContext
    })

    return NextResponse.json({
      text: result.text,
      usage: result.usage,
      success: true
    })

  } catch (error: any) {
    logger.error('Test OpenRouter: error', error, logContext)
    
    return NextResponse.json({
      error: error.message || 'OpenRouter test failed',
      stack: error.stack,
      success: false
    }, { status: 500 })
  }
}
