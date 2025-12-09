'use client';

import React, { useState } from 'react';
import type { MindFlowItem } from '@/types';
import type { PrioritizationResponse } from '@/types/ai-prioritization';

// Sparkles icon for AI features
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

interface AIPrioritizationButtonProps {
  tasks: MindFlowItem[];
  onPrioritizationComplete: (result: PrioritizationResponse) => void;
  availableTime?: number;
  className?: string;
  disabled?: boolean;
}

export const AIPrioritizationButton: React.FC<AIPrioritizationButtonProps> = ({
  tasks,
  onPrioritizationComplete,
  availableTime,
  className = '',
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handlePrioritize = async () => {
    if (isLoading || disabled) return;

    // Filter incomplete tasks
    const incompleteTasks = tasks.filter((task) => !task.completed);

    if (incompleteTasks.length === 0) {
      setError('Nenhuma tarefa ativa para priorizar');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: incompleteTasks,
          availableTime,
          preferences: {
            // User preferences can be added here
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao priorizar tarefas');
      }

      const result = await response.json();

      // Show success feedback
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);

      // Pass result to parent component
      onPrioritizationComplete(result.data);
    } catch (err: any) {
      console.error('Prioritization error:', err);
      setError(err.message || 'Erro ao priorizar tarefas');
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        setError(null);
      }, 4000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handlePrioritize}
        disabled={disabled || isLoading || tasks.filter((t) => !t.completed).length === 0}
        className={`
          flex items-center gap-1.5 px-2 py-1 text-sm
          transition-colors
          ${
            isLoading
              ? 'text-zinc-500 cursor-wait'
              : disabled || tasks.filter((t) => !t.completed).length === 0
                ? 'text-zinc-600 cursor-not-allowed'
                : 'text-zinc-500 hover:text-zinc-200'
          }
        `}
        aria-label="Priorizar tarefas com IA"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Analisando...</span>
          </>
        ) : (
          <>
            <SparklesIcon className="w-4 h-4" />
            <span>Priorizar com IA</span>
          </>
        )}
      </button>

      {/* Feedback Toast */}
      {showFeedback && (
        <div
          className={`
            absolute top-full mt-2 right-0 z-50
            px-4 py-2 rounded-lg shadow-xl
            text-sm font-medium whitespace-nowrap
            animate-fade-in-fast
            ${
              error
                ? 'bg-red-600 text-white'
                : 'bg-green-600 text-white'
            }
          `}
        >
          {error || '✓ Priorização concluída!'}
        </div>
      )}
    </div>
  );
};

export default AIPrioritizationButton;
