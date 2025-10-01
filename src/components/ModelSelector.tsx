import { ChevronDown, Sparkles, Zap, DollarSign, Brain } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
  pricing?: {
    input: number;
    output: number;
  };
  capabilities?: string[];
  contextWindow?: number;
}

interface ModelSelectorProps {
  value?: string;
  onChange?: (modelId: string) => void;
  context?: 'chat' | 'code' | 'analysis' | 'creative' | 'fast' | 'economical';
  className?: string;
}

export function ModelSelector({ value, onChange, context = 'chat', className = '' }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch models from API
  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        setError(null);

        // Always use default models for now since API is having issues
        console.log('Using default models directly');
        const defaultModels = getDefaultModels();
        setModels(defaultModels);
        
        if (!selectedModel && defaultModels.length > 0) {
          const defaultModel = defaultModels[0].id;
          setSelectedModel(defaultModel);
          onChange?.(defaultModel);
        }
      } catch (err) {
        console.error('Error with models:', err);
        setError('Erro ao carregar modelos');
        
        // Final fallback
        const fallbackModels = getDefaultModels();
        setModels(fallbackModels);
        
        if (!selectedModel && fallbackModels.length > 0) {
          const defaultModel = fallbackModels[0].id;
          setSelectedModel(defaultModel);
          onChange?.(defaultModel);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, [context]);

  // Update parent when selection changes
  useEffect(() => {
    if (selectedModel && selectedModel !== value) {
      onChange?.(selectedModel);
    }
  }, [selectedModel]);

  const handleSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setIsOpen(false);
  };

  const getModelIcon = (model: Model) => {
    const modelId = model.id.toLowerCase();
    const provider = model.provider.toLowerCase();

    // Z.AI Models
    if (provider === 'zai') {
      return <Zap className="h-4 w-4 text-emerald-400" />;
    }

    // Provider-based icons
    if (provider === 'openai') {
      if (modelId.includes('gpt-4o') && !modelId.includes('mini')) {
        return <Brain className="h-4 w-4 text-purple-400" />;
      }
      if (modelId.includes('mini')) {
        return <DollarSign className="h-4 w-4 text-green-400" />;
      }
      return <Sparkles className="h-4 w-4 text-purple-300" />;
    }

    if (provider === 'anthropic') {
      if (modelId.includes('opus')) {
        return <Brain className="h-4 w-4 text-orange-500" />;
      }
      if (modelId.includes('haiku')) {
        return <DollarSign className="h-4 w-4 text-green-400" />;
      }
      return <Sparkles className="h-4 w-4 text-orange-400" />;
    }

    if (provider === 'google') {
      if (modelId.includes('gemini-2')) {
        return <Zap className="h-4 w-4 text-blue-500" />;
      }
      if (modelId.includes('flash')) {
        return <DollarSign className="h-4 w-4 text-green-400" />;
      }
      return <Sparkles className="h-4 w-4 text-blue-400" />;
    }

    if (provider === 'cohere') {
      if (modelId.includes('plus')) {
        return <Brain className="h-4 w-4 text-indigo-400" />;
      }
      if (modelId.includes('light')) {
        return <DollarSign className="h-4 w-4 text-green-400" />;
      }
      return <Sparkles className="h-4 w-4 text-indigo-300" />;
    }

    if (provider === 'mistral') {
      if (modelId.includes('large')) {
        return <Brain className="h-4 w-4 text-red-400" />;
      }
      if (modelId.includes('small')) {
        return <DollarSign className="h-4 w-4 text-green-400" />;
      }
      return <Sparkles className="h-4 w-4 text-red-300" />;
    }

    if (provider === 'perplexity') {
      if (modelId.includes('huge')) {
        return <Brain className="h-4 w-4 text-cyan-500" />;
      }
      if (modelId.includes('small')) {
        return <DollarSign className="h-4 w-4 text-green-400" />;
      }
      return <Zap className="h-4 w-4 text-cyan-400" />; // Web search capability
    }

    return <Sparkles className="h-4 w-4 text-gray-400" />;
  };

  const formatPrice = (price?: number) => {
    if (!price) return '';
    return `$${price.toFixed(2)}/M`;
  };

  const currentModel = models.find(m => m.id === selectedModel);

  if (loading) {
    return (
      <div className={`h-10 bg-neutral-900 rounded-lg animate-pulse ${className}`} />
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-w-[300px] flex items-center justify-between gap-3 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {currentModel && getModelIcon(currentModel)}
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-sm font-medium text-neutral-100 truncate w-full">
              {currentModel?.name || 'Selecionar modelo'}
            </span>
            {currentModel?.provider && (
              <span className="text-xs text-neutral-500">
                {currentModel.provider.charAt(0).toUpperCase() + currentModel.provider.slice(1)}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 w-full min-w-[400px] max-h-[500px] bg-neutral-900 rounded-lg border border-neutral-800 shadow-2xl z-50 overflow-hidden">
            {models.length === 0 ? (
              <div className="px-4 py-3 text-sm text-neutral-400">
                {error || 'Nenhum modelo disponível'}
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {/* Group models by provider */}
                {Object.entries(
                  models.reduce((groups: Record<string, typeof models>, model) => {
                    const provider = model.provider;
                    if (!groups[provider]) groups[provider] = [];
                    groups[provider].push(model);
                    return groups;
                  }, {})
                ).map(([provider, providerModels]) => (
                  <div key={provider}>
                    <div className="px-3 py-2 text-xs font-medium text-neutral-500 bg-neutral-800/50 border-b border-neutral-800">
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </div>
                    {providerModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleSelect(model.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors border-b border-neutral-800/30 last:border-b-0 ${
                          model.id === selectedModel ? 'bg-neutral-800/80' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 flex-shrink-0">
                            {getModelIcon(model)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-medium text-neutral-100 break-words">
                                {model.name}
                              </div>
                              {model.pricing && (
                                <div className="text-xs text-neutral-400 flex-shrink-0">
                                  {formatPrice(model.pricing.input)}
                                </div>
                              )}
                            </div>
                            {model.description && (
                              <div className="text-xs text-neutral-400 mt-1 line-clamp-2">
                                {model.description}
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              {model.contextWindow && (
                                <span className="text-xs px-2 py-1 bg-neutral-700 rounded text-neutral-300">
                                  {model.contextWindow >= 1000000 
                                    ? `${(model.contextWindow / 1000000).toFixed(1)}M tokens`
                                    : `${(model.contextWindow / 1000).toFixed(0)}k tokens`
                                  }
                                </span>
                              )}
                              {model.capabilities && model.capabilities.length > 0 && (
                                <div className="flex gap-1">
                                  {model.capabilities.slice(0, 3).map((cap) => (
                                    <span
                                      key={cap}
                                      className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded"
                                    >
                                      {cap}
                                    </span>
                                  ))}
                                  {model.capabilities.length > 3 && (
                                    <span className="text-xs text-neutral-500">
                                      +{model.capabilities.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Default models as fallback
function getDefaultModels(): Model[] {
  return [
    // Z.AI Models (Default/Priority)
    {
      id: 'zai/glm-4.6',
      name: 'GLM-4.6',
      provider: 'zai',
      description: 'Modelo avançado da Z.AI - Recomendado',
      contextWindow: 128000,
      pricing: { input: 0, output: 0 }, // Free tier
      capabilities: ['text', 'vision', 'function-calling', 'reasoning']
    },

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
    {
      id: 'cohere/command-light',
      name: 'Command Light',
      provider: 'cohere',
      description: 'Modelo leve e rápido da Cohere',
      contextWindow: 4096,
      pricing: { input: 0.3, output: 0.6 },
      capabilities: ['text']
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
    {
      id: 'mistral/mistral-small',
      name: 'Mistral Small',
      provider: 'mistral',
      description: 'Modelo compacto da Mistral AI',
      contextWindow: 32000,
      pricing: { input: 1, output: 3 },
      capabilities: ['text']
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
    },
    {
      id: 'perplexity/llama-3.1-sonar-huge-128k-online',
      name: 'Sonar Huge Online',
      provider: 'perplexity',
      description: 'Modelo mais poderoso com pesquisa web',
      contextWindow: 127072,
      pricing: { input: 5, output: 5 },
      capabilities: ['text', 'web-search', 'reasoning', 'real-time']
    }
  ];
}