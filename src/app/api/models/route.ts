import { NextResponse } from 'next/server';

import { getModelSelector } from '@/server/ai/gateway/model-selector';
import { getGatewayProvider } from '@/server/ai/gateway/provider';
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

    const gatewayProvider = getGatewayProvider();
    const selector = getModelSelector();

    let allModels: any[] = [];

    try {
      allModels = await gatewayProvider.getAvailableModels();
      logger.info('Models API: loaded models from gateway', {
        total: allModels.length,
        ...logContext
      });
    } catch (gatewayError: any) {
      logger.warn('Models API: gateway unavailable, using default catalog', {
        error: gatewayError instanceof Error ? gatewayError.message : String(gatewayError),
        ...logContext
      });
    }

    if (!allModels?.length) {
      allModels = getDefaultModels();
    }

    if (recommended && context) {
      try {
        const recommendations = await selector.getRecommendations(context, {
          budget,
          priority
        });

        return NextResponse.json({
          success: true,
          context,
          models: recommendations.slice(0, limit).map(r => ({
            ...r.model,
            score: r.score,
            reasons: r.reasons,
            costEstimate: r.costEstimate
          })),
          metadata: {
            budget,
            priority
          }
        });
      } catch (selectorError) {
        logger.warn('Models API: recommendation failed, applying heuristic filter', {
          error: selectorError instanceof Error ? selectorError.message : String(selectorError),
          context,
          ...logContext
        });
        const contextModels = filterModelsByContext(allModels, context);
        return NextResponse.json({
          success: true,
          context,
          models: contextModels.slice(0, limit),
          fallback: true
        });
      }
    }

    if (optimized) {
      const optimizedLimit = Math.max(1, parseInt(url.searchParams.get('limit') || '5'));

      try {
        let models;
        switch (optimized) {
          case 'cost':
            models = await selector.getCostOptimizedModels(optimizedLimit);
            break;
          case 'performance':
            models = await selector.getPerformanceOptimizedModels(optimizedLimit);
            break;
          case 'quality':
            models = await selector.getQualityOptimizedModels(optimizedLimit);
            break;
          default:
            return NextResponse.json({ success: false, error: 'Invalid optimization type' }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          optimization: optimized,
          models
        });
      } catch (optimizationError) {
        logger.warn('Models API: optimization failed, using fallback list', {
          error: optimizationError instanceof Error ? optimizationError.message : String(optimizationError),
          optimization: optimized,
          ...logContext
        });
        return NextResponse.json({
          success: true,
          optimization: optimized,
          models: getDefaultModels().slice(0, optimizedLimit),
          fallback: true
        });
      }
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
      preferredProviders,
      avoidProviders,
      speedPriority,
      maxResponseTokens
    } = body;

    const selector = getModelSelector();
    const model = await selector.selectModel({
      context,
      minContextWindow,
      maxCost,
      requiredCapabilities,
      preferredProviders,
      avoidProviders,
      speedPriority,
      maxResponseTokens
    });

    if (!model) {
      return NextResponse.json({
        success: false,
        error: 'No suitable model found for requirements'
      }, { status: 404 });
    }

    const scores = await selector.scoreModels(body);
    const selectedScore = scores.find(score => score.model.id === model.id);

    return NextResponse.json({
      success: true,
      selected: model,
      score: selectedScore?.score,
      reasons: selectedScore?.reasons,
      costEstimate: selectedScore?.costEstimate,
      alternatives: scores
        .filter(score => score.model.id !== model.id)
        .slice(0, 3)
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
