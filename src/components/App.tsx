'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import type { 
  MindFlowItem, 
  NavItem, 
  MindFlowItemType, 
  ChatMessage, 
  ChatBubble, 
  MeetingDetails 
} from '../types';
import { useSupabaseItems } from '../hooks/useSupabaseItems';

// Components
import Sidebar from './Sidebar';
import TaskList from './TaskList';
import DetailPanel from './DetailPanel';
import CalendarPage from './CalendarPage';
import UpdatesPage from './UpdatesPage';
import FinancePage from './FinancePage';
import MeetingPage from './MeetingPage';
import TalkModeModal from './TalkModeModal';
import { MorphSurface } from './ui/AiInput';
import ItemsPreviewModal from './ItemsPreviewModal';
import SettingsPage from './SettingsPage';
import MCPMarketplace from './MCPMarketplace';
import { executePlan } from '@/services/ai/assistant'
import type { Tools } from '@/services/ai/tools'
import { loadServers } from '@/services/mcp/store'

// Icons
import { 
  CheckCircleIcon, CalendarIcon, TrendingUpIcon, 
  BellIcon, UsersIcon, HomeIcon, LightbulbIcon,
  PageIcon, DollarSignIcon, SettingsIcon, SparklesIcon
} from './Icons';

const App: React.FC = () => {
  // Clerk authentication
  const { isLoaded, isSignedIn, user } = useUser();
  
  // Supabase items management
  const {
    items,
    isLoading: itemsLoading,
    error: itemsError,
    addItem: addItemToDb,
    updateItem: updateItemInDb,
    deleteItem: deleteItemFromDb,
    toggleItem: toggleItemInDb,
    clearCompleted: clearCompletedFromDb,
    setDueDate: setDueDateInDb
  } = useSupabaseItems();
  
  // Local state management
  const [activeNavItem, setActiveNavItem] = useState('caixa-entrada');
  const [activeItem, setActiveItem] = useState<MindFlowItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTalkModeOpen, setIsTalkModeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<MindFlowItem[] | null>(null);

  // Removido: IA no cliente. Todo consumo de IA é feito via API Routes server-side.

  // Items are now loaded from Supabase via useSupabaseItems hook

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.summary?.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // Get items for active nav
  const getItemsForNav = useCallback((navId: string) => {
    const baseItems = filteredItems;
    
    switch (navId) {
      case 'caixa-entrada':
        return baseItems;
      case 'tarefas':
        return baseItems.filter(item => item.type === 'Tarefa');
      case 'ideias':
        return baseItems.filter(item => item.type === 'Ideia');
      case 'notas':
        return baseItems.filter(item => item.type === 'Nota');
      case 'lembretes':
        return baseItems.filter(item => item.type === 'Lembrete');
      case 'reunioes':
        return baseItems.filter(item => item.type === 'Reunião');
      default:
        return baseItems;
    }
  }, [filteredItems]);

  const currentItems = getItemsForNav(activeNavItem);

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'main-header', label: 'MAIN', isHeader: true },
    { 
      id: 'caixa-entrada', 
      label: 'Caixa de Entrada', 
      icon: HomeIcon, 
      count: items.length 
    },
    { id: 'atualizacoes', label: 'Atualizações', icon: TrendingUpIcon },
    { id: 'calendario', label: 'Calendário', icon: CalendarIcon },
    { id: 'financas', label: 'Finanças', icon: DollarSignIcon },
    { id: 'config', label: 'Configurações', icon: SettingsIcon },
    { id: 'mcp-marketplace', label: 'MCP Marketplace', icon: SparklesIcon },
    
    { id: 'views-header', label: 'VIEWS', isHeader: true },
    { 
      id: 'tarefas', 
      label: 'Tarefas', 
      icon: CheckCircleIcon, 
      count: getItemsForNav('tarefas').length 
    },
    { 
      id: 'ideias', 
      label: 'Ideias', 
      icon: LightbulbIcon, 
      count: getItemsForNav('ideias').length 
    },
    { 
      id: 'notas', 
      label: 'Notas', 
      icon: PageIcon, 
      count: getItemsForNav('notas').length 
    },
    { 
      id: 'lembretes', 
      label: 'Lembretes', 
      icon: BellIcon, 
      count: getItemsForNav('lembretes').length 
    },
    
    { id: 'meetings-header', label: 'MEETINGS', isHeader: true },
    { 
      id: 'reunioes', 
      label: 'Reuniões', 
      icon: UsersIcon, 
      count: getItemsForNav('reunioes').length,
      children: items.filter(item => item.type === 'Reunião')
        .slice(0, 5)
        .map(item => ({
          id: `meeting-${item.id}`,
          label: item.title.substring(0, 30) + (item.title.length > 30 ? '...' : ''),
          icon: undefined
        }))
    }
  ];

  // AI Integration Functions
  const analyzeTextWithAI = async (text: string): Promise<MindFlowItem[]> => {
    const res = await fetch('/api/inbox/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Falha ao analisar texto')
    return Array.isArray(data?.items) ? data.items : []
  };

  const chatWithAI = async (itemId: string, message: string): Promise<any> => {
    const item = items.find(i => i.id === itemId);
    if (!item) return null;

    try {
      const financeInfo = item.type === 'Financeiro' ? `Valor: ${item.amount || 0}, Tipo: ${item.transactionType}` : ''
      const res = await fetch('/api/chat/for-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title, type: item.type, summary: item.summary, financeInfo, history: item.chatHistory, message })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha no chat')
      const answer = String(data?.text || '')
      
      const newMessage: ChatMessage = {
        role: 'model',
        parts: [{ text: answer }]
      };
      
      const userMessage: ChatMessage = {
        role: 'user',
        parts: [{ text: message }]
      };

      // Update item with chat history
      await updateItemInDb(itemId, {
        chatHistory: [...(item.chatHistory || []), userMessage, newMessage]
      });

      return newMessage;
    } catch (error) {
      console.error('Erro no chat com AI:', error);
      throw error;
    }
  };

  // Item Management Functions
  const addItem = async (text: string): Promise<any> => {
    if (text === "new_meeting_note") {
      // Create a new meeting note
      const newMeeting = await addItemToDb({
        title: `Reunião ${new Date().toLocaleDateString('pt-BR')}`,
        type: 'Reunião',
        completed: false,
        meetingDetails: {
          summary: '',
          topics: [],
          actionItems: []
        },
        transcript: []
      });
      
      if (newMeeting) {
        setActiveItem(newMeeting);
        setActiveNavItem('reunioes');
        return [newMeeting];
      }
      return [];
    }

    setIsLoading(true);
    try {
      const newItems = await analyzeTextWithAI(text);
      if (newItems.length > 1) {
        setPreviewItems(newItems);
        setIsPreviewOpen(true);
        return newItems;
      }
      // Add items to database
      const addedItems = [];
      for (const item of newItems) {
        const { id, createdAt, ...itemData } = item;
        const addedItem = await addItemToDb(itemData);
        if (addedItem) {
          addedItems.push(addedItem);
        }
      }
      return addedItems;
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      // Fallback: create simple note
      const fallbackItem = await addItemToDb({
        title: text.substring(0, 100),
        type: 'Nota',
        completed: false
      });
      return fallbackItem ? [fallbackItem] : [];
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = async (id: string) => {
    await toggleItemInDb(id);
  };

  const updateItem = async (itemId: string, updates: Partial<MindFlowItem>) => {
    await updateItemInDb(itemId, updates);
    // Update active item if it's the one being updated
    if (activeItem?.id === itemId) {
      setActiveItem(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteItem = async (itemId: string) => {
    await deleteItemFromDb(itemId);
    if (activeItem?.id === itemId) {
      setActiveItem(null);
    }
  };

  const setDueDate = async (itemId: string, date: Date | null) => {
    await setDueDateInDb(itemId, date);
  };

  const clearCompleted = async () => {
    await clearCompletedFromDb();
    if (activeItem?.completed) {
      setActiveItem(null);
    }
  };

  const generateSubtasks = async (itemId: string, opts?: { force?: boolean }) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Mark as generating
    await updateItemInDb(itemId, { isGeneratingSubtasks: true });

    try {
      const res = await fetch('/api/subtasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title, summary: item.summary, type: item.type, force: !!opts?.force })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha ao gerar subtarefas')
      const list: string[] = Array.isArray(data?.subtasks) ? data.subtasks : []

      if (!list.length) {
        await updateItemInDb(itemId, { isGeneratingSubtasks: false });
        if (activeItem?.id === itemId) {
          setActiveItem(prev => prev ? { ...prev, isGeneratingSubtasks: false } : null);
        }
        return;
      }

      const newSubtasks = list.map((title: string) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title,
        completed: false,
        createdAt: new Date().toISOString()
      }));

      // Atualizar os items
      await updateItemInDb(itemId, {
        isGeneratingSubtasks: false,
        subtasks: [...(item.subtasks || []), ...newSubtasks]
      });

      if (activeItem?.id === itemId) {
        setActiveItem(prev => prev ? { ...prev, isGeneratingSubtasks: false, subtasks: [...(prev.subtasks || []), ...newSubtasks] } : null);
      }
    } catch (error) {
      console.error('Erro ao gerar subtarefas com AI:', error);
      await updateItemInDb(itemId, { isGeneratingSubtasks: false });
      if (activeItem?.id === itemId) {
        setActiveItem(prev => prev ? { ...prev, isGeneratingSubtasks: false } : null);
      }
      alert('Erro ao gerar subtarefas. Tente novamente mais tarde.');
    }
  };

  // Talk Mode Functions
  const handleAudioReady = async (audioBase64: string, onProgressUpdate: () => void): Promise<any[]> => {
    try {
      // Transcrever via API server-side
      const tr = await fetch('/api/speech/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType: 'audio/webm' })
      })
      const trJson = await tr.json()
      if (!tr.ok) throw new Error(trJson?.error || 'Falha na transcrição')
      const transcription = String(trJson?.text || '')
      if (!transcription.trim()) throw new Error('Transcrição vazia')

      // Notificar que a transcrição foi concluída
      onProgressUpdate();

      // Gerar itens a partir da transcrição
      const newItems = await analyzeTextWithAI(transcription);
      if (newItems && newItems.length > 0) {
        for (const item of newItems) {
          const { id, createdAt, ...itemData } = item;
          await addItemToDb(itemData);
        }
      }
      return newItems;
    } catch (error: any) {
      console.error('Erro ao processar áudio:', error);
      const msg = error?.message || 'Não foi possível transcrever o áudio.'
      throw new Error(msg)
    }
  };

  // Meeting Functions
  const createMeetingNote = async (transcript: ChatBubble[], details: MeetingDetails): Promise<MindFlowItem> => {
    const newMeeting: MindFlowItem = {
      id: Date.now().toString(),
      title: `Reunião - ${new Date().toLocaleDateString('pt-BR')}`,
      type: 'Reunião',
      completed: false,
      createdAt: new Date().toISOString(),
      transcript,
      meetingDetails: details
    };

    const addedMeeting = await addItemToDb({
      title: newMeeting.title,
      type: newMeeting.type,
      completed: newMeeting.completed,
      transcript: newMeeting.transcript,
      meetingDetails: newMeeting.meetingDetails
    });
    return addedMeeting || newMeeting;
  };

  // Financial Functions
  const addFinancialItem = async (transactionType: 'Entrada' | 'Saída') => {
    const newItem = await addItemToDb({
      title: `${transactionType} - ${new Date().toLocaleDateString('pt-BR')}`,
      type: 'Financeiro',
      completed: false,
      transactionType,
      amount: 0,
      isPaid: false
    });

    if (newItem) {
      setActiveItem(newItem);
    }
  };

  // Get current page title
  const getCurrentPageTitle = () => {
    const specialPages = {
      'calendario': 'Calendário',
      'atualizacoes': 'Atualizações', 
      'financas': 'Finanças',
      'reunioes': 'Reuniões',
      'caixa-entrada': 'Caixa de Entrada'
    };
    
    if (specialPages[activeNavItem as keyof typeof specialPages]) {
      return specialPages[activeNavItem as keyof typeof specialPages];
    }

    const navItem = navItems.find(item => item.id === activeNavItem);
    return navItem ? navItem.label : 'Caixa de Entrada';
  };

  // Render current page content
  const renderCurrentPage = () => {
    // Check if it's a meeting detail page
    if (activeNavItem.startsWith('meeting-')) {
      return (
        <MeetingPage 
          items={items}
          onSelectItem={setActiveItem}
          onUpdateItem={updateItem}
          onCreateMeetingNote={createMeetingNote}
          onDeleteItem={deleteItem}
        />
      );
    }
    
    switch (activeNavItem) {
      case 'calendario':
        return (
          <CalendarPage 
            items={items}
            onSelectItem={setActiveItem}
            onUpdateItem={updateItem}
          />
        );
      case 'atualizacoes':
        return (
          <UpdatesPage 
            items={items}
            onSelectItem={setActiveItem}
          />
        );
      case 'financas':
        return (
          <FinancePage 
            items={items}
            onSelectItem={setActiveItem}
            onAddFinancialItem={addFinancialItem}
          />
        );
      case 'config':
        return (
          <SettingsPage />
        );
      case 'mcp-marketplace':
        return (
          <MCPMarketplace />
        );
      case 'reunioes':
        return (
          <MeetingPage 
            items={items}
            onSelectItem={setActiveItem}
            onUpdateItem={updateItem}
            onCreateMeetingNote={createMeetingNote}
            onDeleteItem={deleteItem}
          />
        );
      default:
        return (
          <TaskList
            items={currentItems}
            title={getCurrentPageTitle()}
            activeItem={activeItem}
            onAddItem={addItem}
            onToggleItem={toggleItem}
            onSelectItem={setActiveItem}
            onDeleteItem={deleteItem}
            isLoading={isLoading}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onSetDueDate={setDueDate}
            onClearCompleted={clearCompleted}
            onOpenTalkMode={() => setIsTalkModeOpen(true)}
            searchQuery={searchQuery}
          />
        );
    }
  };

  // Check authentication status
  if (!isLoaded) {
    return <div className="h-screen flex items-center justify-center bg-neutral-950 text-white">Carregando...</div>;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <SignedIn>
      <div className="h-screen overflow-hidden app-shell text-white flex gap-2 md:gap-3 p-1 md:p-2 lg:p-2">
      {/* Sidebar */}
      <Sidebar
        navItems={navItems}
        activeItem={activeNavItem}
        onSelectItem={setActiveNavItem}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenTalkMode={() => setIsTalkModeOpen(true)}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Current Page */}
        <div className="flex-1">
          {renderCurrentPage()}
        </div>
        
        {/* Detail Panel Sidebar */}
        {activeItem && !['calendario', 'atualizacoes', 'financas', 'reunioes'].includes(activeNavItem) && !activeNavItem.startsWith('meeting-') && (
          <DetailPanel
            item={items.find(i => i.id === activeItem.id) || activeItem}
            onClose={() => setActiveItem(null)}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
            onGenerateSubtasks={generateSubtasks}
            onChatWithAI={chatWithAI}
          />
        )}
      </div>

      {/* Talk Mode Modal */}
      <TalkModeModal
        isOpen={isTalkModeOpen}
        onClose={() => setIsTalkModeOpen(false)}
        onAudioReady={handleAudioReady}
      />
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
      
      {/* AI Input - CANTO INFERIOR DIREITO RESPONSIVO */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-50">
        <MorphSurface 
          onSubmit={async (message: string) => {
            // Sempre processar via API backend
            let plan: any
            try {
              const res = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
              plan = await res.json()
              if (!res.ok || !plan || !Array.isArray(plan.commands)) {
                throw new Error(plan?.error || 'assistant planning failed')
              }
            } catch {
              return 'Desculpe, não consegui processar isso agora.'
            }
            const tools: any = {
              createItem: async ({ title, type, summary, dueDateISO }: any) => {
                const item = await addItemToDb({
                  title,
                  type,
                  summary,
                  completed: false,
                  dueDate: dueDateISO ? new Date(dueDateISO).toLocaleDateString('pt-BR') : undefined,
                  dueDateISO
                });
                return item || { 
                  id: Date.now().toString(),
                  title,
                  type: type || 'Tarefa',
                  completed: false,
                  createdAt: new Date().toISOString()
                };
              },
              updateItem: async (id: any, updates: any) => await updateItemInDb(id, updates),
              listItems: () => items,
              setDueDate: async (id: any, iso: any) => await setDueDateInDb(id, iso ? new Date(iso) : null),
              generateSubtasks: async (id: any, force: any) => await generateSubtasks(id, { force }),
              createMeeting: async () => {
                const item = await addItemToDb({
                  title: `Reunião ${new Date().toLocaleDateString('pt-BR')}`,
                  type: 'Reunião',
                  completed: false,
                  meetingDetails: { summary: '', topics: [], actionItems: [] },
                  transcript: []
                });
                if (item) {
                  setActiveItem(item);
                  setActiveNavItem('reunioes');
                }
                return item || { id: '', title: '', type: 'Reunião', completed: false, createdAt: new Date().toISOString() };
              },
              listAgenda: (rangeDays = 1) => {
                const now = new Date()
                const end = new Date(now.getTime() + rangeDays * 86400000)
                const agenda = items.filter(i => i.dueDateISO && new Date(i.dueDateISO) >= now && new Date(i.dueDateISO) <= end)
                if (!agenda.length) return 'Agenda vazia.'
                const lines = agenda
                  .sort((a,b)=>new Date(a.dueDateISO!).getTime()-new Date(b.dueDateISO!).getTime())
                  .map(i => `• ${i.title} — ${new Date(i.dueDateISO!).toLocaleString('pt-BR')}`)
                return `Agenda:\n${lines.join('\n')}`
              },
              findItem: (query: string) => {
                const q = query.toLowerCase()
                const found = items.find(i => i.title.toLowerCase().includes(q))
                return found?.id
              },
              summarizeNote: async (id: string) => {
                const note = items.find(i => i.id === id)
                if (!note) return 'Nota não encontrada.'
                
                try {
                  const res = await fetch('/api/assistant', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ 
                      message: `Resuma objetivamente em 5 bullets:\n\n${note.title}\n\n${note.summary || ''}` 
                    }) 
                  })
                  const data = await res.json()
                  const text = data.response || 'Erro ao resumir nota.'
                  await updateItemInDb(id, { summary: text })
                  return text
                } catch {
                  return 'Erro ao resumir nota.'
                }
              },
              // MCP functions temporarily disabled - need implementation
              mcpListTools: async (serverId: string) => {
                return 'MCP tools listing not implemented yet.'
              },
              mcpCall: async (serverId: string, tool: string, args: any) => {
                return 'MCP call not implemented yet.'
              },
            }
            // Streaming simples: narra (somente actions reconhecidas) e executa
            async function* stream() {
              const acts = Array.isArray(plan.commands) ? plan.commands.map((c:any)=> c && typeof c==='object' && c.action ? c.action : null).filter(Boolean) as string[] : []
              if (acts.length > 0) {
                yield 'Entendi. Vou executar: ' + acts.join(', ') + '\n\n'
              }
              const response = await executePlan(plan, tools)
              if (response && response.trim().length) {
                yield response
              } else if (plan.reply) {
                yield String(plan.reply)
              }
            }
            return stream()
          }}
          placeholder="Pergunte algo ou adicione uma tarefa..."
        />
      </div>

      {/* Preview modal for multiple items */}
      {isPreviewOpen && previewItems && (
        <ItemsPreviewModal
          isOpen={isPreviewOpen}
          items={previewItems}
          onCancel={() => { setIsPreviewOpen(false); setPreviewItems(null); }}
          onConfirm={async (selected) => {
            if (selected.length) {
              for (const item of selected) {
                const { id, createdAt, ...itemData } = item;
                await addItemToDb(itemData);
              }
            }
            setIsPreviewOpen(false);
            setPreviewItems(null);
          }}
        />
      )}
    </div>
    </SignedIn>
  );
};

export default App;
