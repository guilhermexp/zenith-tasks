import type { MindFlowItem, MindFlowItemType } from '@/types'

type MaybePromise<T> = T | Promise<T>

export type ToolContext = {
  nowISO?: string
}

export type Tools = {
  createItem: (data: { title: string; type: MindFlowItemType; summary?: string; dueDateISO?: string }) => MaybePromise<MindFlowItem>
  updateItem: (id: string, updates: Partial<MindFlowItem>) => MaybePromise<void>
  listItems: () => MaybePromise<MindFlowItem[]>
  setDueDate: (id: string, iso: string | null) => MaybePromise<void>
  generateSubtasks: (id: string, force?: boolean) => MaybePromise<void>
  createMeeting: () => MaybePromise<MindFlowItem>
  listAgenda?: (rangeDays?: number) => MaybePromise<string>
  findItem?: (query: string) => MaybePromise<string | undefined>
  summarizeNote?: (id: string) => MaybePromise<string>
  // MCP
  mcpListTools?: (serverId: string) => MaybePromise<string>
  mcpCall?: (serverId: string, tool: string, args: any) => MaybePromise<string>
}

export type AssistantCommand = {
  action:
    | 'create_task'
    | 'create_reminder'
    | 'create_note'
    | 'create_idea'
    | 'create_meeting'
    | 'create_event'
    | 'set_due_date'
    | 'mark_done'
    | 'list_agenda'
    | 'find_item'
    | 'summarize_note'
    | 'generate_subtasks'
    | 'mcp_list_tools'
    | 'mcp_call'
  args?: Record<string, any>
}

export type AssistantPlan = {
  commands: AssistantCommand[]
  reply?: string
}
