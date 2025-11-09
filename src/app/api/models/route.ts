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
        requiredCapabilities.every((cap: string) => m.capabilities?.includes(cap))
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
      id: 'xai/grok-4-fast-reasoning',
      name: 'Grok 4 Fast Reasoning',
      provider: 'xai',
      description: 'xAI Grok 4 - Raciocínio rápido e eficiente',
      contextWindow: 2000000,
      pricing: { input: 2.0, output: 10 },
      capabilities: ['text', 'reasoning', 'code']
    },
    {
      id: 'google/gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'google',
      description: 'Modelo premium com contexto estendido',
      contextWindow: 2000000,
      pricing: { input: 1.25, output: 5 },
      capabilities: ['text', 'vision', 'audio', 'code']
    },
    {
      id: 'zai/glm-4.6',
      name: 'GLM-4.6',
      provider: 'zai',
      description: 'Zhipu AI GLM-4.6 - Especialista em código e agentes',
      contextWindow: 200000,
      pricing: { input: 1.0, output: 4.0 },
      capabilities: ['text', 'code', 'function-calling']
    },
    {
      id: 'google/gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'google',
      description: 'Modelo rápido e econômico para tarefas gerais',
      contextWindow: 1000000,
      pricing: { input: 0.075, output: 0.3 },
      capabilities: ['text', 'vision', 'multimodal']
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
