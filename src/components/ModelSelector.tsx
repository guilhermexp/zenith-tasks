import { ChevronDown, Sparkles, Zap, DollarSign, Brain } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

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
  const selectedModelRef = useRef(selectedModel);

  // Fetch models from API
  useEffect(() => {
    if (value) {
      setSelectedModel(value);
    }
  }, [value]);

  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    let cancelled = false;

    async function fetchModels() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/models?recommended=true&context=${encodeURIComponent(context)}&limit=20`);
        const data = await response.json();

        if (!response.ok || data.success === false) {
          throw new Error(data?.error || `HTTP ${response.status}`);
        }

        const fetchedModels: Model[] = Array.isArray(data.models) && data.models.length
          ? data.models
          : getDefaultModels();

        if (cancelled) return;

        setModels(fetchedModels);

        if (!selectedModelRef.current && fetchedModels.length > 0) {
          const defaultModel = fetchedModels[0].id;
          setSelectedModel(defaultModel);
          selectedModelRef.current = defaultModel;
          onChange?.(defaultModel);
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || 'Erro ao carregar modelos');

        const fallbackModels = getDefaultModels();
        setModels(fallbackModels);

        if (!selectedModelRef.current && fallbackModels.length > 0) {
          const defaultModel = fallbackModels[0].id;
          setSelectedModel(defaultModel);
          selectedModelRef.current = defaultModel;
          onChange?.(defaultModel);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchModels();

    return () => {
      cancelled = true;
    };
  }, [context, onChange, value]);

  // Update parent when selection changes
  useEffect(() => {
    if (selectedModel && selectedModel !== value) {
      onChange?.(selectedModel);
    }
  }, [selectedModel, value, onChange]);

  const handleSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setIsOpen(false);
  };

  const getModelIcon = (model: Model) => {
    const modelId = model.id.toLowerCase();
    const provider = model.provider.toLowerCase();

    // Gateway
    if (provider === 'gateway') {
      return <Sparkles className="h-4 w-4 text-cyan-400" />;
    }

    // Z.AI Models (direct)
    if (provider === 'zai') {
      return <Zap className="h-4 w-4 text-emerald-400" />;
    }

    // XAI Grok Models
    if (provider === 'xai') {
      return <Zap className="h-4 w-4 text-violet-400" />;
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
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 transition-colors min-w-0"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {currentModel && getModelIcon(currentModel)}
          <span className="text-sm font-medium text-neutral-100 truncate">
            {currentModel?.name || 'Modelo'}
          </span>
        </div>
        <ChevronDown
          className={`h-3 w-3 text-neutral-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full mb-2 w-full min-w-[380px] max-h-[600px] bg-neutral-900 rounded-lg border border-neutral-800 shadow-2xl z-50 overflow-hidden">
            {models.length === 0 ? (
              <div className="px-3 py-2 text-sm text-neutral-400">
                {error || 'Nenhum modelo disponível'}
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                {models.slice(0, 20).map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-neutral-800 transition-colors border-b border-neutral-800/30 last:border-b-0 ${
                      model.id === selectedModel ? 'bg-neutral-800/80' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {getModelIcon(model)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-neutral-100 truncate">
                            {model.name}
                          </span>
                          <span className="text-xs text-neutral-500 flex-shrink-0">
                            {model.provider === 'gateway' ? 'GTW' : model.provider.slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                        {model.description && (
                          <div className="text-xs text-neutral-400 truncate mt-0.5">
                            {model.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {model.contextWindow && (
                            <span className="text-xs px-1.5 py-0.5 bg-neutral-700 rounded text-neutral-300">
                              {model.contextWindow >= 1000000 
                                ? `${(model.contextWindow / 1000000).toFixed(1)}M`
                                : `${(model.contextWindow / 1000).toFixed(0)}k`
                              }
                            </span>
                          )}
                          {model.capabilities && model.capabilities.includes('function-calling') && (
                            <span className="text-xs px-1.5 py-0.5 bg-emerald-900/30 text-emerald-300 rounded">
                              tools
                            </span>
                          )}
                          {model.capabilities && model.capabilities.includes('vision') && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded">
                              vision
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Default models as fallback (Grok como primeiro = padrão)
function getDefaultModels(): Model[] {
  return [
    {
      id: 'xai/grok-4-fast-reasoning',
      name: '⚡ Grok 4 Fast Reasoning',
      provider: 'xai',
      description: 'xAI Grok 4 - Raciocínio rápido e eficiente',
      contextWindow: 2000000,
      capabilities: ['text', 'fast', 'reasoning']
    },
    {
      id: 'google/gemini-2.5-pro',
      name: '🟢 Gemini 2.5 Pro',
      provider: 'google',
      description: 'Google Gemini 2.5 - Alta qualidade com grande contexto',
      contextWindow: 2000000,
      capabilities: ['text', 'vision', 'huge-context']
    },
    {
      id: 'zai/glm-4.6',
      name: '🚀 GLM-4.6',
      provider: 'zai',
      description: 'Zhipu AI GLM-4.6 - Especialista em código e agentes',
      contextWindow: 200000,
      capabilities: ['text', 'code', 'agentic']
    },
    {
      id: 'google/gemini-2.5-flash',
      name: '⚡ Gemini 2.5 Flash',
      provider: 'google',
      description: 'Google Gemini Flash - Respostas rápidas e eficientes',
      contextWindow: 1000000,
      capabilities: ['text', 'vision', 'fast']
    }
  ];
}
