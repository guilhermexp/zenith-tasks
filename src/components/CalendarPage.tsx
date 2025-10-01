'use client';

import React, { useState, useMemo } from 'react';

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
}

const CalendarPage: React.FC<CalendarPageProps> = ({ items, onSelectItem, onUpdateItem }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day' | 'interactive'>('interactive');

  // Type colors mapping - more subtle
  const typeColors = {
    'Tarefa': 'bg-neutral-700/80',
    'Ideia': 'bg-neutral-600/80',
    'Nota': 'bg-neutral-500/70',
    'Lembrete': 'bg-neutral-600/80',
    'Financeiro': 'bg-neutral-700/80',
    'Reunião': 'bg-neutral-700/80'
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

  // Get items for a specific date
  const getItemsForDate = (date: Date) => {
    return itemsWithDates.filter(item => {
      if (!item.parsedDate) return false;
      return (
        item.parsedDate.getDate() === date.getDate() &&
        item.parsedDate.getMonth() === date.getMonth() &&
        item.parsedDate.getFullYear() === date.getFullYear()
      );
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
          <div key={dayName} className="p-3 text-center text-sm font-medium text-neutral-400">
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
              className={`min-h-[90px] p-2 border border-neutral-800/30 cursor-pointer hover:bg-neutral-900/30 transition-all ${
                isCurrentMonth ? '' : 'opacity-40'
              } ${isToday ? 'ring-1 ring-neutral-600/50' : ''}`}
              onClick={() => setCurrentDate(new Date(day))}
            >
              <div className={`text-xs font-medium mb-1 ${
                isCurrentMonth ? 'text-neutral-400' : 'text-neutral-600'
              } ${isToday ? 'text-neutral-300' : ''}`}>
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
                    className={`text-xs px-1.5 py-0.5 rounded text-neutral-200 truncate hover:opacity-80 cursor-pointer ${
                      typeColors[item.type]
                    }`}
                  >
                    {item.title}
                  </div>
                ))}
                
                {dayItems.length > 3 && (
                  <div className="text-xs text-neutral-600">
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
                isToday ? 'bg-neutral-800/80 text-neutral-200 ring-1 ring-neutral-600/40' : 'text-neutral-400'
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
                    className={`text-xs px-2 py-1.5 rounded text-neutral-200 cursor-pointer hover:opacity-90 transition-opacity ${
                      typeColors[item.type]
                    }`}
                  >
                    <div className="truncate">{item.title}</div>
                  </div>
                ))}
                {dayItems.length > 4 && (
                  <div className="text-xs text-neutral-600 text-center">
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
          <h3 className="text-base font-medium text-neutral-300">
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
                    className={`p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-neutral-800/50 bg-neutral-900/30`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${typeColors[item.type]}`}></div>
                      <div className="flex-1">
                        <div className="font-medium text-neutral-200">{item.title}</div>
                        {item.summary && (
                          <div className="text-sm text-neutral-500 mt-1">
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
            <div className="text-center py-16 text-neutral-600">
              <p className="text-sm">Nenhum evento neste dia</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col glass-card">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-neutral-100">Calendário</h1>
            <div className="flex bg-neutral-800/50 rounded-lg p-1">
              {(['month', 'week', 'day', 'interactive'] as const).map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    view === viewType
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {viewType === 'month' ? 'Mês' : 
                   viewType === 'week' ? 'Semana' : 
                   viewType === 'day' ? 'Dia' : 
                   'Interativo'}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-200 text-sm rounded transition-colors"
            >
              Hoje
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (view === 'month') navigateMonth(-1);
                  else if (view === 'week') navigateWeek(-1);
                  else if (view === 'day') navigateDay(-1);
                  // Interactive view doesn't use navigation
                }}
                className={`p-1.5 rounded-full hover:bg-neutral-800/50 text-neutral-400 transition-colors ${
                  view === 'interactive' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={view === 'interactive'}
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              <h2 className="text-lg font-semibold text-neutral-100 min-w-[200px] text-center">
                {view === 'month' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                {view === 'week' && `Semana de ${currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`}
                {view === 'day' && currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                {view === 'interactive' && 'Visualização Interativa'}
              </h2>
              
              <button
                onClick={() => {
                  if (view === 'month') navigateMonth(1);
                  else if (view === 'week') navigateWeek(1);
                  else if (view === 'day') navigateDay(1);
                  // Interactive view doesn't use navigation
                }}
                className={`p-1.5 rounded-full hover:bg-neutral-800/50 text-neutral-400 transition-colors ${
                  view === 'interactive' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={view === 'interactive'}
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Calendar Content */}
      <div className="flex-1 p-6 overflow-auto overscroll-contain">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
        {view === 'interactive' && (
          <div className="h-full flex items-center justify-center">
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
