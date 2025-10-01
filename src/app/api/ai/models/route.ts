import { NextResponse } from 'next/server';

import { getModelSelector } from '@/server/ai/gateway/model-selector';
import { getGatewayProvider } from '@/server/ai/gateway/provider';
import { extractClientKey, rateLimit } from '@/server/rateLimit';

export async function GET(req: Request) {
  try {
    // Rate limiting
    const key = extractClientKey(req);
    if (!rateLimit({ key, limit: 30, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const url = new URL(req.url);
    const provider = url.searchParams.get('provider');
    const context = url.searchParams.get('context');
    const recommended = url.searchParams.get('recommended') === 'true';
    const optimized = url.searchParams.get('optimized'); // 'cost' | 'performance' | 'quality'

    const gatewayProvider = getGatewayProvider();
    const selector = getModelSelector();

    // Get recommended models for context
    if (recommended && context) {
      const recommendations = await selector.getRecommendations(context, {
        budget: url.searchParams.get('budget') as any || 'medium',
        priority: url.searchParams.get('priority') as any || 'balanced'
      });

      return NextResponse.json({
        context,
        recommendations: recommendations.map(r => ({
          model: r.model,
          score: r.score,
          reasons: r.reasons,
          costEstimate: r.costEstimate
        }))
      });
    }

    // Get optimized models
    if (optimized) {
      let models;
      const limit = parseInt(url.searchParams.get('limit') || '5');

      switch (optimized) {
        case 'cost':
          models = await selector.getCostOptimizedModels(limit);
          break;
        case 'performance':
          models = await selector.getPerformanceOptimizedModels(limit);
          break;
        case 'quality':
          models = await selector.getQualityOptimizedModels(limit);
          break;
        default:
          return NextResponse.json({ error: 'Invalid optimization type' }, { status: 400 });
      }

      return NextResponse.json({
        optimization: optimized,
        models
      });
    }

    // Get models by provider
    if (provider) {
      const models = await gatewayProvider.getModelsByProvider(provider);
      return NextResponse.json({ provider, models });
    }

    // Get all available models
    const models = await gatewayProvider.getAvailableModels();
    const providers = await gatewayProvider.getProviders();

    return NextResponse.json({
      total: models.length,
      providers,
      models
    });

  } catch (error: any) {
    console.error('[API/models] Error:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to fetch models'
    }, { status: 500 });
  }
}

// Select best model for request
export async function POST(req: Request) {
  try {
    // Rate limiting
    const key = extractClientKey(req);
    if (!rateLimit({ key, limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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
        error: 'No suitable model found for requirements'
      }, { status: 404 });
    }

    // Get scoring details
    const scores = await selector.scoreModels(body);
    const selectedScore = scores.find(s => s.model.id === model.id);

    return NextResponse.json({
      selected: model,
      score: selectedScore?.score,
      reasons: selectedScore?.reasons,
      costEstimate: selectedScore?.costEstimate,
      alternatives: scores.slice(0, 3).filter(s => s.model.id !== model.id)
    });

  } catch (error: any) {
    console.error('[API/models] Error selecting model:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to select model'
    }, { status: 500 });
  }
}