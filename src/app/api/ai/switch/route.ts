import { NextResponse } from 'next/server';

import { getGatewayProvider } from '@/server/ai/gateway/provider';
import { AIProvider } from '@/server/aiProvider';

export async function POST(req: Request) {
  try {
    const { modelId, context, reason } = await req.json();

    if (!modelId) {
      return NextResponse.json({
        success: false,
        error: 'Model ID is required'
      }, { status: 400 });
    }

    // Validate model exists
    const gateway = getGatewayProvider();
    const modelInfo = await gateway.getModelInfo(modelId);
    
    if (!modelInfo) {
      return NextResponse.json({
        success: false,
        error: `Model ${modelId} not found`
      }, { status: 404 });
    }

    // Test the model by creating an instance
    try {
      const aiProvider = AIProvider.getInstance();
      const model = await aiProvider.getModel({ 
        provider: 'gateway',
        model: modelId,
        useGateway: true
      });

      // Log the switch
      console.log(`[API] Model switched to ${modelId}`, {
        context,
        reason,
        provider: modelInfo.provider,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: `Successfully switched to ${modelId}`,
        model: {
          id: modelInfo.id,
          name: modelInfo.name,
          provider: modelInfo.provider,
          pricing: modelInfo.pricing,
          capabilities: modelInfo.capabilities
        },
        context,
        timestamp: new Date().toISOString()
      });

    } catch (modelError: any) {
      console.error(`[API] Failed to initialize model ${modelId}:`, modelError);
      
      return NextResponse.json({
        success: false,
        error: `Failed to initialize model: ${modelError.message}`,
        modelId
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API] Model switch error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to switch model'
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const context = url.searchParams.get('context') || 'chat';

    const gateway = getGatewayProvider();
    
    // Get recommended models for the context
    const recommended = await gateway.getRecommendedModels(context, 10);
    
    // Get current model info (this would need to be stored somewhere)
    // For now, we'll just return the first recommended model as "current"
    const currentModel = recommended[0] || null;

    return NextResponse.json({
      success: true,
      current: currentModel,
      recommended,
      context,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[API] Model switch info error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get model switch info'
    }, { status: 500 });
  }
}