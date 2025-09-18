import type { AssistantPlan, AssistantCommand, Tools } from './tools'
import { extractJson } from './parse'

export function buildAssistantPrompt(message: string, nowISO: string) {
  return `Você é um orquestrador de ações para um app de produtividade. 

Contexto: hoje=${nowISO}.

Ferramentas disponíveis (NÃO execute você mesmo; apenas planeje comandos):

1. create_task(title, summary?, dueDateISO?)
2. create_reminder(title, dueDateISO?)
3. create_note(title, summary?)
4. create_idea(title, summary?)
5. create_meeting()
6. create_event(title, dueDateISO?)  // cria lembrete/evento simples
7. set_due_date(id, dueDateISO|null)
8. mark_done(id)
9. list_agenda(rangeDays?) // consulta agenda (tarefas/lembretes com dueDate)
10. find_item(query)
11. summarize_note(id)
12. generate_subtasks(id)

Regras importantes:
- Responda APENAS em JSON válido: {"commands": [...], "reply": "mensagem ao usuário"}.
- Identifique intenção do usuário (criar, consultar, editar, resumir, etc.).
- Nunca invente IDs; quando referir-se a item existente, use find_item pelo texto solicitado e retorne id no comando seguinte.
- Lembretes/Agenda devem ter dueDateISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm).
- Ideias e Notas não viram tarefas automaticamente.
- Somente gere subtarefas mediante comando explicitado (generate_subtasks).
- Mantenha os comandos objetivos; use múltiplos comandos quando necessário.

Usuário: 
"""${message}"""`
}

// Note: planAssistant (Gemini) was removed in favor of using the AI SDK in the API route.

export async function executePlan(plan: AssistantPlan, tools: Tools): Promise<string> {
  let reply = plan.reply || ''
  const outputs: string[] = []
  for (const cmd of plan.commands as AssistantCommand[]) {
    try {
      const out = await runCommand(cmd, tools)
      if (typeof out === 'string' && out.trim().length) outputs.push(out)
    } catch (e: any) {
      reply += `\nFalha ao executar ${cmd.action}: ${e?.message || e}`
    }
  }
  const body = [reply, ...outputs].filter(Boolean).join('\n\n')
  return body.trim()
}

async function runCommand(cmd: AssistantCommand, tools: Tools) {
  const a = cmd.action
  const args = cmd.args || {}
  switch (a) {
    case 'create_task':
      await tools.createItem({ title: args.title, type: 'Tarefa', summary: args.summary, dueDateISO: args.dueDateISO })
      return
    case 'create_reminder':
    case 'create_event':
      await tools.createItem({ title: args.title, type: 'Lembrete', dueDateISO: args.dueDateISO })
      return
    case 'create_note':
      await tools.createItem({ title: args.title, type: 'Nota', summary: args.summary })
      return
    case 'create_idea':
      await tools.createItem({ title: args.title, type: 'Ideia', summary: args.summary })
      return
    case 'create_meeting':
      await tools.createMeeting()
      return
    case 'set_due_date':
      await tools.setDueDate(String(args.id), args.dueDateISO ?? null)
      return
    case 'mark_done':
      await tools.updateItem(String(args.id), { completed: true })
      return
    case 'generate_subtasks':
      await tools.generateSubtasks(String(args.id), true)
      return
    case 'list_agenda': {
      if (tools.listAgenda) return await tools.listAgenda(Number(args.rangeDays) || 1)
      if (tools.listItems) {
        const now = new Date()
        const end = new Date(now.getTime() + (Number(args.rangeDays) || 1) * 86400000)
        const items = (await tools.listItems()).filter(i => i.dueDateISO && new Date(i.dueDateISO) >= now && new Date(i.dueDateISO) <= end)
        if (!items.length) return 'Agenda vazia.'
        const lines = items
          .sort((a,b)=>new Date(a.dueDateISO!).getTime()-new Date(b.dueDateISO!).getTime())
          .map(i => `• ${i.title} — ${new Date(i.dueDateISO!).toLocaleString('pt-BR')}`)
        return `Agenda:\n${lines.join('\n')}`
      }
      return
    }
    case 'find_item': {
      if (tools.findItem) return String(await tools.findItem(String(args.query)))
      if (tools.listItems) {
        const q = String(args.query || '').toLowerCase()
        const found = (await tools.listItems()).find(i => i.title.toLowerCase().includes(q))
        return found ? found.id : 'Não encontrado'
      }
      return
    }
    case 'summarize_note': {
      if (tools.summarizeNote) return await tools.summarizeNote(String(args.id))
      return
    }
    case 'mcp_list_tools': {
      if (tools.mcpListTools) return await tools.mcpListTools(String(args.serverId))
      return 'MCP não configurado.'
    }
    case 'mcp_call': {
      if (tools.mcpCall) return await tools.mcpCall(String(args.serverId), String(args.tool), args.arguments || {})
      return 'MCP não configurado.'
    }
    default:
      return
  }
}
