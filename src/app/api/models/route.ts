import { NextResponse } from 'next/server';

import { getModelSelector } from '@/server/ai/gateway/model-selector';
import { getGatewayProvider } from '@/server/ai/gateway/provider';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const context = url.searchParams.get('context');
    const recommended = url.searchParams.get('recommended') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let allModels: any[] = [];

    // Try to get models from gateway first
    try {
      const gatewayProvider = getGatewayProvider();
      allModels = await gatewayProvider.getAvailableModels();
      console.log('[API/models] Got models from gateway:', allModels.length);
    } catch (gatewayError: any) {
      console.log('[API/models] Gateway failed, using fallback models:', gatewayError.message);
      // Fallback to default models
      allModels = getDefaultModels();
    }

    // If we still don't have models, use hardcoded defaults
    if (!allModels || allModels.length === 0) {
      console.log('[API/models] No models available, using hardcoded defaults');
      allModels = getDefaultModels();
    }

    // Get recommended models for context
    if (recommended && context) {
      try {
        const selector = getModelSelector();
        const recommendations = await selector.getRecommendations(context, {
          budget: url.searchParams.get('budget') as any || 'medium',
          priority: url.searchParams.get('priority') as any || 'balanced'
        });

        return NextResponse.json({
          context,
          models: recommendations.slice(0, limit).map(r => r.model)
        });
      } catch (selectorError) {
        console.log('[API/models] Selector failed, returning filtered models');
        // Fallback: filter models by context manually
        const contextModels = filterModelsByContext(allModels, context);
        return NextResponse.json({
          context,
          models: contextModels.slice(0, limit)
        });
      }
    }

    // Filter by provider if specified
    const provider = url.searchParams.get('provider');
    const models = provider
      ? allModels.filter(m => m.provider === provider)
      : allModels;

    return NextResponse.json({
      total: models.length,
      models: models.slice(0, limit),
      providers: [...new Set(models.map(m => m.provider))]
    });
  } catch (error: any) {
    console.error('[API/models] Error:', error);
    
    // Final fallback - return hardcoded models
    const fallbackModels = getDefaultModels();
    return NextResponse.json({
      total: fallbackModels.length,
      models: fallbackModels.slice(0, parseInt(req.url.includes('limit=') ? new URL(req.url).searchParams.get('limit') || '50' : '50')),
      providers: [...new Set(fallbackModels.map(m => m.provider))],
      fallback: true
    });
  }
}

// Default models fallback
function getDefaultModels() {
  return [
    // OpenAI Models
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4 Optimized',
      provider: 'openai',
      description: 'Modelo mais avançado da OpenAI',
      contextWindow: 128000,
      pricing: { input: 5, output: 15 },
      capabilities: ['text', 'vision', 'function-calling']
    },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4 Mini',
      provider: 'openai',
      description: 'Versão compacta e econômica',
      contextWindow: 128000,
      pricing: { input: 0.15, output: 0.6 },
      capabilities: ['text', 'vision', 'function-calling']
    },
    {
      id: 'openai/gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      description: 'Modelo rápido e eficiente',
      contextWindow: 16385,
      pricing: { input: 0.5, output: 1.5 },
      capabilities: ['text', 'function-calling']
    },

    // Anthropic Models
    {
      id: 'anthropic/claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      description: 'Modelo de alto desempenho da Anthropic',
      contextWindow: 200000,
      pricing: { input: 3, output: 15 },
      capabilities: ['text', 'vision', 'analysis']
    },
    {
      id: 'anthropic/claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      description: 'Modelo rápido e econômico da Anthropic',
      contextWindow: 200000,
      pricing: { input: 0.25, output: 1.25 },
      capabilities: ['text', 'vision']
    },
    {
      id: 'anthropic/claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      description: 'Modelo mais poderoso da Anthropic',
      contextWindow: 200000,
      pricing: { input: 15, output: 75 },
      capabilities: ['text', 'vision', 'analysis', 'reasoning']
    },

    // Google Models
    {
      id: 'google/gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash',
      provider: 'google',
      description: 'Modelo experimental mais recente do Google',
      contextWindow: 1000000,
      pricing: { input: 0.075, output: 0.3 },
      capabilities: ['text', 'vision', 'audio', 'multimodal']
    },
    {
      id: 'google/gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      description: 'Modelo profissional com grande contexto',
      contextWindow: 2000000,
      pricing: { input: 1.25, output: 5 },
      capabilities: ['text', 'vision', 'audio', 'code']
    },
    {
      id: 'google/gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      description: 'Modelo rápido e eficiente',
      contextWindow: 1000000,
      pricing: { input: 0.075, output: 0.3 },
      capabilities: ['text', 'vision', 'multimodal']
    },

    // Cohere Models
    {
      id: 'cohere/command-r-plus',
      name: 'Command R+',
      provider: 'cohere',
      description: 'Modelo avançado da Cohere para tarefas complexas',
      contextWindow: 128000,
      pricing: { input: 3, output: 15 },
      capabilities: ['text', 'reasoning', 'multilingual']
    },
    {
      id: 'cohere/command-r',
      name: 'Command R',
      provider: 'cohere',
      description: 'Modelo equilibrado da Cohere',
      contextWindow: 128000,
      pricing: { input: 0.5, output: 1.5 },
      capabilities: ['text', 'reasoning']
    },

    // Mistral Models
    {
      id: 'mistral/mistral-large-2407',
      name: 'Mistral Large',
      provider: 'mistral',
      description: 'Modelo mais avançado da Mistral AI',
      contextWindow: 128000,
      pricing: { input: 2, output: 6 },
      capabilities: ['text', 'reasoning', 'function-calling']
    },
    {
      id: 'mistral/mistral-medium',
      name: 'Mistral Medium',
      provider: 'mistral',
      description: 'Modelo equilibrado da Mistral AI',
      contextWindow: 32000,
      pricing: { input: 2.7, output: 8.1 },
      capabilities: ['text', 'reasoning']
    },

    // Perplexity Models
    {
      id: 'perplexity/llama-3.1-sonar-large-128k-online',
      name: 'Sonar Large Online',
      provider: 'perplexity',
      description: 'Modelo com acesso à internet em tempo real',
      contextWindow: 127072,
      pricing: { input: 1, output: 1 },
      capabilities: ['text', 'web-search', 'real-time']
    },
    {
      id: 'perplexity/llama-3.1-sonar-small-128k-online',
      name: 'Sonar Small Online',
      provider: 'perplexity',
      description: 'Modelo compacto com acesso à web',
      contextWindow: 127072,
      pricing: { input: 0.2, output: 0.2 },
      capabilities: ['text', 'web-search']
    }
  ];
}

// Filter models by context
function filterModelsByContext(models: any[], context: string) {
  switch (context) {
    case 'chat':
      return models.filter(m => 
        m.pricing?.input < 5 && 
        m.capabilities?.includes('text')
      );
    case 'code':
      return models.filter(m => 
        m.capabilities?.includes('function-calling') || 
        m.capabilities?.includes('code') ||
        m.contextWindow > 50000
      );
    case 'analysis':
      return models.filter(m => 
        m.capabilities?.includes('reasoning') || 
        m.capabilities?.includes('analysis')
      );
    case 'creative':
      return models.filter(m => 
        m.contextWindow > 100000 ||
        m.provider === 'anthropic'
      );
    default:
      return models;
  }
}