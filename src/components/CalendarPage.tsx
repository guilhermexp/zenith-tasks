'use client';

import React, { useState, useMemo } from 'react';
import { Menu } from 'lucide-react';

import type { MindFlowItem } from '../types';
import {
  ChevronLeftIcon, ChevronRightIcon, CalendarIcon,
  CheckCircleIcon, LightbulbIcon, PageIcon, BellIcon,
  DollarSignIcon, UsersIcon
} from './Icons';
import InteractiveCalendar from './ui/visualize-booking';

interface CalendarPageProps {
  items: MindFlowItem[];
  onSelectItem: (item: MindFlowItem) => void;
  onUpdateItem: (itemId: string, updates: Partial<MindFlowItem>) => void;
  onToggleSidebar?: () => void;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ items, onSelectItem, onUpdateItem, onToggleSidebar }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day' | 'interactive'>('interactive');

  // Type colors mapping - more subtle
  const typeColors = {
    'Tarefa': 'bg-zinc-700/80',
    'Ideia': 'bg-zinc-600/80',
    'Nota': 'bg-zinc-500/70',
    'Lembrete': 'bg-zinc-600/80',
    'Financeiro': 'bg-zinc-700/80',
    'Reunião': 'bg-zinc-700/80'
  };

  // Get items with due dates
  const itemsWithDates = useMemo(() => {
    return items.filter(item => item.dueDateISO || item.dueDate).map(item => {
      let date: Date;
      if (item.dueDateISO) {
        date = new Date(item.dueDateISO);
      } else if (item.dueDate) {
        // Try to parse the dueDate string
        date = new Date(item.dueDate);
      } else {
        return null;
      }
      
      return {
        ...item,
        parsedDate: isNaN(date.getTime()) ? null : date
      };
    }).filter(item => item && item.parsedDate) as (MindFlowItem & { parsedDate: Date })[];
  }, [items]);

  // Calendar navigation
  const navigateMonth = (offset: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + offset);
      return newDate;
    });
  };

  const navigateWeek = (offset: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (offset * 7));
      return newDate;
    });
  };

  const navigateDay = (offset: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + offset);
      return newDate;
    });
  };

  // Helper function to check if a date matches recurrence pattern
  const isRecurrenceMatch = (item: MindFlowItem & { parsedDate: Date }, checkDate: Date): boolean => {
    if (!item.recurrenceType || !item.parsedDate) return false;

    const startDate = item.parsedDate;
    const interval = item.recurrenceInterval || 1;

    // Don't show recurrence before the start date
    if (checkDate < startDate) return false;

    // Check if we've passed the end date
    if (item.recurrenceEndDate) {
      const endDate = new Date(item.recurrenceEndDate);
      if (checkDate > endDate) return false;
    }

    switch (item.recurrenceType) {
      case 'daily': {
        const daysDiff = Math.floor((checkDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > 0 && daysDiff % interval === 0;
      }
      case 'weekly': {
        const daysDiff = Math.floor((checkDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const weeksDiff = Math.floor(daysDiff / 7);

        // Check if it's the right week based on interval
        if (weeksDiff > 0 && weeksDiff % interval !== 0) return false;

        // Check if it's the right day of the week
        if (item.recurrenceDays && item.recurrenceDays.length > 0) {
          const dayMap: Record<string, number> = {
            'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6
          };
          const checkDayOfWeek = checkDate.getDay();
          return item.recurrenceDays.some(day => dayMap[day] === checkDayOfWeek);
        } else {
          // If no specific days, use the same day of week as the start date
          return checkDate.getDay() === startDate.getDay() && daysDiff > 0;
        }
      }
      case 'monthly': {
        const monthsDiff = (checkDate.getFullYear() - startDate.getFullYear()) * 12 +
                          (checkDate.getMonth() - startDate.getMonth());
        return monthsDiff > 0 &&
               monthsDiff % interval === 0 &&
               checkDate.getDate() === startDate.getDate();
      }
      case 'yearly': {
        const yearsDiff = checkDate.getFullYear() - startDate.getFullYear();
        return yearsDiff > 0 &&
               yearsDiff % interval === 0 &&
               checkDate.getMonth() === startDate.getMonth() &&
               checkDate.getDate() === startDate.getDate();
      }
      default:
        return false;
    }
  };

  // Get items for a specific date (including recurring items)
  const getItemsForDate = (date: Date) => {
    return itemsWithDates.filter(item => {
      if (!item.parsedDate) return false;

      // Check if it's the exact date
      const isExactDate = (
        item.parsedDate.getDate() === date.getDate() &&
        item.parsedDate.getMonth() === date.getMonth() &&
        item.parsedDate.getFullYear() === date.getFullYear()
      );

      if (isExactDate) return true;

      // Check if it matches the recurrence pattern
      return isRecurrenceMatch(item, date);
    });
  };

  // Month view
  const renderMonthView = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days = [];
    let day = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(day));
      day.setDate(day.getDate() + 1);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName) => (
          <div key={dayName} className="py-1 text-center text-xs font-medium text-zinc-500">
            {dayName}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === new Date().toDateString();
          const dayItems = getItemsForDate(day);
          
          return (
            <div
              key={index}
              className={`min-h-[90px] p-2 border border-white/10/30 cursor-pointer hover:bg-white/5/30 transition-all ${
                isCurrentMonth ? '' : 'opacity-40'
              } ${isToday ? 'ring-1 ring-zinc-600/50' : ''}`}
              onClick={() => setCurrentDate(new Date(day))}
            >
              <div className={`text-xs font-medium mb-1 ${
                isCurrentMonth ? 'text-zinc-400' : 'text-zinc-600'
              } ${isToday ? 'text-zinc-300' : ''}`}>
                {day.getDate()}
              </div>
              
              <div className="space-y-1">
                {dayItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(item);
                    }}
                    className={`text-xs px-1.5 py-0.5 rounded text-zinc-200 truncate hover:opacity-80 cursor-pointer flex items-center gap-1 ${
                      typeColors[item.type]
                    }`}
                  >
                    {item.recurrenceType && (
                      <svg className="w-2.5 h-2.5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    <span className="truncate">{item.title}</span>
                  </div>
                ))}
                
                {dayItems.length > 3 && (
                  <div className="text-xs text-zinc-600">
                    +{dayItems.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Week view
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return (
      <div className="grid grid-cols-7 gap-3">
        {days.map((day, index) => {
          const isToday = day.toDateString() === new Date().toDateString();
          const dayItems = getItemsForDate(day);
          
          return (
            <div key={index} className="space-y-2">
              <div className={`text-center p-2 rounded-md ${
                isToday ? 'bg-white/10/80 text-zinc-200 ring-1 ring-zinc-600/40' : 'text-zinc-400'
              }`}>
                <div className="text-xs font-normal opacity-70">
                  {day.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()}
                </div>
                <div className="text-base font-medium">
                  {day.getDate()}
                </div>
              </div>
              
              <div className="space-y-1">
                {dayItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className={`text-xs px-2 py-1.5 rounded text-zinc-200 cursor-pointer hover:opacity-90 transition-opacity ${
                      typeColors[item.type]
                    }`}
                  >
                    <div className="flex items-center gap-1 truncate">
                      {item.recurrenceType && (
                        <svg className="w-2.5 h-2.5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      <span className="truncate">{item.title}</span>
                    </div>
                  </div>
                ))}
                {dayItems.length > 4 && (
                  <div className="text-xs text-zinc-600 text-center">
                    +{dayItems.length - 4}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Day view
  const renderDayView = () => {
    const dayItems = getItemsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-base font-medium text-zinc-300">
            {currentDate.toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {/* All day events */}
          {dayItems.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-2">
                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className={`p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-white/10/50 bg-white/5/30`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${typeColors[item.type]}`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-200">{item.title}</span>
                          {item.recurrenceType && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-xs text-zinc-400">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              {item.recurrenceType === 'daily' && 'Diário'}
                              {item.recurrenceType === 'weekly' && 'Semanal'}
                              {item.recurrenceType === 'monthly' && 'Mensal'}
                              {item.recurrenceType === 'yearly' && 'Anual'}
                            </span>
                          )}
                        </div>
                        {item.summary && (
                          <div className="text-sm text-zinc-500 mt-1">
                            {item.summary}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dayItems.length === 0 && (
            <div className="text-center py-16 text-zinc-600">
              <p className="text-sm">Nenhum evento neste dia</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="px-4 h-12 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 -ml-1.5 rounded-md hover:bg-white/10 text-zinc-400"
            >
              <Menu size={20} />
            </button>
          )}
          <h1 className="text-base font-medium text-zinc-100">Calendário</h1>
          <div className="flex bg-white/5 rounded p-0.5">
            {(['month', 'week', 'day', 'interactive'] as const).map((viewType) => (
              <button
                key={viewType}
                onClick={() => setView(viewType)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  view === viewType
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {viewType === 'month' ? 'Mês' :
                 viewType === 'week' ? 'Sem' :
                 viewType === 'day' ? 'Dia' :
                 'Int'}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs rounded transition-colors"
          >
            Hoje
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (view === 'month') navigateMonth(-1);
                else if (view === 'week') navigateWeek(-1);
                else if (view === 'day') navigateDay(-1);
              }}
              className={`p-1 rounded hover:bg-white/10 text-zinc-400 transition-colors ${
                view === 'interactive' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={view === 'interactive'}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>

            <span className="text-sm text-zinc-200 min-w-[140px] text-center">
              {view === 'month' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              {view === 'week' && `Semana de ${currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`}
              {view === 'day' && currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              {view === 'interactive' && 'Interativo'}
            </span>

            <button
              onClick={() => {
                if (view === 'month') navigateMonth(1);
                else if (view === 'week') navigateWeek(1);
                else if (view === 'day') navigateDay(1);
              }}
              className={`p-1 rounded hover:bg-white/10 text-zinc-400 transition-colors ${
                view === 'interactive' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={view === 'interactive'}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 px-4 pt-0 overflow-auto overscroll-contain">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
        {view === 'interactive' && (
          <div className="h-full flex items-start justify-center">
            <InteractiveCalendar
              currentDate={currentDate}
              events={itemsWithDates.map((it) => ({
                dateISO: (it.dueDateISO ?? it.dueDate) as string,
                title: it.title,
                summary: it.summary,
              }))}
            />
          </div>
        )}
      </div>

    </div>
  );
};

export default CalendarPage;
