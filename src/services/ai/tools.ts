import type { MindFlowItem, MindFlowItemType } from '@/types'

export type ToolContext = {
  nowISO?: string
}

export type Tools = {
  createItem: (data: { title: string; type: MindFlowItemType; summary?: string; dueDateISO?: string }) => MindFlowItem
  updateItem: (id: string, updates: Partial<MindFlowItem>) => void
  listItems: () => MindFlowItem[]
  setDueDate: (id: string, iso: string | null) => void
  generateSubtasks: (id: string, force?: boolean) => Promise<void>
  createMeeting: () => MindFlowItem
  listAgenda?: (rangeDays?: number) => string
  findItem?: (query: string) => string | undefined
  summarizeNote?: (id: string) => Promise<string>
  // MCP
  mcpListTools?: (serverId: string) => Promise<string>
  mcpCall?: (serverId: string, tool: string, args: any) => Promise<string>
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
