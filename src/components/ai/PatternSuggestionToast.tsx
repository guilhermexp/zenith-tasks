'use client';

import React, { useState, useEffect } from 'react';
import type { PatternSuggestion } from '@/types/ai-prioritization';

// Icons
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

interface ToastSuggestion extends PatternSuggestion {
  id: string;
}

interface PatternSuggestionToastProps {
  suggestions: ToastSuggestion[];
  onAccept: (suggestionId: string) => Promise<void>;
  onDismiss: (suggestionId: string) => void;
  onRemindLater: (suggestionId: string) => void;
  maxVisible?: number;
}

export const PatternSuggestionToast: React.FC<PatternSuggestionToastProps> = ({
  suggestions,
  onAccept,
  onDismiss,
  onRemindLater,
  maxVisible = 3,
}) => {
  const [visibleSuggestions, setVisibleSuggestions] = useState<ToastSuggestion[]>([]);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Show only top N suggestions based on impact
    const sorted = [...suggestions]
      .sort((a, b) => {
        const impactOrder = { high: 0, medium: 1, low: 2 };
        return impactOrder[a.impact] - impactOrder[b.impact];
      })
      .slice(0, maxVisible);

    setVisibleSuggestions(sorted);
  }, [suggestions, maxVisible]);

  const handleAccept = async (suggestionId: string) => {
    setLoadingIds((prev) => new Set(prev).add(suggestionId));
    try {
      await onAccept(suggestionId);
      // Remove from visible after accepting
      setDismissingIds((prev) => new Set(prev).add(suggestionId));
      setTimeout(() => {
        setVisibleSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
        setDismissingIds((prev) => {
          const next = new Set(prev);
          next.delete(suggestionId);
          return next;
        });
      }, 300);
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestionId);
        return next;
      });
    }
  };

  const handleDismiss = (suggestionId: string) => {
    setDismissingIds((prev) => new Set(prev).add(suggestionId));
    setTimeout(() => {
      onDismiss(suggestionId);
      setVisibleSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestionId);
        return next;
      });
    }, 300);
  };

  const handleRemindLater = (suggestionId: string) => {
    setDismissingIds((prev) => new Set(prev).add(suggestionId));
    setTimeout(() => {
      onRemindLater(suggestionId);
      setVisibleSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestionId);
        return next;
      });
    }, 300);
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low'): string => {
    switch (impact) {
      case 'high':
        return 'border-purple-500/30 bg-purple-500/10';
      case 'medium':
        return 'border-blue-500/30 bg-blue-500/10';
      case 'low':
        return 'border-zinc-500/30 bg-zinc-800/40';
    }
  };

  const getImpactLabel = (impact: 'high' | 'medium' | 'low'): string => {
    switch (impact) {
      case 'high':
        return 'Alto Impacto';
      case 'medium':
        return 'Médio Impacto';
      case 'low':
        return 'Baixo Impacto';
    }
  };

  if (visibleSuggestions.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-md">
      {visibleSuggestions.map((suggestion, index) => {
        const isLoading = loadingIds.has(suggestion.id);
        const isDismissing = dismissingIds.has(suggestion.id);

        return (
          <div
            key={suggestion.id}
            className={`
              border rounded-xl shadow-2xl p-4
              transition-all duration-300 ease-out
              ${getImpactColor(suggestion.impact)}
              ${isDismissing ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
              ${index > 0 ? 'mt-3' : ''}
            `}
            style={{
              animationDelay: `${index * 100}ms`,
              animation: isDismissing ? 'none' : 'slide-in-right 0.3s ease-out',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <SparklesIcon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-zinc-100 mb-1">
                    {suggestion.title}
                  </h4>
                  <p className="text-xs text-zinc-400">
                    {suggestion.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDismiss(suggestion.id)}
                className="p-1 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                aria-label="Dispensar"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Impact Badge */}
            <div className="mb-3">
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium text-purple-300 bg-purple-500/20 border border-purple-500/30">
                {getImpactLabel(suggestion.impact)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAccept(suggestion.id)}
                disabled={isLoading}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  transition-all
                  ${
                    isLoading
                      ? 'bg-purple-600/50 text-purple-200 cursor-wait'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 active:scale-95'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Aplicando...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>Aplicar</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleRemindLater(suggestion.id)}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Lembrar mais tarde"
              >
                <ClockIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Show count if more suggestions available */}
      {suggestions.length > maxVisible && (
        <div className="text-center">
          <span className="text-xs text-zinc-500">
            +{suggestions.length - maxVisible} sugestões ocultas
          </span>
        </div>
      )}
    </div>
  );
};

export default PatternSuggestionToast;
