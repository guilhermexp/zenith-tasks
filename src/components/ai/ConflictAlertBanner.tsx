'use client';

import React, { useState } from 'react';
import type { DetectedConflict, ConflictResolutionSuggestion } from '@/types/ai-prioritization';

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

const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const AlertCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="m9 18 6-6-6-6" />
  </svg>
);

interface ConflictAlertBannerProps {
  conflicts: DetectedConflict[];
  onDismiss: (conflictId: string) => void;
  onResolve: (conflictId: string, suggestion: ConflictResolutionSuggestion) => void;
  autoResolve?: boolean;
  position?: 'top' | 'bottom';
}

export const ConflictAlertBanner: React.FC<ConflictAlertBannerProps> = ({
  conflicts,
  onDismiss,
  onResolve,
  autoResolve = false,
  position = 'top',
}) => {
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set());
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  if (conflicts.length === 0) return null;

  const toggleExpanded = (conflictId: string) => {
    setExpandedConflicts((prev) => {
      const next = new Set(prev);
      if (next.has(conflictId)) {
        next.delete(conflictId);
      } else {
        next.add(conflictId);
      }
      return next;
    });
  };

  const handleDismiss = (conflictId: string) => {
    setDismissingIds((prev) => new Set(prev).add(conflictId));
    setTimeout(() => {
      onDismiss(conflictId);
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(conflictId);
        return next;
      });
    }, 300);
  };

  const handleResolve = (conflictId: string, suggestion: ConflictResolutionSuggestion) => {
    onResolve(conflictId, suggestion);
    handleDismiss(conflictId);
  };

  const getSeverityStyles = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-500/10 border-red-500/30',
          text: 'text-red-300',
          icon: 'text-red-400',
          badge: 'bg-red-500/20 text-red-300 border-red-500/30',
        };
      case 'warning':
        return {
          bg: 'bg-orange-500/10 border-orange-500/30',
          text: 'text-orange-300',
          icon: 'text-orange-400',
          badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        };
      case 'info':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30',
          text: 'text-blue-300',
          icon: 'text-blue-400',
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        };
    }
  };

  const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return AlertTriangleIcon;
      case 'warning':
        return AlertCircleIcon;
      case 'info':
        return InfoIcon;
    }
  };

  const getSeverityLabel = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return 'Crítico';
      case 'warning':
        return 'Atenção';
      case 'info':
        return 'Informação';
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'scheduling':
        return 'Conflito de Agendamento';
      case 'overload':
        return 'Sobrecarga de Trabalho';
      case 'deadline':
        return 'Conflito de Prazo';
      default:
        return 'Conflito Detectado';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'reschedule':
        return 'Reagendar';
      case 'delegate':
        return 'Delegar';
      case 'breakdown':
        return 'Dividir Tarefa';
      case 'extend':
        return 'Estender Prazo';
      default:
        return 'Resolver';
    }
  };

  // Sort conflicts by severity
  const sortedConflicts = [...conflicts].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <div
      className={`
        fixed left-0 right-0 z-40 px-4 py-3
        ${position === 'top' ? 'top-0' : 'bottom-0'}
      `}
    >
      <div className="max-w-7xl mx-auto space-y-2">
        {sortedConflicts.map((conflict) => {
          const styles = getSeverityStyles(conflict.severity);
          const Icon = getSeverityIcon(conflict.severity);
          const isExpanded = expandedConflicts.has(conflict.id);
          const isDismissing = dismissingIds.has(conflict.id);

          return (
            <div
              key={conflict.id}
              className={`
                border rounded-lg shadow-xl backdrop-blur-sm
                transition-all duration-300 ease-out
                ${styles.bg}
                ${isDismissing ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}
              `}
            >
              {/* Header */}
              <div className="flex items-start gap-3 p-4">
                <Icon className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${styles.badge} mb-1`}>
                        {getSeverityLabel(conflict.severity)}
                      </span>
                      <h4 className={`text-sm font-semibold ${styles.text}`}>
                        {getConflictTypeLabel(conflict.conflictType)}
                      </h4>
                    </div>
                    <button
                      onClick={() => handleDismiss(conflict.id)}
                      className={`p-1 rounded hover:bg-neutral-700/50 ${styles.text} transition-colors flex-shrink-0`}
                      aria-label="Dispensar"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm text-neutral-300 mb-3">
                    {conflict.description}
                  </p>

                  {/* Suggestions Toggle */}
                  {conflict.suggestions && conflict.suggestions.length > 0 && (
                    <button
                      onClick={() => toggleExpanded(conflict.id)}
                      className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors mb-2"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronDownIcon className="w-4 h-4" />
                          <span>Ocultar sugestões</span>
                        </>
                      ) : (
                        <>
                          <ChevronRightIcon className="w-4 h-4" />
                          <span>Ver {conflict.suggestions.length} sugestões de resolução</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Expanded Suggestions */}
                  {isExpanded && conflict.suggestions && (
                    <div className="mt-3 space-y-2 pl-4 border-l-2 border-neutral-700/50">
                      {conflict.suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between gap-3 p-3 bg-neutral-800/40 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-semibold text-neutral-200 mb-1">
                              {getActionLabel(suggestion.action)}
                            </h5>
                            {suggestion.details && (
                              <p className="text-xs text-neutral-400">
                                {typeof suggestion.details === 'string'
                                  ? suggestion.details
                                  : JSON.stringify(suggestion.details)}
                              </p>
                            )}
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs text-purple-300 bg-purple-500/20">
                              Impacto: {suggestion.impact}
                            </span>
                          </div>
                          <button
                            onClick={() => handleResolve(conflict.id, suggestion)}
                            className="px-3 py-1.5 rounded text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors flex-shrink-0"
                          >
                            Aplicar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConflictAlertBanner;
