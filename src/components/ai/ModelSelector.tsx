'use client';

import React, { useState, useEffect } from 'react';

import { SpinnerIcon, CheckIcon, BellIcon as AlertIcon } from '../Icons';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
  pricing?: {
    input: number;
    output: number;
  };
  capabilities: string[];
  contextWindow: number;
}

interface ModelSelectorProps {
  context?: string;
  onModelSelect?: (modelId: string) => void;
  className?: string;
}

export default function ModelSelector({ 
  context = 'chat', 
  onModelSelect,
  className = '' 
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  // Load available models
  useEffect(() => {
    loadModels();
  }, [context]);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ai/models?context=recommended&for=${context}&limit=10`);
      const data = await response.json();

      if (data.success) {
        setModels(data.models);
        // Set first model as selected if none selected
        if (!selectedModel && data.models.length > 0) {
          setSelectedModel(data.models[0].id);
        }
      } else {
        setError(data.error || 'Failed to load models');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = async (modelId: string) => {
    if (switching || modelId === selectedModel) return;

    try {
      setSwitching(true);
      
      const response = await fetch('/api/ai/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          context,
          reason: 'User selection via ModelSelector'
        })
      });

      const data = await response.json();

      if (data.success) {
        setSelectedModel(modelId);
        onModelSelect?.(modelId);
        
        // Show success feedback
        console.log(`Model switched to ${modelId}`);
      } else {
        setError(data.error || 'Failed to switch model');
      }
    } catch (err: any) {
      setError(err.message || 'Switch failed');
    } finally {
      setSwitching(false);
    }
  };

  const formatPrice = (price: number): string => {
    if (price === 0) return 'Free';
    if (price < 0.000001) return '<$0.000001';
    return `$${price.toFixed(6)}`;
  };

  const getProviderColor = (provider: string): string => {
    const colors: Record<string, string> = {
      'openai': 'bg-green-100 text-green-800',
      'anthropic': 'bg-orange-100 text-orange-800',
      'google': 'bg-blue-100 text-blue-800',
      'xai': 'bg-purple-100 text-purple-800',
      'meta': 'bg-indigo-100 text-indigo-800'
    };
    return colors[provider] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <SpinnerIcon className="w-5 h-5 mr-2" />
        <span className="text-sm text-gray-600">Carregando modelos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center">
          <AlertIcon className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
        <button
          onClick={loadModels}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          Modelos Disponíveis ({context})
        </h3>
        <button
          onClick={loadModels}
          className="text-xs text-gray-500 hover:text-gray-700"
          disabled={loading}
        >
          Atualizar
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {models.map((model) => (
          <div
            key={model.id}
            className={`p-3 border rounded-lg cursor-pointer transition-all ${
              selectedModel === model.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleModelSelect(model.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{model.name}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getProviderColor(model.provider)}`}>
                    {model.provider}
                  </span>
                  {selectedModel === model.id && (
                    <CheckIcon className="w-4 h-4 text-green-500" />
                  )}
                </div>
                
                {model.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {model.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {model.pricing && (
                    <span>
                      In: {formatPrice(model.pricing.input)}/tok
                      {' • '}
                      Out: {formatPrice(model.pricing.output)}/tok
                    </span>
                  )}
                  <span>{model.contextWindow.toLocaleString()} ctx</span>
                </div>

                {model.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {model.capabilities.slice(0, 3).map((cap) => (
                      <span
                        key={cap}
                        className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {cap}
                      </span>
                    ))}
                    {model.capabilities.length > 3 && (
                      <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        +{model.capabilities.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {switching && selectedModel === model.id && (
                <SpinnerIcon className="w-4 h-4 text-blue-500" />
              )}
            </div>
          </div>
        ))}
      </div>

      {models.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Nenhum modelo disponível</p>
          <button
            onClick={loadModels}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Recarregar
          </button>
        </div>
      )}
    </div>
  );
}