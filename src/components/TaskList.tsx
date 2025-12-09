"use client";

import React, { useState, useEffect, useRef } from "react";

import type { MindFlowItem, MindFlowItemType } from "../types";
import type { PrioritizationResponse } from "../types/ai-prioritization";
import {
  MoreHorizontalIcon,
  CalendarIcon,
  CheckIcon,
  MicIcon,
  CheckCircleIcon,
  LightbulbIcon,
  PageIcon,
  BellIcon,
  MenuIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  DollarSignIcon,
  SpinnerIcon,
  TrashIcon,
  SearchIcon,
  ListIcon,
  MessageCircleIcon,
  UsersIcon,
  SendIcon,
} from "./Icons";
import { AIPrioritizationButton } from "./ai/AIPrioritizationButton";
import { PrioritizationResults } from "./ai/PrioritizationResults";
import TipTapEditor from "./TipTapEditor";
import { ensureHtml } from "@/utils/richText";

interface MainContentProps {
  items: MindFlowItem[];
  title: string;
  activeItem: MindFlowItem | null;
  onAddItem: (text: string) => Promise<any>;
  onToggleItem: (id: string) => void;
  onSelectItem: (item: MindFlowItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<MindFlowItem>) => void;
  isLoading: boolean;
  onToggleSidebar: () => void;
  onSetDueDate: (itemId: string, date: Date | null) => void;
  onClearCompleted: () => void;
  onOpenTalkMode: () => void;
  searchQuery: string;
  onReorderItems?: (taskOrder: string[]) => void;
}

const typeStyles: Record<
  MindFlowItemType,
  { icon: React.FC<{ className?: string }>; color: string; bg: string }
> = {
  Tarefa: {
    icon: CheckCircleIcon,
    color: "text-zinc-300",
    bg: "bg-zinc-900/40",
  },
  Ideia: {
    icon: LightbulbIcon,
    color: "text-zinc-400",
    bg: "bg-zinc-900/40",
  },
  Nota: { icon: PageIcon, color: "text-zinc-500", bg: "bg-zinc-900/40" },
  Lembrete: {
    icon: BellIcon,
    color: "text-zinc-400",
    bg: "bg-zinc-900/40",
  },
  Financeiro: {
    icon: DollarSignIcon,
    color: "text-zinc-300",
    bg: "bg-zinc-900/40",
  },
  Reunião: {
    icon: UsersIcon,
    color: "text-zinc-300",
    bg: "bg-zinc-900/40",
  },
};

const DatePickerModal: React.FC<{
  anchorEl: HTMLElement;
  onClose: () => void;
  onSelect: (date: Date | null) => void;
}> = ({ anchorEl, onClose, onSelect }) => {
  const [displayDate, setDisplayDate] = useState(new Date());
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleMonthChange = (offset: number) => {
    setDisplayDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + offset);
      return newDate;
    });
  };

  const startOfMonth = new Date(
    displayDate.getFullYear(),
    displayDate.getMonth(),
    1,
  );
  const endOfMonth = new Date(
    displayDate.getFullYear(),
    displayDate.getMonth() + 1,
    0,
  );
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const days = [];
  let day = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }

  const rect = anchorEl.getBoundingClientRect();
  const style = {
    position: "fixed",
    top: `${rect.bottom + 8}px`,
    left: `${rect.left > 256 ? rect.left : 8}px`, // Adjust left position if too close to the edge
    zIndex: 50,
  } as React.CSSProperties;

  return (
    <div
      ref={modalRef}
      style={style}
      className="bg-zinc-900 border border-white/10 rounded-lg shadow-lg p-4 w-64 text-white"
    >
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => handleMonthChange(-1)}
          className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <span className="font-medium text-sm text-zinc-200">
          {displayDate
            .toLocaleString("pt-BR", { month: "long", year: "numeric" })
            .replace(/^\w/, (c) => c.toUpperCase())}
        </span>
        <button
          onClick={() => handleMonthChange(1)}
          className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-zinc-600 mb-2 uppercase tracking-wider">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d, i) => {
          const isCurrentMonth = d.getMonth() === displayDate.getMonth();
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div key={i} className="flex justify-center">
              <button
                onClick={() => onSelect(d)}
                className={`w-8 h-8 flex items-center justify-center text-sm rounded-md transition-colors
                    ${isCurrentMonth ? "text-zinc-200 hover:bg-white/10" : "text-zinc-600"}
                    ${isToday ? "bg-white/10 text-white font-medium" : ""}
                `}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/10 mt-4 pt-3">
        <button
          onClick={() => onSelect(null)}
          className="w-full text-center text-sm text-zinc-500 hover:text-white py-2 hover:bg-white/5 rounded-md transition-colors"
        >
          Remover data
        </button>
      </div>
    </div>
  );
};

// Inline title editor component for list items
const InlineTitleEditor: React.FC<{
  title: string;
  completed: boolean;
  onSave: (newTitle: string) => void;
}> = ({ title, completed, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(ensureHtml(title));

  // Sync with external title changes
  useEffect(() => {
    if (!isEditing) {
      setLocalTitle(ensureHtml(title));
    }
  }, [title, isEditing]);

  const handleSave = () => {
    if (localTitle.trim() && localTitle !== ensureHtml(title)) {
      onSave(localTitle);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalTitle(ensureHtml(title));
    setIsEditing(false);
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (!isEditing) {
          setIsEditing(true);
        }
      }}
      className="cursor-text"
    >
      <TipTapEditor
        content={localTitle}
        onChange={setLocalTitle}
        onSave={handleSave}
        onCancel={handleCancel}
        onBlur={handleSave}
        variant="inline"
        toolbar="none"
        completed={completed}
        editable={isEditing}
        autoFocus={isEditing}
        placeholder="Digite o título..."
        singleLine
      />
    </div>
  );
};

const Item: React.FC<{
  item: MindFlowItem;
  onToggle: (id: string) => void;
  onSelect: () => void;
  onDelete: (id: string) => void;
  isActive: boolean;
  onOpenDatePicker: (
    itemId: string,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
}> = ({
  item,
  onToggle,
  onSelect,
  onDelete,
  isActive,
  onOpenDatePicker,
  onUpdateTitle,
}) => {
  const completedSubtasks =
    item.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = item.subtasks?.length || 0;

  // Calculate days for due date display
  const getDueDateText = (dateStr: string | undefined) => {
    if (!dateStr) return "";

    try {
      // Parse the date string properly (handle YYYY-MM-DD format)
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;

      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JavaScript months are 0-based
      const day = parseInt(parts[2]);

      const date = new Date(year, month, day);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        if (absDays === 1) return "ontem";
        return `${absDays} dias atrás`;
      }
      if (diffDays === 0) return "hoje";
      if (diffDays === 1) return "amanhã";
      return `em ${diffDays} dias`;
    } catch (e) {
      return dateStr;
    }
  };

  // Calculate time since creation
  const getCreatedAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        if (diffMinutes === 0) return "agora";
        return `${diffMinutes} min atrás`;
      }
      return `${diffHours}h atrás`;
    }
    if (diffDays === 1) return "1 dia atrás";
    return `${diffDays} dias atrás`;
  };

  // Check if item is overdue
  const isOverdue = (dueDate: string | undefined) => {
    if (!dueDate || item.completed) return false;

    try {
      const parts = dueDate.split("-");
      if (parts.length !== 3) return false;

      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);

      const date = new Date(year, month, day);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      return date < now;
    } catch (e) {
      return false;
    }
  };

  // Get days overdue
  const getDaysOverdue = (dueDate: string | undefined) => {
    if (!dueDate || !isOverdue(dueDate)) return 0;

    try {
      const parts = dueDate.split("-");
      if (parts.length !== 3) return 0;

      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);

      const date = new Date(year, month, day);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      const diffTime = now.getTime() - date.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
      return 0;
    }
  };

  return (
    <div
      className={`flex items-start py-3 group cursor-pointer transition-colors ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}
      onClick={onSelect}
    >
      <div className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className={`w-5 h-5 rounded-full border-2 ${item.completed ? "bg-zinc-700 border-zinc-700" : "border-zinc-700 hover:border-zinc-500"} transition-all flex items-center justify-center`}
          aria-label={
            item.completed ? "Marcar como incompleta" : "Marcar como completa"
          }
        >
          {item.completed && <CheckIcon className="w-3 h-3 text-zinc-400" />}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <InlineTitleEditor
          title={item.title}
          completed={item.completed}
          onSave={(newTitle) => onUpdateTitle(item.id, newTitle)}
        />
        <div className="flex items-center gap-3 text-xs text-zinc-600 mt-1">
          {/* Subtasks counter */}
          {totalSubtasks > 0 && (
            <span className="text-zinc-600">
              ○ {completedSubtasks}/{totalSubtasks}
            </span>
          )}

          {/* Due date or creation date */}
          {item.dueDate ? (
            <>
              <button
                className={`flex items-center gap-1 hover:text-zinc-400 transition-colors ${isOverdue(item.dueDate) ? "text-orange-500/80" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDatePicker(item.id, e);
                }}
              >
                <CalendarIcon className="w-3 h-3" />
                <span>{getDueDateText(item.dueDate)}</span>
              </button>
              {isOverdue(item.dueDate) && (
                <span className="text-xs text-orange-500/60">
                  • {getDaysOverdue(item.dueDate)} dias atrás
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-zinc-600">
                {getCreatedAgo(item.createdAt)}
              </span>
              <button
                className="flex items-center gap-1 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDatePicker(item.id, e);
                }}
              >
                <CalendarIcon className="w-3 h-3" />
                <span>Adicionar data</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="ml-3 flex items-center gap-1">
        {item.type === "Ideia" && (
          <LightbulbIcon className="w-4 h-4 text-zinc-500" />
        )}
        {item.subtasks && item.subtasks.length > 0 && (
          <ListIcon className="w-4 h-4 text-zinc-600" />
        )}
        {item.chatHistory && item.chatHistory.length > 0 && (
          <MessageCircleIcon className="w-4 h-4 text-zinc-600" />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-900/20 text-zinc-600 hover:text-red-400 transition-all"
          title="Excluir"
        >
          <TrashIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const SmartInput: React.FC<{
  onAddItem: (text: string) => Promise<any>;
  isLoading: boolean;
  onOpenTalkMode: () => void;
}> = ({ onAddItem, isLoading, onOpenTalkMode }) => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !inputValue.trim()) return;
    await onAddItem(inputValue);
    setInputValue("");
  };

  const hasText = inputValue.trim().length > 0;
  const showSubmitButton = hasText && !isLoading;

  return (
    <form onSubmit={handleSubmit} className="relative mb-4">
      <button
        type="button"
        onClick={onOpenTalkMode}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-400 transition-colors rounded-full z-10"
        aria-label="Capturar por voz"
      >
        <MicIcon className="w-4 h-4" />
      </button>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Nova tarefa"
        disabled={isLoading}
        className={`w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors disabled:opacity-50 ${
          showSubmitButton ? "pr-12 md:pr-20" : "pr-4"
        }`}
      />
      {showSubmitButton && (
        <>
          {/* Botão de submit visível no mobile e desktop */}
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-lg md:hidden z-10"
            aria-label="Enviar"
          >
            <SendIcon className="w-4 h-4" />
          </button>
          {/* Atalho de teclado visível apenas no desktop */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2">
            <button
              type="submit"
              className="p-1.5 text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-lg z-10"
              aria-label="Enviar"
            >
              <SendIcon className="w-4 h-4" />
            </button>
            <kbd className="text-[10px] text-zinc-600 bg-zinc-800/30 px-1.5 py-0.5 rounded">
              ⌘N
            </kbd>
          </div>
        </>
      )}
      {isLoading && (
        <SpinnerIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin z-10" />
      )}
    </form>
  );
};

const MainContent: React.FC<MainContentProps> = ({
  items,
  title,
  onAddItem,
  onToggleItem,
  onSelectItem,
  onDeleteItem,
  onUpdateItem,
  activeItem,
  isLoading,
  onToggleSidebar,
  onSetDueDate,
  onClearCompleted,
  onOpenTalkMode,
  searchQuery,
  onReorderItems,
}) => {
  const [datePickerState, setDatePickerState] = useState<{
    itemId: string | null;
    anchorEl: HTMLButtonElement | null;
  }>({ itemId: null, anchorEl: null });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [prioritizationResult, setPrioritizationResult] =
    useState<PrioritizationResponse | null>(null);
  const [showPrioritizationModal, setShowPrioritizationModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenDatePicker = (
    itemId: string,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.stopPropagation();
    setDatePickerState({ itemId, anchorEl: e.currentTarget });
  };

  const handleCloseDatePicker = () => {
    setDatePickerState({ itemId: null, anchorEl: null });
  };

  const handleDateSelect = (date: Date | null) => {
    if (datePickerState.itemId) {
      onSetDueDate(datePickerState.itemId, date);
    }
    handleCloseDatePicker();
  };

  const handlePrioritizationComplete = (result: PrioritizationResponse) => {
    setPrioritizationResult(result);
    setShowPrioritizationModal(true);
  };

  const handleAcceptPrioritization = (taskOrder: string[]) => {
    if (onReorderItems) {
      onReorderItems(taskOrder);
    }
    setShowPrioritizationModal(false);
    setPrioritizationResult(null);
  };

  const handleClosePrioritizationModal = () => {
    setShowPrioritizationModal(false);
  };

  return (
    <main className="flex-1 h-full flex flex-col overflow-hidden bg-black transition-all duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 -ml-2 text-zinc-400 hover:text-white"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <h1 className="text-base font-medium text-zinc-100">
            {title}
          </h1>
        </div>
          <div className="flex items-center gap-2">
            {/* AI Prioritization Button */}
            <AIPrioritizationButton
              tasks={items}
              onPrioritizationComplete={handlePrioritizationComplete}
              className="hidden md:block"
            />
            <div className="relative hidden md:flex" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="p-1.5 rounded-md hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <MoreHorizontalIcon className="w-4 h-4" />
              </button>
              {isMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 border border-white/10 rounded-lg shadow-lg overflow-hidden z-10">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        onClearCompleted();
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md text-zinc-200 hover:bg-white/5 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 text-zinc-400" />
                      <span>Limpar concluídas</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain soft-scroll p-4">
        <SmartInput
          onAddItem={onAddItem}
          isLoading={isLoading}
          onOpenTalkMode={onOpenTalkMode}
        />

        <div>
          {items.length > 0 ? (
            items.map((item) => (
              <Item
                key={item.id}
                item={item}
                onToggle={onToggleItem}
                onSelect={() => onSelectItem(item)}
                onDelete={onDeleteItem}
                isActive={activeItem?.id === item.id}
                onOpenDatePicker={handleOpenDatePicker}
                onUpdateTitle={(id, newTitle) =>
                  onUpdateItem(id, { title: newTitle })
                }
              />
            ))
          ) : (
            <div className="text-center py-20 text-zinc-500">
              {searchQuery ? (
                <>
                  <SearchIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold text-lg">
                    Nenhum resultado encontrado
                  </p>
                  <p className="text-sm">Tente uma busca diferente.</p>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold text-lg">Tudo em ordem!</p>
                  <p className="text-sm">Capture um pensamento para começar.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {datePickerState.anchorEl && (
        <DatePickerModal
          anchorEl={datePickerState.anchorEl}
          onClose={handleCloseDatePicker}
          onSelect={handleDateSelect}
        />
      )}
      {/* Prioritization Results Modal */}
      {showPrioritizationModal && prioritizationResult && (
        <PrioritizationResults
          isOpen={showPrioritizationModal}
          onClose={handleClosePrioritizationModal}
          result={prioritizationResult}
          tasks={items}
          onAccept={handleAcceptPrioritization}
        />
      )}
    </main>
  );
};

export default MainContent;
