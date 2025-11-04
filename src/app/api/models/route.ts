import { NextResponse } from 'next/server';

import { extractClientKey, rateLimit } from '@/server/rateLimit';
import { logger } from '@/utils/logger';

const FALLBACK_LIMIT = 50;
const logContext = { route: 'models' } as const;

export async function GET(req: Request) {
  try {
    const key = extractClientKey(req);
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    const url = new URL(req.url);
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '50'));
    const providerFilter = url.searchParams.get('provider') ?? undefined;
    const context = url.searchParams.get('context') ?? undefined;
    const recommended = url.searchParams.get('recommended') === 'true';
    const optimized = url.searchParams.get('optimized');
    const budget = (url.searchParams.get('budget') as 'low' | 'medium' | 'high') || 'medium';
    const priority = (url.searchParams.get('priority') as 'speed' | 'quality' | 'balanced') || 'balanced';

    // Simplified: use default models directly (no gateway)
    let allModels = getDefaultModels();
    logger.info('Models API: using default model catalog', {
      total: allModels.length,
      ...logContext
    });

    if (recommended && context) {
      const contextModels = filterModelsByContext(allModels, context);
      return NextResponse.json({
        success: true,
        context,
        models: contextModels.slice(0, limit),
        metadata: {
          budget,
          priority
        }
      });
    }

    if (optimized) {
      const optimizedLimit = Math.max(1, parseInt(url.searchParams.get('limit') || '5'));
      let models = allModels;

      switch (optimized) {
        case 'cost':
          models = models
            .sort((a, b) => {
              const aCost = (a.pricing?.input || 0) + (a.pricing?.output || 0);
              const bCost = (b.pricing?.input || 0) + (b.pricing?.output || 0);
              return aCost - bCost;
            });
          break;
        case 'performance':
          models = models.filter(m => {
            const id = m.id.toLowerCase();
            return id.includes('flash') || id.includes('turbo');
          });
          break;
        case 'quality':
          models = models.filter(m => {
            const id = m.id.toLowerCase();
            return id.includes('pro') || id.includes('opus') || id.includes('4o');
          });
          break;
        default:
          return NextResponse.json({ success: false, error: 'Invalid optimization type' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        optimization: optimized,
        models: models.slice(0, optimizedLimit)
      });
    }

    let filteredModels = allModels;

    if (providerFilter) {
      filteredModels = filteredModels.filter(model => model.provider === providerFilter);
    }

    if (context && !providerFilter && !recommended) {
      filteredModels = filterModelsByContext(filteredModels, context);
    }

    const providers = [...new Set(filteredModels.map(model => model.provider))];

    return NextResponse.json({
      success: true,
      total: filteredModels.length,
      providers,
      models: filteredModels.slice(0, limit)
    });
  } catch (error: any) {
    logger.error('Models API: GET error', error, logContext);

    const fallbackModels = getDefaultModels();
    return NextResponse.json({
      success: true,
      total: fallbackModels.length,
      providers: [...new Set(fallbackModels.map(model => model.provider))],
      models: fallbackModels.slice(0, FALLBACK_LIMIT),
      fallback: true
    });
  }
}

export async function POST(req: Request) {
  try {
    const key = extractClientKey(req);
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const {
      context = 'chat',
      minContextWindow,
      maxCost,
      requiredCapabilities,
      preferredProviders = ['google'],
      avoidProviders,
      speedPriority,
      maxResponseTokens
    } = body;

    // Simplified: use default models without gateway
    const defaultModels = getDefaultModels();
    let filteredModels = defaultModels;

    // Filter by preferred providers
    if (preferredProviders && preferredProviders.length > 0) {
      filteredModels = filteredModels.filter(m => preferredProviders.includes(m.provider));
    }

    // Filter by context
    if (context) {
      filteredModels = filterModelsByContext(filteredModels, context);
    }

    // Filter by capabilities
    if (requiredCapabilities && requiredCapabilities.length > 0) {
      filteredModels = filteredModels.filter(m =>
        requiredCapabilities.every(cap => m.capabilities?.includes(cap))
      );
    }

    // Filter by context window
    if (minContextWindow) {
      filteredModels = filteredModels.filter(m => m.contextWindow >= minContextWindow);
    }

    if (filteredModels.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No suitable model found for requirements'
      }, { status: 404 });
    }

    // Select best model (first one after filtering)
    const selected = filteredModels[0];

    return NextResponse.json({
      success: true,
      selected,
      alternatives: filteredModels.slice(1, 4)
    });
  } catch (error: any) {
    logger.error('Models API: select model error', error, logContext);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to select model'
    }, { status: 500 });
  }
}

function getDefaultModels() {
  return [
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

function filterModelsByContext(models: any[], context: string) {
  switch (context) {
    case 'chat':
      return models.filter(model => model.capabilities?.includes('text'));
    case 'code':
      return models.filter(model =>
        model.capabilities?.includes('function-calling') ||
        model.capabilities?.includes('code') ||
        model.contextWindow > 50000
      );
    case 'analysis':
      return models.filter(model =>
        model.capabilities?.includes('reasoning') ||
        model.capabilities?.includes('analysis')
      );
    case 'creative':
      return models.filter(model =>
        model.capabilities?.includes('multimodal') ||
        model.contextWindow > 100000
      );
    case 'fast':
      return models
        .filter(model => {
          const id = model.id.toLowerCase();
          return id.includes('flash') || id.includes('mini') || id.includes('haiku');
        });
    case 'economical':
      return models
        .filter(model => (model.pricing?.input || 0) + (model.pricing?.output || 0) <= 10)
        .sort((a, b) => {
          const aCost = (a.pricing?.input || 0) + (a.pricing?.output || 0);
          const bCost = (b.pricing?.input || 0) + (b.pricing?.output || 0);
          return aCost - bCost;
        });
    default:
      return models;
  }
}
