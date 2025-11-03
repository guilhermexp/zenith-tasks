import { NextResponse } from 'next/server'

import { logger } from '@/utils/logger'

export async function POST(req: Request) {
  const logContext = { route: 'debug-ai' } as const
  try {
    const { message } = await req.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    logger.info('Debug AI: testing OpenAI SDK via OpenRouter', logContext)
    
    const { OpenAI } = await import('openai')
    
    const client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'X-Title': 'Zenith Tasks AI Assistant',
        'HTTP-Referer': process.env.NEXT_PUBLIC_URL || 'http://localhost:3457'
      }
    })
    
    logger.info('Debug AI: OpenAI client created', logContext)
    
    const completion = await client.chat.completions.create({
      model: 'openai/gpt-3.5-turbo',
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
      temperature: 0.7,
      max_tokens: 1500
    })
    
    logger.info('Debug AI: completion successful', logContext)
    
    const responseText = completion.choices[0]?.message?.content || ''
    logger.info('Debug AI: response generated', {
      preview: responseText.substring(0, 50),
      ...logContext
    })

    return NextResponse.json({
      text: responseText,
      usage: completion.usage,
      model: completion.model,
      success: true
    })

  } catch (error: any) {
    logger.error('Debug AI: error', error, logContext)
    
    return NextResponse.json({
      error: error.message || 'Debug AI failed',
      stack: error.stack,
      success: false
    }, { status: 500 })
  }
}
