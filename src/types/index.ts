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

export interface ChatBubble {
  speaker: string;
  text: string;
  isCurrentUser: boolean;
}

export interface MeetingActionItem {
  task: string;
  responsible?: string;
  deadline?: string;
}

export interface MeetingDetails {
  summary: string;
  topics: { title: string; content: string }[];
  actionItems: MeetingActionItem[];
  participants?: string[];
  startTime?: string;
  duration?: string;
  decisions?: string[];
  nextSteps?: string[];
}

export interface MindFlowItem {
  id:string;
  title: string;
  completed: boolean;
  createdAt: string;
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
  // Campos de Reunião
  meetingDetails?: MeetingDetails;
  transcript?: ChatBubble[];
  // Campo de anotações
  notes?: string;
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
