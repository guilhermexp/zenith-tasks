/**
 * Debug endpoint to check available AI providers
 */

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const providers = {
      gateway: {
        configured: !!process.env.AI_GATEWAY_API_KEY,
        enabled: process.env.USE_AI_GATEWAY === 'true',
        key: process.env.AI_GATEWAY_API_KEY ? `${process.env.AI_GATEWAY_API_KEY.substring(0, 8)}...` : null
      },
      google: {
        configured: !!process.env.GEMINI_API_KEY,
        key: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 8)}...` : null,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
      },
      openrouter: {
        configured: !!process.env.OPENROUTER_API_KEY,
        key: process.env.OPENROUTER_API_KEY ? `${process.env.OPENROUTER_API_KEY.substring(0, 8)}...` : null,
        model: process.env.OPENROUTER_MODEL || 'openrouter/auto'
      },
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        key: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 8)}...` : null
      }
    }

    const configuredProviders = Object.entries(providers)
      .filter(([_, config]) => config.configured)
      .map(([name]) => name)

    const primaryProvider = process.env.AI_SDK_PROVIDER || 'google'

    return NextResponse.json({
      providers,
      configuredProviders,
      primaryProvider,
      totalConfigured: configuredProviders.length,
      recommendations: getRecommendations(providers)
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      providers: {},
      configuredProviders: [],
      totalConfigured: 0
    }, { status: 500 })
  }
}

function getRecommendations(providers: any): string[] {
  const recommendations: string[] = []

  if (!providers.google.configured && !providers.openrouter.configured && !providers.openai.configured) {
    recommendations.push('Configure pelo menos um provedor de IA (Google, OpenRouter ou OpenAI)')
  }

  if (providers.gateway.configured && !providers.gateway.enabled) {
    recommendations.push('Gateway configurado mas não habilitado. Defina USE_AI_GATEWAY=true para usar')
  }

  if (!providers.google.configured) {
    recommendations.push('Configure GEMINI_API_KEY para usar o Google Gemini (recomendado para começar)')
  }

  if (!providers.openrouter.configured) {
    recommendations.push('Configure OPENROUTER_API_KEY para acesso a múltiplos modelos')
  }

  return recommendations
}