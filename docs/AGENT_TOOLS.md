# Agent Tools Reference

This assistant plans actions server‑side (AI SDK) and executes them client‑side through typed tools. Below are the supported actions and their expected arguments.

Actions (plan.commands[].action)
- create_task
  - args: { title, summary?, dueDateISO? }
  - Effect: creates an item of type Tarefa.
- create_reminder | create_event
  - args: { title, dueDateISO? }
  - Effect: creates an item of type Lembrete.
- create_note
  - args: { title, summary? }
  - Effect: creates an item of type Nota.
- create_idea
  - args: { title, summary? }
  - Effect: creates an item of type Ideia.
- create_meeting
  - args: {}
  - Effect: creates an item of type Reunião and opens it.
- set_due_date
  - args: { id, dueDateISO|null }
  - Effect: updates an item's due date.
- mark_done
  - args: { id }
  - Effect: marks an item as completed.
- generate_subtasks
  - args: { id }
  - Effect: generates and appends subtasks (server AI).
- list_agenda
  - args: { rangeDays?=1 }
  - Effect: returns a summary of upcoming items.
- find_item
  - args: { query }
  - Effect: returns an item id matching the query.
- summarize_note
  - args: { id }
  - Effect: summarizes a note via /api/assistant.
- mcp_list_tools (placeholder)
  - args: { serverId }
  - Effect: returns tools for a server (not implemented).
- mcp_call (placeholder)
  - args: { serverId, tool, arguments }
  - Effect: calls a server tool (not implemented).

Implementation mapping
- Planner: `POST /api/assistant` (AI SDK generateObject; supports `?stream=1` SSE)
- Executor: `executePlan()` in `src/services/ai/assistant.ts`
- Tools interface: `src/services/ai/tools.ts` (async‑aware)
- Client wiring: tools provided in `src/components/App.tsx`

