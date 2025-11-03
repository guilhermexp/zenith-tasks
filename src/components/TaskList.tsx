'use client';

import React, { useState, useEffect, useRef } from 'react';

import type { MindFlowItem, MindFlowItemType } from '../types';
import {
  MoreHorizontalIcon, CalendarIcon, CheckIcon, MicIcon, CheckCircleIcon,
  LightbulbIcon, PageIcon, BellIcon, MenuIcon, ChevronLeftIcon,
  ChevronRightIcon, PlusIcon, DollarSignIcon, SpinnerIcon, TrashIcon, SearchIcon,
  ListIcon, MessageCircleIcon
} from './Icons';

interface MainContentProps {
  items: MindFlowItem[];
  title: string;
  activeItem: MindFlowItem | null;
  onAddItem: (text: string) => Promise<any>;
  onToggleItem: (id: string) => void;
  onSelectItem: (item: MindFlowItem) => void;
  onDeleteItem: (id: string) => void;
  isLoading: boolean;
  onToggleSidebar: () => void;
  onSetDueDate: (itemId: string, date: Date | null) => void;
  onClearCompleted: () => void;
  onOpenTalkMode: () => void;
  searchQuery: string;
}

const typeStyles: Record<MindFlowItemType, { icon: React.FC<{className?: string}>; color: string; bg: string }> = {
  Tarefa: { icon: CheckCircleIcon, color: 'text-neutral-300', bg: 'bg-neutral-900/40' },
  Ideia: { icon: LightbulbIcon, color: 'text-neutral-400', bg: 'bg-neutral-900/40' },
  Nota: { icon: PageIcon, color: 'text-neutral-500', bg: 'bg-neutral-900/40' },
  Lembrete: { icon: BellIcon, color: 'text-neutral-400', bg: 'bg-neutral-900/40' },
  Financeiro: { icon: DollarSignIcon, color: 'text-neutral-300', bg: 'bg-neutral-900/40' }
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
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleMonthChange = (offset: number) => {
    setDisplayDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + offset);
      return newDate;
    });
  };

  const startOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
  const endOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);
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
    position: 'fixed',
    top: `${rect.bottom + 8}px`,
    left: `${rect.left > 256 ? rect.left : 8}px`, // Adjust left position if too close to the edge
    zIndex: 50,
  } as React.CSSProperties;

  return (
    <div ref={modalRef} style={style} className="bg-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl p-4 w-64 animate-fade-in-fast text-white">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => handleMonthChange(-1)} className="p-1.5 rounded-lg hover:bg-neutral-800/60 text-neutral-400 transition-colors"><ChevronLeftIcon className="w-5 h-5" /></button>
        <span className="font-semibold text-sm text-neutral-100">
          {displayDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
        </span>
        <button onClick={() => handleMonthChange(1)} className="p-1.5 rounded-lg hover:bg-neutral-800/60 text-neutral-400 transition-colors"><ChevronRightIcon className="w-5 h-5" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d, i) => {
          const isCurrentMonth = d.getMonth() === displayDate.getMonth();
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div key={i} className="flex justify-center">
                <button
                onClick={() => onSelect(d)}
                className={`w-8 h-8 flex items-center justify-center text-sm rounded-lg transition-all
                    ${isCurrentMonth ? 'text-neutral-300 hover:bg-neutral-800/60' : 'text-neutral-600'}
                    ${isToday ? 'bg-neutral-700 text-white ring-1 ring-white/10 shadow-lg' : ''}
                `}
                >
                {d.getDate()}
                </button>
            </div>
          )
        })}
      </div>
      <div className="border-t border-neutral-700/50 mt-4 pt-3">
        <button onClick={() => onSelect(null)} className="w-full text-center text-sm text-neutral-500 hover:text-white py-2 hover:bg-neutral-800/30 rounded-lg transition-colors">
          Remover data
        </button>
      </div>
      <style jsx>{`
        @keyframes fade-in-fast {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-fast { animation: fade-in-fast 0.15s ease-out forwards; }
      `}</style>
    </div>
  );
};

const Item: React.FC<{ item: MindFlowItem; onToggle: (id: string) => void; onSelect: () => void; onDelete: (id: string) => void; isActive: boolean; onOpenDatePicker: (itemId: string, e: React.MouseEvent<HTMLButtonElement>) => void; }> = ({ item, onToggle, onSelect, onDelete, isActive, onOpenDatePicker }) => {
  const completedSubtasks = item.subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = item.subtasks?.length || 0;
  
  // Calculate days for due date display
  const getDueDateText = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    
    try {
      // Parse the date string properly (handle YYYY-MM-DD format)
      const parts = dateStr.split('-');
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
        if (absDays === 1) return 'ontem';
        return `${absDays} dias atrás`;
      }
      if (diffDays === 0) return 'hoje';
      if (diffDays === 1) return 'amanhã';
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
        if (diffMinutes === 0) return 'agora';
        return `${diffMinutes} min atrás`;
      }
      return `${diffHours}h atrás`;
    }
    if (diffDays === 1) return '1 dia atrás';
    return `${diffDays} dias atrás`;
  };

  // Check if item is overdue
  const isOverdue = (dueDate: string | undefined) => {
    if (!dueDate || item.completed) return false;
    
    try {
      const parts = dueDate.split('-');
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
      const parts = dueDate.split('-');
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
      className={`flex items-start py-3 group cursor-pointer transition-all ${isActive ? 'bg-neutral-900/20' : 'hover:bg-neutral-900/10'}`}
      onClick={onSelect}
    >
      <div className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
          className={`w-5 h-5 rounded-full border-2 ${item.completed ? 'bg-neutral-700 border-neutral-700' : 'border-neutral-700 hover:border-neutral-500'} transition-all flex items-center justify-center`}
          aria-label={item.completed ? 'Marcar como incompleta' : 'Marcar como completa'}
        >
          {item.completed && <CheckIcon className="w-3 h-3 text-neutral-400" />}
        </button>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`${item.completed ? 'line-through text-neutral-600' : 'text-neutral-100'} text-sm`}>
          {item.title}
        </p>
        <div className="flex items-center gap-3 text-xs text-neutral-600 mt-1">
          {/* Subtasks counter */}
          {totalSubtasks > 0 && (
            <span className="text-neutral-600">
              ○ {completedSubtasks}/{totalSubtasks}
            </span>
          )}
          
          {/* Due date or creation date */}
          {item.dueDate ? (
            <>
              <button 
                className={`flex items-center gap-1 hover:text-neutral-400 transition-colors ${isOverdue(item.dueDate) ? 'text-orange-500/80' : ''}`}
                onClick={(e) => { e.stopPropagation(); onOpenDatePicker(item.id, e); }}
              >
                <CalendarIcon className="w-3 h-3" />
                <span>{getDueDateText(item.dueDate)}</span>
              </button>
              {isOverdue(item.dueDate) && (
                <span className="text-xs text-orange-500/60">• {getDaysOverdue(item.dueDate)} dias atrás</span>
              )}
            </>
          ) : (
            <>
              <span className="text-neutral-600">{getCreatedAgo(item.createdAt)}</span>
              <button 
                className="flex items-center gap-1 hover:text-neutral-400 transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onOpenDatePicker(item.id, e); }}
              >
                <CalendarIcon className="w-3 h-3" />
                <span>Adicionar data</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="ml-3 flex items-center gap-1">
        {item.type === 'Ideia' && (
          <LightbulbIcon className="w-4 h-4 text-accent-soft" />
        )}
        {item.subtasks && item.subtasks.length > 0 && (
          <ListIcon className="w-4 h-4 text-neutral-600" />
        )}
        {item.chatHistory && item.chatHistory.length > 0 && (
          <MessageCircleIcon className="w-4 h-4 text-neutral-600" />
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-900/20 text-neutral-600 hover:text-red-400 transition-all"
          title="Excluir"
        >
          <TrashIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const SmartInput: React.FC<{ onAddItem: (text: string) => Promise<any>, isLoading: boolean, onOpenTalkMode: () => void }> = ({ onAddItem, isLoading, onOpenTalkMode }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !inputValue.trim()) return;
    await onAddItem(inputValue);
    setInputValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative mb-4">
       <button
          type="button"
          onClick={onOpenTalkMode}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-600 hover:text-neutral-400 transition-colors rounded-full"
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
        className="w-full bg-neutral-900/20 border border-neutral-800/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 focus:bg-neutral-900/30 transition-all disabled:opacity-50"
      />
      {inputValue.trim() && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="text-[10px] text-neutral-600 bg-neutral-800/30 px-1.5 py-0.5 rounded">⌘N</kbd>
        </div>
      )}
      {isLoading && <SpinnerIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 animate-spin" />}
    </form>
  );
};

const MainContent: React.FC<MainContentProps> = ({ items, title, onAddItem, onToggleItem, onSelectItem, onDeleteItem, activeItem, isLoading, onToggleSidebar, onSetDueDate, onClearCompleted, onOpenTalkMode, searchQuery }) => {
  const [datePickerState, setDatePickerState] = useState<{
    itemId: string | null;
    anchorEl: HTMLButtonElement | null;
  }>({ itemId: null, anchorEl: null });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const handleOpenDatePicker = (itemId: string, e: React.MouseEvent<HTMLButtonElement>) => {
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

  return (
    <main className="flex-1 h-full overflow-y-auto overscroll-contain glass-card soft-scroll transition-all duration-300">
      <div className="p-4 sm:p-6">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onToggleSidebar} className="md:hidden p-1.5 -ml-2 text-neutral-500 hover:text-neutral-300">
              <MenuIcon className="w-5 h-5" />
            </button>
            <h1 className="text-2xl lg:text-3xl font-semibold text-neutral-100 tracking-tight">{title}</h1>
          </div>
          <div className="relative hidden md:flex" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(prev => !prev)}
              className="p-2 rounded-lg bg-neutral-800/60 hover:bg-neutral-700/60 text-neutral-400 transition-colors"
            >
              <MoreHorizontalIcon className="w-5 h-5" />
            </button>
            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl overflow-hidden animate-fade-in-fast z-10">
                <div className="p-2">
                  <button
                    onClick={() => {
                      onClearCompleted();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-neutral-200 hover:bg-neutral-800/60 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4 text-neutral-400" />
                    <span>Limpar concluídas</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>
        
        <SmartInput onAddItem={onAddItem} isLoading={isLoading} onOpenTalkMode={onOpenTalkMode} />
        
        <div>
          {items.length > 0 ? (
            items.map(item => (
              <Item 
                key={item.id} 
                item={item} 
                onToggle={onToggleItem}
                onSelect={() => onSelectItem(item)}
                onDelete={onDeleteItem}
                isActive={activeItem?.id === item.id}
                onOpenDatePicker={handleOpenDatePicker}
              />
            ))
          ) : (
            <div className="text-center py-20 text-neutral-500">
              {searchQuery ? (
                <>
                  <SearchIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold text-lg">Nenhum resultado encontrado</p>
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
      <style jsx>{`
        @keyframes fade-in-fast {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-fast { animation: fade-in-fast 0.1s ease-out forwards; }
      `}</style>
    </main>
  );
};

export default MainContent;
