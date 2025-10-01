'use client';

import React, { useState, useRef, useEffect } from 'react';

import SiriOrb from '@/components/ui/SiriOrb';

import type { MindFlowItem, Subtask, ChatMessage, MindFlowItemType } from '../types';
import { 
  XIcon, CalendarIcon, CheckIcon, SpinnerIcon, MoreHorizontalIcon, 
  SparklesIcon, ChevronLeftIcon, TrashIcon, CheckCircleIcon, TagIcon, 
  LightbulbIcon, PageIcon, BellIcon, LinkIcon, DollarSignIcon, UsersIcon,
  ClipboardIcon
} from './Icons';

interface DetailPanelProps {
  item: MindFlowItem;
  onClose: () => void;
  onUpdateItem: (itemId: string, updates: Partial<MindFlowItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onGenerateSubtasks: (itemId: string, opts?: { force?: boolean }) => void;
  onChatWithAI: (itemId: string, message: string) => Promise<any>;
  width?: number;
  onResize?: (width: number) => void;
}

const typeIcons: Record<MindFlowItemType, React.FC<{className?: string}>> = {
  Tarefa: CheckCircleIcon,
  Ideia: LightbulbIcon,
  Nota: PageIcon,
  Lembrete: BellIcon,
  Financeiro: DollarSignIcon,
  Reunião: UsersIcon
};

const SubtaskItem: React.FC<{ 
  subtask: Subtask; 
  onToggle: () => void;
  onDelete: () => void;
}> = ({ subtask, onToggle, onDelete }) => {
  return (
    <div className="flex items-center py-2.5 group -ml-2 pl-2 rounded-lg hover:bg-neutral-900/50 transition-colors">
      <button 
        onClick={onToggle}
        className={`w-5 h-5 rounded-full border-2 ${
          subtask.completed ? 'bg-green-600 border-green-600' : 'border-neutral-700 hover:border-neutral-500'
        } transition-all flex items-center justify-center mr-3 flex-shrink-0`}
        aria-label={subtask.completed ? 'Marcar subtarefa como incompleta' : 'Marcar subtarefa como completa'}
      >
        {subtask.completed && <CheckIcon className="w-3 h-3 text-neutral-100" />}
      </button>
      <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-neutral-600' : 'text-neutral-300'}  transition-colors`}>
        {subtask.title}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/20 rounded-lg text-neutral-600 hover:text-red-400 transition-all"
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
    <form onSubmit={handleSubmit} className="flex items-center mt-2 group -ml-2 pl-2 py-1">
      <div className="w-5 h-5 rounded-full border-2 border-dashed border-neutral-700 mr-3 flex-shrink-0" />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Adicionar um passo..."
        className="w-full bg-transparent focus:outline-none text-sm text-neutral-300 placeholder:text-neutral-600"
      />
    </form>
  );
};

const NotesEditor: React.FC<{
  notes: string;
  onSave: (notes: string) => void;
}> = ({ notes, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Adjust height to content
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(localNotes);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalNotes(notes);
    setIsEditing(false);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalNotes(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  if (!isEditing) {
    return (
      <div 
        onClick={() => setIsEditing(true)}
        className="min-h-[120px] p-3 rounded-lg bg-neutral-900/40 border border-neutral-800/50 hover:border-neutral-700/50 cursor-text transition-colors"
      >
        {notes ? (
          <p className="text-sm text-neutral-300 whitespace-pre-wrap">{notes}</p>
        ) : (
          <p className="text-sm text-neutral-600 italic">Clique para adicionar anotações...</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={localNotes}
        onChange={handleTextareaChange}
        placeholder="Digite suas anotações aqui..."
        className="w-full min-h-[120px] p-3 rounded-lg bg-neutral-900/40 border border-neutral-700/50 text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 resize-none"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleCancel();
          }
        }}
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
        >
          Salvar
        </button>
      </div>
    </div>
  );
};

const PropertyRow: React.FC<{
  icon: React.FC<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}> = ({ icon: Icon, label, children }) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2 text-neutral-500">
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
    <div className="font-medium text-neutral-200">
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
  onChatWithAI,
  width,
  onResize,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(item.chatHistory || []);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLDivElement>(null);

  // Resize logic
  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onResize) return;
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

  useEffect(() => {
    if (chatContainerRef.current && chatMessages.length > 0) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    
    try {
      // Add user message to chat
      const userMessage: ChatMessage = {
        role: 'user',
        parts: [{ text: message }]
      };
      setChatMessages(prev => [...prev, userMessage]);

      // Send to AI
      const response = await onChatWithAI(item.id, message);
      
      if (response) {
        // AI response will be added through the item update
        setChatMessages(prev => [...prev, response]);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsSending(false);
    }
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
    console.log('Toggling subtask:', subtaskId);
    const updatedSubtasks = item.subtasks?.map(subtask => 
      subtask.id === subtaskId 
        ? { ...subtask, completed: !subtask.completed }
        : subtask
    );
    console.log('Updated subtasks:', updatedSubtasks);
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

  return (
    <aside
      ref={asideRef as any}
      className="relative shrink-0 w-[560px] md:w-[640px] lg:w-[720px] xl:w-[820px] max-w-[92vw] flex flex-col h-full glass-card ml-2"
      style={width ? { width } : undefined}
    >
      {/* Resize handle */}
      <div
        onMouseDown={startDrag}
        title="Arraste para redimensionar"
        className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-neutral-700/30 transition-colors"
      />
      <header className="flex items-center justify-between p-4 border-b border-neutral-800/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-neutral-800/50">
            <TypeIcon className="w-5 h-5 text-neutral-300" />
          </div>
          <span className="text-sm font-semibold text-neutral-200">{item.type}</span>
        </div>
       
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onDeleteItem(item.id)} 
            className="p-2 rounded-lg hover:bg-red-900/20 text-neutral-500 hover:text-red-400 transition-colors"
            title="Excluir item"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-800/60 text-neutral-500 hover:text-neutral-200 transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
        <div className="p-5">
          <div className="flex items-start gap-4 mb-6">
            <button 
              onClick={() => onUpdateItem(item.id, { completed: !item.completed })}
              className={`w-6 h-6 rounded-full border-2 ${
                item.completed ? 'bg-green-600 border-green-600' : 'border-neutral-600 hover:border-neutral-400'
              } transition-colors flex items-center justify-center mt-1 flex-shrink-0`}
              aria-label={item.completed ? 'Marcar como incompleto' : 'Marcar como completo'}
            >
              {item.completed && <CheckIcon className="w-4 h-4 text-neutral-100" />}
            </button>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-neutral-100 mb-1">{item.title}</h3>
              <p className="text-xs text-neutral-500">{formatRelativeTime(item.createdAt)}</p>
            </div>
          </div>
          
          {/* Properties */}
          <div className="space-y-4 pb-6 mb-6 border-b border-neutral-800/50">
            <PropertyRow icon={ClipboardIcon} label="Status">
              <span className={item.completed ? 'text-green-400' : 'text-yellow-400'}>
                {item.completed ? 'Concluído' : 'A fazer'}
              </span>
            </PropertyRow>
            
            <PropertyRow icon={CalendarIcon} label="Vencimento">
              <span>{item.dueDate || 'Sem data'}</span>
            </PropertyRow>
            
            <PropertyRow icon={TagIcon} label="Etiquetas">
              <span className="text-neutral-400">Nenhuma</span>
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
              </>
            )}
          </div>

          {/* Description */}
          {item.summary && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Descrição</h4>
              <p className="text-sm text-neutral-300">{item.summary}</p>
            </div>
          )}

          {/* Notes Section */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Anotações</h4>
            <NotesEditor 
              notes={item.notes || ''} 
              onSave={(notes) => onUpdateItem(item.id, { notes })}
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Subtarefas
              </h4>
              <span className="text-xs text-neutral-500">
                {completedSubtasks}/{totalSubtasks} concluídas
              </span>
            </div>
            
            {totalSubtasks > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center text-xs text-neutral-400 mb-1">
                    <span>Progresso</span>
                    <span>{completedSubtasks}/{totalSubtasks}</span>
                </div>
                <div className="w-full bg-neutral-900/60 rounded-full h-2 border border-neutral-800/70">
                    <div className="bg-neutral-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
            
            {item.isGeneratingSubtasks ? (
              <div className="flex items-center py-4 text-neutral-500">
                <SpinnerIcon className="w-5 h-5 animate-spin mr-3" />
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
                    className="inline-flex items-center gap-2 px-3 py-1.5 mt-4 rounded-full border border-neutral-800/70 hover:border-accent-soft hover:bg-white/5 text-neutral-200 text-sm transition-colors"
                    title="Gerar subtarefas (Shift+Clique para detalhar)"
                  >
                    <div className={`relative ${item.isGeneratingSubtasks ? 'animate-spin' : ''}`}
                      aria-hidden
                    >
                      <SiriOrb size="16px" />
                    </div>
                    <span className="font-medium">Gerar subtarefas</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Chat Messages */}
          {chatMessages.length > 0 && (
            <div className="mt-6 pt-6 border-t border-neutral-800/50">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                Conversa com IA
              </h4>
              <div ref={chatContainerRef} className="space-y-3 max-h-[50vh] overflow-y-auto">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                      msg.role === 'user' 
                        ? 'bg-neutral-800/70 text-neutral-200 border border-neutral-700/60' 
                        : 'bg-neutral-900/70 text-neutral-300 border border-neutral-800/60'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.parts[0]?.text || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </aside>
  );
};

export default DetailPanel;
