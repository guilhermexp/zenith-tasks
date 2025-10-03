import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { message } = await req.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    console.log('[DebugAI] Testing with direct OpenAI SDK (OpenRouter)...')
    
    const { OpenAI } = await import('openai')
    
    const client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'X-Title': 'Zenith Tasks AI Assistant',
        'HTTP-Referer': process.env.NEXT_PUBLIC_URL || 'http://localhost:3457'
      }
    })
    
    console.log('[DebugAI] OpenAI client created')
    
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
    
    console.log('[DebugAI] Completion successful')
    
    const responseText = completion.choices[0]?.message?.content || ''
    console.log('[DebugAI] Response generated:', responseText.substring(0, 50))

    return NextResponse.json({
      text: responseText,
      usage: completion.usage,
      model: completion.model,
      success: true
    })

  } catch (error: any) {
    console.error('[DebugAI] Error:', error)
    
    return NextResponse.json({
      error: error.message || 'Debug AI failed',
      stack: error.stack,
      success: false
    }, { status: 500 })
  }
}
