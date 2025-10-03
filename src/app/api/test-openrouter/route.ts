import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { message } = await req.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    console.log('[TestOpenRouter] Creating OpenRouter client...')
    
    // Create OpenRouter client directly
    const openai = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'X-Title': 'Zenith Tasks AI Assistant',
        'HTTP-Referer': process.env.NEXT_PUBLIC_URL || 'http://localhost:3457'
      }
    })

    console.log('[TestOpenRouter] Client created, generating text...')

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

    console.log('[TestOpenRouter] Success:', result.text?.substring(0, 50))

    return NextResponse.json({
      text: result.text,
      usage: result.usage,
      success: true
    })

  } catch (error: any) {
    console.error('[TestOpenRouter] Error:', error)
    
    return NextResponse.json({
      error: error.message || 'OpenRouter test failed',
      stack: error.stack,
      success: false
    }, { status: 500 })
  }
}