'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { MindFlowItem } from '@/types';
import type { PrioritizationResponse, PrioritizedTask } from '@/types/ai-prioritization';

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

const GripVerticalIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="19" r="1" />
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

interface PrioritizationResultsProps {
  isOpen: boolean;
  onClose: () => void;
  result: PrioritizationResponse;
  tasks: MindFlowItem[];
  onAccept: (taskOrder: string[]) => void;
}

export const PrioritizationResults: React.FC<PrioritizationResultsProps> = ({
  isOpen,
  onClose,
  result,
  tasks,
  onAccept,
}) => {
  const [orderedTasks, setOrderedTasks] = useState<PrioritizedTask[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result?.prioritizedTasks) {
      setOrderedTasks([...result.prioritizedTasks]);
    }
  }, [result]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTasks = [...orderedTasks];
    const draggedTask = newTasks[draggedIndex];
    newTasks.splice(draggedIndex, 1);
    newTasks.splice(index, 0, draggedTask);

    // Update ranks
    newTasks.forEach((task, i) => {
      task.rank = i + 1;
    });

    setOrderedTasks(newTasks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleAccept = () => {
    const taskOrder = orderedTasks.map((t) => t.taskId);
    onAccept(taskOrder);
    onClose();
  };

  const toggleExpanded = (taskId: string) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  const getPriorityColor = (score: number): string => {
    if (score >= 8) return 'bg-neutral-700/40 text-neutral-200 border-neutral-600/50';
    if (score >= 6) return 'bg-neutral-700/30 text-neutral-300 border-neutral-600/40';
    if (score >= 4) return 'bg-neutral-800/40 text-neutral-400 border-neutral-700/40';
    return 'bg-neutral-800/30 text-neutral-500 border-neutral-700/30';
  };

  const getPriorityLabel = (score: number): string => {
    if (score >= 8) return 'Urgente';
    if (score >= 6) return 'Alta';
    if (score >= 4) return 'Média';
    return 'Baixa';
  };

  const getTaskTitle = (taskId: string): string => {
    const task = tasks.find((t) => t.id === taskId);
    return task?.title || 'Tarefa não encontrada';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in-fast">
      <div
        ref={modalRef}
        className="bg-neutral-900 border border-neutral-700/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up-fast"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-800/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl lg:text-3xl font-semibold text-neutral-100 tracking-tight">
              Tarefas Priorizadas
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 transition-colors"
              aria-label="Fechar"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-neutral-400">
            Confiança: {Math.round((result.confidenceScore || 0) * 100)}%
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {/* Justification */}
          <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <InfoIcon className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-semibold text-neutral-200 mb-0.5">
                  Estratégia de Priorização
                </h3>
                <p className="text-xs text-neutral-300">
                  {result.justification || 'Tarefas priorizadas com base em urgência, complexidade e tempo disponível.'}
                </p>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-2">
            <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">
              Ordem sugerida (arraste para reordenar)
            </p>
            {orderedTasks.map((task, index) => (
              <div
                key={task.taskId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  bg-neutral-800/40 border border-neutral-700/50 rounded-lg p-3
                  cursor-move hover:bg-neutral-800/60 transition-all
                  ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                `}
              >
                <div className="flex items-start gap-2">
                  {/* Drag Handle */}
                  <GripVerticalIcon className="w-4 h-4 text-neutral-600 flex-shrink-0 mt-0.5" />

                  {/* Rank Badge */}
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-700/50 text-neutral-300 font-semibold text-xs flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm text-neutral-100">
                        {getTaskTitle(task.taskId)}
                      </h4>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${getPriorityColor(
                            task.priorityScore
                          )}`}
                        >
                          {getPriorityLabel(task.priorityScore)}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {task.priorityScore.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Reasoning Toggle */}
                    {task.reasoning && task.reasoning.length > 0 && (
                      <button
                        onClick={() => toggleExpanded(task.taskId)}
                        className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                      >
                        {expandedTask === task.taskId ? '▼ Ocultar' : '▶ Ver justificativa'}
                      </button>
                    )}

                    {/* Expanded Reasoning */}
                    {expandedTask === task.taskId && task.reasoning && (
                      <ul className="mt-2 space-y-0.5 text-xs text-neutral-400">
                        {task.reasoning.map((reason, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-neutral-500">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 sm:p-6 border-t border-neutral-800/50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:bg-neutral-800/60 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAccept}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-700 border border-neutral-600 text-neutral-100 hover:bg-neutral-600 hover:text-white transition-all"
          >
            <div className="flex items-center gap-1.5">
              <CheckIcon className="w-3.5 h-3.5" />
              <span>Aplicar Priorização</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrioritizationResults;
