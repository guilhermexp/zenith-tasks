'use client';

import React, { useState, useEffect } from 'react';
import type { ProductivityInsights } from '@/types/ai-prioritization';

// Icons
const TrendingUpIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const TrendingDownIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
    <polyline points="16 17 22 17 22 11" />
  </svg>
);

const MinusIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M5 12h14" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const LightbulbIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
);

type Period = 'week' | 'month' | 'quarter';

export const InsightsDashboard: React.FC = () => {
  const [period, setPeriod] = useState<Period>('week');
  const [insights, setInsights] = useState<ProductivityInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights(period);
  }, [period]);

  const fetchInsights = async (selectedPeriod: Period) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/insights?period=${selectedPeriod}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar insights');
      }

      const result = await response.json();
      setInsights(result.data);
    } catch (err: any) {
      console.error('Failed to fetch insights:', err);
      setError(err.message || 'Erro ao carregar insights');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchInsights(period);
  };

  const handleExport = () => {
    if (!insights) return;

    const data = JSON.stringify(insights, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productivity-insights-${period}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUpIcon className="w-5 h-5 text-green-400" />;
      case 'declining':
        return <TrendingDownIcon className="w-5 h-5 text-red-400" />;
      default:
        return <MinusIcon className="w-5 h-5 text-neutral-400" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'Melhorando';
      case 'declining':
        return 'Declinando';
      default:
        return 'Estável';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-400';
      case 'declining':
        return 'text-red-400';
      default:
        return 'text-neutral-400';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-800/50 bg-neutral-900/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold text-neutral-100">
                Insights de Produtividade
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Análise detalhada dos seus padrões de trabalho
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-1.5 rounded-lg hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Atualizar"
              >
                <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleExport}
                disabled={!insights || isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Exportar</span>
              </button>
            </div>
          </div>

          {/* Period Tabs */}
          <div className="flex items-center gap-2 mt-3">
            {(['week', 'month', 'quarter'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${
                    period === p
                      ? 'bg-neutral-700 text-neutral-100 border border-neutral-600'
                      : 'bg-neutral-800/40 text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                  }
                `}
              >
                {p === 'week' && 'Semanal'}
                {p === 'month' && 'Mensal'}
                {p === 'quarter' && 'Trimestral'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-neutral-700/30 border-t-neutral-500 rounded-full animate-spin" />
              <p className="text-sm text-neutral-400">Analisando seus dados...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-300">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {!isLoading && !error && insights && (
          <div className="space-y-3">
            {/* Productivity Score Card */}
            <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-neutral-400 mb-1">Score de Produtividade</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-neutral-100">
                      {insights.productivityScore.toFixed(0)}
                    </span>
                    <span className="text-lg text-neutral-500 mb-1">/100</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-900/50">
                  {getTrendIcon(insights.trend)}
                  <span className={`text-xs font-medium ${getTrendColor(insights.trend)}`}>
                    {getTrendLabel(insights.trend)}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid Layout for Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Productive Hours */}
              <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-neutral-100 mb-3">
                  Horários Mais Produtivos
                </h3>
                {insights.mostProductiveHours && insights.mostProductiveHours.length > 0 ? (
                  <div className="space-y-2">
                    {insights.mostProductiveHours.slice(0, 5).map((slot, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <span className="text-sm text-neutral-300">
                          {slot.hour.toString().padStart(2, '0')}:00 - {(slot.hour + 1).toString().padStart(2, '0')}:00
                        </span>
                        <span className="text-sm font-semibold text-neutral-200">
                          Score: {slot.productivityScore.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">Sem dados suficientes</p>
                )}
              </div>

              {/* Task Type Breakdown */}
              <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-neutral-100 mb-3">
                  Conclusão por Tipo de Tarefa
                </h3>
                {insights.taskCompletionByType && Object.keys(insights.taskCompletionByType).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(insights.taskCompletionByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between py-2">
                        <span className="text-sm text-neutral-300">{type}</span>
                        <span className="text-sm font-semibold text-neutral-200">
                          {count} tarefas
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">Sem dados suficientes</p>
                )}
              </div>
            </div>

            {/* Procrastination Patterns */}
            {insights.procrastinationPatterns && insights.procrastinationPatterns.length > 0 && (
              <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-neutral-200 mb-3">
                  Padrões de Procrastinação Detectados
                </h3>
                <div className="space-y-2">
                  {insights.procrastinationPatterns.map((pattern, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-neutral-400">⚠️</span>
                      <p className="text-sm text-neutral-300">
                        {typeof pattern === 'string' ? pattern : JSON.stringify(pattern)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvement Suggestions */}
            {insights.improvementSuggestions && insights.improvementSuggestions.length > 0 && (
              <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <LightbulbIcon className="w-4 h-4 text-neutral-300" />
                  <h3 className="text-sm font-semibold text-neutral-200">
                    Sugestões de Melhoria
                  </h3>
                </div>
                <div className="space-y-2">
                  {insights.improvementSuggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-neutral-900/40 rounded-lg">
                      <span className="text-neutral-300 font-semibold">{index + 1}.</span>
                      <p className="text-sm text-neutral-300">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && !error && !insights && (
          <div className="text-center py-20">
            <p className="text-neutral-500">Nenhum insight disponível</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsDashboard;
