/**
 * Simple test endpoint for chat functionality
 */

import { generateText } from 'ai'
import { NextResponse } from 'next/server'

import { AIProvider } from '@/server/aiProvider'

export async function POST(req: Request) {
  try {
    const { message } = await req.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Use centralized AIProvider
    const aiProvider = AIProvider.getInstance()
    const { model, settings } = await aiProvider.getModelForContext('chat')
    
    console.log('[TestChat] Using AIProvider with context: chat')

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
    console.error('[TestChat] Error:', error)
    
    return NextResponse.json({
      error: error.message || 'Chat failed',
      success: false
    }, { status: 500 })
  }
}
