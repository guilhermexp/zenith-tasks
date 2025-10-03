'use client';

import React, { useState, useEffect } from 'react';

import { DollarSignIcon, BellIcon as AlertIcon, TrendingUpIcon, SpinnerIcon } from '../Icons';

interface CreditInfo {
  balance: number;
  totalUsed: number;
  dailyUsageEstimate: number;
  monthlyUsageEstimate: number;
  projectedDaysRemaining: number | null;
  lastUpdated: string;
}

interface Alert {
  type: 'critical' | 'warning' | 'info';
  message: string;
  threshold: number;
  current: number;
  suggestions: string[];
}

interface CreditMonitorProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function CreditMonitor({ 
  className = '',
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute
}: CreditMonitorProps) {
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Load credits data
  const loadCredits = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const query = forceRefresh ? '?history=true&days=7' : '';
      const response = await fetch(`/api/credits${query}`);
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      const creditsPayload = data.credits as CreditInfo | undefined;
      if (!creditsPayload) {
        throw new Error('Resposta inválida da API de créditos');
      }

      setCredits(creditsPayload);
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setRecommendations(Array.isArray(data.recommendations) ? data.recommendations : []);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    loadCredits();

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadCredits();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const formatCurrency = (amount?: number): string => {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return '$0.00';
    if (amount === 0) return '$0.00';
    if (amount < 0.01) return '<$0.01';
    return `$${amount.toFixed(2)}`;
  };

  const getBalanceColor = (balance: number): string => {
    if (balance < 10) return 'text-red-600';
    if (balance < 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertIcon className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertIcon className="w-4 h-4 text-yellow-500" />;
      default:
        return <TrendingUpIcon className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading && !credits) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <SpinnerIcon className="w-5 h-5 mr-2" />
        <span className="text-sm text-gray-600">Carregando créditos...</span>
      </div>
    );
  }

  if (error && !credits) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center">
          <AlertIcon className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
        <button
          onClick={() => loadCredits(true)}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSignIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Créditos AI Gateway</h3>
        </div>
        <div className="flex items-center gap-2">
          {loading && <SpinnerIcon className="w-4 h-4 text-gray-400" />}
          <button
            onClick={() => loadCredits(true)}
            className="text-xs text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            Atualizar
          </button>
        </div>
      </div>

      {credits && (
        <>
          {/* Balance Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white border rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Saldo Atual</div>
              <div className={`text-lg font-bold ${getBalanceColor(credits.balance)}`}>
                {formatCurrency(credits.balance)}
              </div>
            </div>
            
            <div className="p-3 bg-white border rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Total Usado</div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(credits.totalUsed)}
              </div>
            </div>
          </div>

          {/* Usage Estimates */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-700 mb-2">Estimativas de Uso</div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Diário:</span>
                <span className="ml-1 font-medium">
                  {formatCurrency(credits.dailyUsageEstimate)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Mensal:</span>
                <span className="ml-1 font-medium">
                  {formatCurrency(credits.monthlyUsageEstimate)}
                </span>
              </div>
            </div>
            
          {credits.projectedDaysRemaining !== null && (
              <div className="mt-2 text-xs">
                <span className="text-gray-500">Duração estimada:</span>
                <span className="ml-1 font-medium">
                  {credits.projectedDaysRemaining} dias
                </span>
              </div>
            )}
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    alert.type === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : alert.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="text-sm font-medium">{alert.message}</div>
                      {alert.suggestions.length > 0 && (
                        <ul className="mt-1 text-xs text-gray-600 space-y-1">
                          {alert.suggestions.map((suggestion, i) => (
                            <li key={i}>• {suggestion}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-2">
                💡 Recomendações
              </div>
              <ul className="text-xs text-blue-800 space-y-1">
                {recommendations.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Last Updated */}
          {lastRefresh && (
            <div className="text-xs text-gray-500 text-center">
              Última atualização: {lastRefresh.toLocaleTimeString('pt-BR')}
            </div>
          )}
        </>
      )}
    </div>
  );
}