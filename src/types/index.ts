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
  // Meeting fields
  transcript?: {
    text: string;
    timestamp: string;
  };
  meetingDetails?: {
    date?: string;
    time?: string;
    duration?: number; // Duration in seconds
    recordedAt?: string;
    participants?: string[];
    location?: string;
    agenda?: string[];
    links?: string[];
    actionItems?: string[];
    topics?: string[];
  };
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
