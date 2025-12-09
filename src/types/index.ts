import type { ComponentType } from 'react';

export type MindFlowItemType = 'Tarefa' | 'Ideia' | 'Nota' | 'Lembrete' | 'Financeiro' | 'Reunião';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
  groundingMetadata?: GroundingChunk[];
}

export interface MeetingDetails {
  duration?: number;
  recordedAt?: string;
  actionItems?: string[];
  topics?: string[];
  participants?: string[];
}

export interface MindFlowItem {
  id:string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string; // Added for tracking updates
  summary?: string;
  type: MindFlowItemType;
  dueDate?: string;
  dueDateISO?: string; // Adicionado para o calendário
  subtasks?: Subtask[];
  suggestions?: string[]; // para Ideias: sugestões acionáveis (não viram subtarefas automáticamente)
  isGeneratingSubtasks?: boolean;
  chatHistory?: ChatMessage[];
  // Campos financeiros
  transactionType?: 'Entrada' | 'Saída';
  amount?: number;
  isRecurring?: boolean;
  paymentMethod?: string;
  isPaid?: boolean;
  // Campo de anotações
  notes?: string;
  // Campos de recorrência
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  recurrenceInterval?: number; // Ex: a cada 2 dias, 3 semanas
  recurrenceEndDate?: string; // Data de término da recorrência
  recurrenceDays?: string[]; // Para semanal: ['mon', 'wed', 'fri']
  parentRecurrenceId?: string; // ID do item pai se for uma ocorrência gerada
  // Campos de reunião
  transcript?: {
    text: string;
    timestamp: string;
  };
  meetingDetails?: MeetingDetails;
}

export interface NavItem {
    id: string;
    label: string;
    icon?: ComponentType<{ className?: string }>;
    children?: NavItem[];
    count?: number;
    isHeader?: boolean;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  message: string;
  icon: ComponentType<{ className?: string }>;
}

// AI Task Prioritization Types
export * from './ai-prioritization';
