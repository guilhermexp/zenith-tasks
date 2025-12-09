'use client';

import React, { useState, useRef, useEffect } from 'react';

import {
  XIcon, CalendarIcon, CheckIcon, SpinnerIcon, MoreHorizontalIcon,
  SparklesIcon, ChevronLeftIcon, TrashIcon, CheckCircleIcon, TagIcon,
  LightbulbIcon, PageIcon, BellIcon, LinkIcon, DollarSignIcon,
  ClipboardIcon, UsersIcon, ClockIcon
} from './Icons';
import { ConflictAlertBanner } from './ai/ConflictAlertBanner';
import SiriOrb from '@/components/ui/SiriOrb';
import TipTapEditor from './TipTapEditor';
import { ensureHtml } from '@/utils/richText';

import type { MindFlowItem, Subtask, MindFlowItemType } from '../types';
import type { DetectedConflict, ConflictResolutionSuggestion } from '../types/ai-prioritization';

interface DetailPanelProps {
  item: MindFlowItem;
  onClose: () => void;
  onUpdateItem: (itemId: string, updates: Partial<MindFlowItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onGenerateSubtasks: (itemId: string, opts?: { force?: boolean }) => void;
  width?: number;
  onResize?: (width: number) => void;
  isMobile?: boolean;
}

const typeIcons: Record<MindFlowItemType, React.FC<{className?: string}>> = {
  Tarefa: CheckCircleIcon,
  Ideia: LightbulbIcon,
  Nota: PageIcon,
  Lembrete: BellIcon,
  Financeiro: DollarSignIcon,
  Reunião: UsersIcon,
};

const SubtaskItem: React.FC<{
  subtask: Subtask;
  onToggle: () => void;
  onDelete: () => void;
}> = ({ subtask, onToggle, onDelete }) => {
  return (
    <div className="flex items-center py-2 group rounded-md hover:bg-white/5 transition-colors">
      <button
        onClick={onToggle}
        className={`w-4 h-4 rounded-full border-2 ${
          subtask.completed ? 'bg-green-600 border-green-600' : 'border-zinc-600 hover:border-zinc-400'
        } transition-all flex items-center justify-center mr-3 flex-shrink-0`}
        aria-label={subtask.completed ? 'Marcar subtarefa como incompleta' : 'Marcar subtarefa como completa'}
      >
        {subtask.completed && <CheckIcon className="w-2.5 h-2.5 text-white" />}
      </button>
      <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-zinc-600' : 'text-zinc-300'} transition-colors`}>
        {subtask.title}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/20 rounded text-zinc-600 hover:text-red-400 transition-all"
      >
        <TrashIcon className="w-3 h-3" />
      </button>
    </div>
  );
};

const AddSubtaskInput: React.FC<{ onAdd: (title: string) => void }> = ({ onAdd }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center py-2">
      <div className="w-4 h-4 rounded-full border-2 border-dashed border-zinc-700 mr-3 flex-shrink-0" />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Adicionar um passo..."
        className="w-full bg-transparent focus:outline-none text-sm text-zinc-300 placeholder:text-zinc-600"
      />
    </form>
  );
};

const PropertyRow: React.FC<{
  icon: React.FC<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}> = ({ icon: Icon, label, children }) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2 text-zinc-500">
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
    <div className="font-medium text-zinc-200">
      {children}
    </div>
  </div>
);

const DetailPanel: React.FC<DetailPanelProps> = ({ 
  item, 
  onClose, 
  onUpdateItem, 
  onDeleteItem, 
  onGenerateSubtasks, 
  width,
  onResize,
  isMobile = false,
}) => {
  const asideRef = useRef<HTMLDivElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(ensureHtml(item.title));
  const [summaryDraft, setSummaryDraft] = useState(ensureHtml(item.summary || ''));
  const [conflicts, setConflicts] = useState<DetectedConflict[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  useEffect(() => {
    setTitleDraft(ensureHtml(item.title));
  }, [item.title]);

  useEffect(() => {
    setSummaryDraft(ensureHtml(item.summary || ''));
  }, [item.summary]);

  // Check for conflicts when item changes or has dueDate
  useEffect(() => {
    const checkConflicts = async () => {
      // Only check if item has due date
      if (!item.dueDate) {
        setConflicts([]);
        return;
      }

      setIsCheckingConflicts(true);
      try {
        const response = await fetch('/api/conflicts/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newItem: {
              title: item.title,
              type: item.type,
              dueDateISO: item.dueDate,
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setConflicts(result.data?.conflicts || []);
        }
      } catch (error) {
        console.error('Failed to check conflicts:', error);
      } finally {
        setIsCheckingConflicts(false);
      }
    };

    checkConflicts();
  }, [item.id, item.title, item.type, item.dueDate]);

  // Resize logic
  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onResize || isMobile) return;
    const startX = e.clientX;
    const startWidth = width || asideRef.current?.getBoundingClientRect().width || 720;
    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX; // moving left increases width
      const next = startWidth + delta;
      onResize(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleAddSubtask = (title: string) => {
    const newSubtaskObj = {
      id: Date.now().toString(),
      title: title,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    onUpdateItem(item.id, {
      subtasks: [...(item.subtasks || []), newSubtaskObj]
    });
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = item.subtasks?.map(subtask => 
      subtask.id === subtaskId 
        ? { ...subtask, completed: !subtask.completed }
        : subtask
    );
    onUpdateItem(item.id, { subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    const updatedSubtasks = item.subtasks?.filter(subtask => subtask.id !== subtaskId);
    onUpdateItem(item.id, { subtasks: updatedSubtasks });
  };
  
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 10) return "Criado agora";
    if (seconds < 60) return `Criado há ${Math.floor(seconds)}s`;
    
    const minutes = seconds / 60;
    if (minutes < 60) return `Criado há ${Math.floor(minutes)}m`;

    const hours = minutes / 60;
    if (hours < 24) return `Criado há ${Math.floor(hours)}h`;
    
    const days = hours / 24;
    return `Criado há ${Math.floor(days)}d`;
  };

  const completedSubtasks = item.subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = item.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const TypeIcon = typeIcons[item.type] || PageIcon;

  const handleDismissConflict = (conflictId: string) => {
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
  };

  const handleResolveConflict = (
    conflictId: string,
    suggestion: ConflictResolutionSuggestion
  ) => {
    // Implement conflict resolution based on suggestion action
    console.warn('Resolving conflict:', conflictId, suggestion);
    // After resolving, remove the conflict
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
    // You could also update the item based on the suggestion here
  };

  return (
    <aside
      ref={asideRef as any}
      className={`relative flex flex-col h-full bg-black ${
        isMobile
          ? "w-full max-w-full flex-1 rounded-none border border-white/10 shadow-2xl"
          : "shrink-0 w-[560px] md:w-[640px] lg:w-[720px] xl:w-[820px] max-w-[92vw] border-l border-white/10"
      }`}
      style={!isMobile && width ? { width } : undefined}
    >
      {/* Resize handle */}
      {!isMobile && onResize && (
        <div
          onMouseDown={startDrag}
          title="Arraste para redimensionar"
          className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-white/10 transition-colors"
        />
      )}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-400">{item.type}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDeleteItem(item.id)}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-500 hover:text-red-400 transition-colors"
            title="Excluir item"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Conflict Alert Banner */}
      {conflicts.length > 0 && (
        <div className="relative">
          <ConflictAlertBanner
            conflicts={conflicts}
            onDismiss={handleDismissConflict}
            onResolve={handleResolveConflict}
            position="top"
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
        <div className="p-4">
          {/* Title Section */}
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => onUpdateItem(item.id, { completed: !item.completed })}
              className={`w-5 h-5 rounded-full border-2 ${
                item.completed ? 'bg-green-600 border-green-600' : 'border-zinc-600 hover:border-zinc-400'
              } transition-colors flex items-center justify-center flex-shrink-0`}
              aria-label={item.completed ? 'Marcar como incompleto' : 'Marcar como completo'}
            >
              {item.completed && <CheckIcon className="w-3 h-3 text-white" />}
            </button>
            <div
              onClick={() => !isEditingTitle && setIsEditingTitle(true)}
              className="flex-1 cursor-text"
            >
              <TipTapEditor
                content={titleDraft}
                onChange={(content) => setTitleDraft(content)}
                onSave={() => {
                  if (titleDraft !== ensureHtml(item.title)) {
                    onUpdateItem(item.id, { title: titleDraft });
                  }
                  setIsEditingTitle(false);
                }}
                onCancel={() => {
                  setTitleDraft(ensureHtml(item.title));
                  setIsEditingTitle(false);
                }}
                onBlur={() => {
                  if (titleDraft !== ensureHtml(item.title)) {
                    onUpdateItem(item.id, { title: titleDraft });
                  }
                  setIsEditingTitle(false);
                }}
                variant="inline"
                toolbar="none"
                editable={isEditingTitle}
                autoFocus={isEditingTitle}
                completed={item.completed}
                placeholder="Título do item"
                singleLine
                className="text-base font-medium"
              />
            </div>
          </div>
          <p className="text-xs text-zinc-500 ml-8 mb-6">{formatRelativeTime(item.createdAt)}</p>

          {/* Properties */}
          <div className="space-y-3 pb-4 mb-4 border-b border-white/10">
            <PropertyRow icon={ClipboardIcon} label="Status">
              <span className={item.completed ? 'text-green-400' : 'text-yellow-400'}>
                {item.completed ? 'Concluído' : 'A fazer'}
              </span>
            </PropertyRow>
            
            <PropertyRow icon={CalendarIcon} label="Vencimento">
              <span>{item.dueDate || 'Sem data'}</span>
            </PropertyRow>
            
            <PropertyRow icon={TagIcon} label="Etiquetas">
              <span className="text-zinc-500">Nenhuma</span>
            </PropertyRow>
            
            {item.type === 'Financeiro' && (
              <>
                <PropertyRow icon={DollarSignIcon} label="Valor">
                  <span className={item.transactionType === 'Entrada' ? 'text-green-400' : 'text-red-400'}>
                    R$ {item.amount?.toFixed(2)}
                  </span>
                </PropertyRow>
                <PropertyRow icon={LinkIcon} label="Tipo">
                  <span>{item.transactionType}</span>
                </PropertyRow>
                {item.transactionType === 'Saída' && (
                  <div className="flex items-center justify-between py-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-xs text-zinc-500">Recorrente</span>
                    </div>
                    <button
                      onClick={() => onUpdateItem(item.id, { isRecurring: !item.isRecurring })}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        item.isRecurring ? 'bg-blue-500/30' : 'bg-zinc-700/50'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                          item.isRecurring ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </>
            )}

          </div>

          {/* Description */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Descrição</h4>
            <TipTapEditor
              content={ensureHtml(summaryDraft)}
              onChange={(content) => setSummaryDraft(content)}
              onBlur={() => {
                if (summaryDraft !== ensureHtml(item.summary || '')) {
                  onUpdateItem(item.id, { summary: summaryDraft });
                }
              }}
              variant="block"
              toolbar="none"
              placeholder="Adicione uma descrição..."
              minHeight="60px"
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Subtarefas
              </h4>
              <span className="text-xs text-zinc-500">
                {completedSubtasks}/{totalSubtasks} concluídas
              </span>
            </div>

            {totalSubtasks > 0 && (
              <div className="mb-3">
                <div className="w-full bg-zinc-900/60 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {item.isGeneratingSubtasks ? (
              <div className="flex items-center py-3 text-zinc-500 text-sm">
                <SpinnerIcon className="w-4 h-4 animate-spin mr-2" />
                <span>Gerando sugestões...</span>
              </div>
            ) : (
              <>
                {(item.subtasks || []).map(subtask => (
                  <SubtaskItem
                    key={subtask.id}
                    subtask={subtask}
                    onToggle={() => handleToggleSubtask(subtask.id)}
                    onDelete={() => handleDeleteSubtask(subtask.id)}
                  />
                ))}
                <AddSubtaskInput onAdd={handleAddSubtask} />

                {(!item.subtasks || item.subtasks.length === 0) && !item.isGeneratingSubtasks && (
                  <button
                    onClick={(e) => {
                      onGenerateSubtasks(item.id, { force: e.shiftKey || e.metaKey || e.ctrlKey });
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 mt-3 rounded-full border border-white/10 hover:border-zinc-600 hover:bg-white/5 text-zinc-300 text-sm transition-colors"
                    title="Gerar subtarefas (Shift+Clique para detalhar)"
                  >
                    <SiriOrb size="16px" />
                    <span>Gerar subtarefas</span>
                  </button>
                )}
              </>
            )}
          </div>

        </div>
      </div>

    </aside>
  );
};

export default DetailPanel;
