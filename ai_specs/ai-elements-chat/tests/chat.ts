import type { UIMessage } from "ai";

// Source item for code references
export interface SourceItem {
  id: string;
  title: string;
  url?: string;
  description?: string;
}

// Plan step for multi-step tasks
export interface PlanStep {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  dependencies?: string[];
}

// Reasoning step for chain-of-thought
export interface ReasoningStep {
  id: string;
  thought: string;
  conclusion?: string;
}

// Task item for actionable items
export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
}

// Tool invocation data
export interface ToolInvocationData {
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  result?: unknown;
  state: "input-streaming" | "input-available" | "output-available" | "error";
}

// Confirmation data for user approval
export interface ConfirmationData {
  id: string;
  message: string;
  approved?: boolean;
  timestamp: string;
}

// Context information
export interface ContextInfo {
  id: string;
  type: string;
  title: string;
  content: unknown;
}

// Queue item for task queues
export interface QueueItem {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
}

// Message type union
export type MessageType =
  | "code"
  | "sources"
  | "plan"
  | "reasoning"
  | "task"
  | "tool"
  | "confirmation"
  | "image"
  | "context"
  | "queue";

// Message metadata aggregating all interfaces
export interface MessageMetadata {
  type?: MessageType;
  sources?: SourceItem[];
  plan?: PlanStep[];
  reasoning?: ReasoningStep[];
  tasks?: TaskItem[];
  toolInvocations?: ToolInvocationData[];
  confirmations?: ConfirmationData[];
  contextInfo?: ContextInfo[];
  queue?: QueueItem[];
  language?: string; // for code blocks
  filename?: string; // for code blocks
  imageUrl?: string; // for images
  imageAlt?: string; // for images
}

// Enriched chat message extending AI SDK UIMessage
export interface EnrichedChatMessage extends UIMessage {
  metadata?: MessageMetadata;
}

// Export all types
export type {
  SourceItem as Source,
  PlanStep as Step,
  ReasoningStep as Thought,
  TaskItem as Task,
  ToolInvocationData as ToolCall,
  ConfirmationData as Confirmation,
  ContextInfo as Context,
  QueueItem as QueueTask,
};
