/**
 * Simple test endpoint for chat functionality
 */

import { generateText } from 'ai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { message } = await req.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Try different providers in order of preference
    let model: any = null
    let provider = 'none'

    // Try Google first
    if (process.env.GEMINI_API_KEY) {
      try {
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
        const google = createGoogleGenerativeAI({
          apiKey: process.env.GEMINI_API_KEY
        })
        model = google('gemini-2.0-flash-exp')
        provider = 'google'
        console.warn('[TestChat] Using Google Gemini')
      } catch (error: any) {
        console.warn('[TestChat] Google failed:', error.message)
      }
    }

    // Try OpenRouter if Google failed
    if (!model && process.env.OPENROUTER_API_KEY) {
      try {
        const { createOpenAI } = await import('@ai-sdk/openai')
        const openai = createOpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1'
        })
        model = openai('openrouter/auto')
        provider = 'openrouter'
        console.warn('[TestChat] Using OpenRouter')
      } catch (error: any) {
        console.warn('[TestChat] OpenRouter failed:', error.message)
      }
    }

    // Try OpenAI if others failed
    if (!model && process.env.OPENAI_API_KEY) {
      try {
        const { createOpenAI } = await import('@ai-sdk/openai')
        const openai = createOpenAI({
          apiKey: process.env.OPENAI_API_KEY
        })
        model = openai('gpt-4o-mini')
        provider = 'openai'
        console.warn('[TestChat] Using OpenAI')
      } catch (error: any) {
        console.warn('[TestChat] OpenAI failed:', error.message)
      }
    }

    // Try Anthropic if others failed
    if (!model && process.env.ANTHROPIC_API_KEY) {
      try {
        const { createAnthropic } = await import('@ai-sdk/anthropic')
        const anthropic = createAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        })
        model = anthropic('claude-3-5-haiku-20241022')
        provider = 'anthropic'
        console.warn('[TestChat] Using Anthropic')
      } catch (error: any) {
        console.warn('[TestChat] Anthropic failed:', error.message)
      }
    }

    if (!model) {
      return NextResponse.json({
        error: 'No AI provider configured',
        providers: {
          google: !!process.env.GEMINI_API_KEY,
          openrouter: !!process.env.OPENROUTER_API_KEY,
          openai: !!process.env.OPENAI_API_KEY,
          anthropic: !!process.env.ANTHROPIC_API_KEY
        }
      }, { status: 503 })
    }

    // Generate response
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
      temperature: 0.7,
      maxOutputTokens: 1000
    })

    return NextResponse.json({
      text: result.text,
      provider,
      usage: result.usage,
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
