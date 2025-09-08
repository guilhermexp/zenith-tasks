import type { GeminiClient } from './client'
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

export async function planAssistant(api: GeminiClient, message: string, now = new Date()): Promise<AssistantPlan> {
  const prompt = buildAssistantPrompt(message, now.toISOString())
  const enableSearch = (process.env.GEMINI_ENABLE_SEARCH || '').toLowerCase() === 'true'
  let txt = ''
  try {
    if (enableSearch) {
      // Try model that supports Google Search Grounding
      const res = await api.modelJsonSearch().generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }]}],
        tools: [{ googleSearchRetrieval: {} }],
      })
      txt = res.response.text()
    } else {
      const res = await api.modelJson().generateContent(prompt)
      txt = res.response.text()
    }
  } catch (e: any) {
    // Fallback if search grounding not supported in current environment
    const res = await api.modelJson().generateContent(prompt)
    txt = res.response.text()
  }
  const json = extractJson(txt) || { commands: [], reply: '' }
  // Coerção e saneamento de comandos
  const valid = new Set([
    'create_task','create_reminder','create_note','create_idea','create_meeting',
    'create_event','set_due_date','mark_done','list_agenda','find_item',
    'summarize_note','generate_subtasks','mcp_list_tools','mcp_call'
  ])
  function normalizeStringToAction(s: string): AssistantCommand | null {
    const t = s.toLowerCase()
    if (t.includes('agenda') || t.includes('dia')) return { action: 'list_agenda', args: { rangeDays: 1 } }
    if (t.includes('subtarefa')) return { action: 'generate_subtasks' }
    if (t.includes('nota') && (t.includes('resum') || t.includes('sumar'))) return { action: 'summarize_note' }
    if (t.includes('reuni')) return { action: 'create_meeting' }
    return null
  }
  const raw = Array.isArray((json as any).commands) ? (json as any).commands : []
  const commands: AssistantCommand[] = []
  for (const c of raw) {
    if (c && typeof c === 'object' && typeof c.action === 'string' && valid.has(c.action)) {
      commands.push(c as AssistantCommand)
    } else if (typeof c === 'string') {
      const n = normalizeStringToAction(c)
      if (n) commands.push(n)
    }
  }
  // Heurística: se nada reconhecido mas a pergunta parece de agenda, cria comando
  if (commands.length === 0 && /agenda|dia|hoje|amanh(ã|a)/i.test(message)) {
    commands.push({ action: 'list_agenda', args: { rangeDays: 1 } })
  }
  return { commands, reply: (json as any).reply || '' }
}

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
      tools.createItem({ title: args.title, type: 'Tarefa', summary: args.summary, dueDateISO: args.dueDateISO })
      return
    case 'create_reminder':
    case 'create_event':
      tools.createItem({ title: args.title, type: 'Lembrete', dueDateISO: args.dueDateISO })
      return
    case 'create_note':
      tools.createItem({ title: args.title, type: 'Nota', summary: args.summary })
      return
    case 'create_idea':
      tools.createItem({ title: args.title, type: 'Ideia', summary: args.summary })
      return
    case 'create_meeting':
      tools.createMeeting()
      return
    case 'set_due_date':
      tools.setDueDate(String(args.id), args.dueDateISO ?? null)
      return
    case 'mark_done':
      tools.updateItem(String(args.id), { completed: true })
      return
    case 'generate_subtasks':
      await tools.generateSubtasks(String(args.id), true)
      return
    case 'list_agenda': {
      if (tools.listAgenda) return tools.listAgenda(Number(args.rangeDays) || 1)
      if (tools.listItems) {
        const now = new Date()
        const end = new Date(now.getTime() + (Number(args.rangeDays) || 1) * 86400000)
        const items = tools.listItems().filter(i => i.dueDateISO && new Date(i.dueDateISO) >= now && new Date(i.dueDateISO) <= end)
        if (!items.length) return 'Agenda vazia.'
        const lines = items
          .sort((a,b)=>new Date(a.dueDateISO!).getTime()-new Date(b.dueDateISO!).getTime())
          .map(i => `• ${i.title} — ${new Date(i.dueDateISO!).toLocaleString('pt-BR')}`)
        return `Agenda:\n${lines.join('\n')}`
      }
      return
    }
    case 'find_item': {
      if (tools.findItem) return String(tools.findItem(String(args.query)))
      if (tools.listItems) {
        const q = String(args.query || '').toLowerCase()
        const found = tools.listItems().find(i => i.title.toLowerCase().includes(q))
        return found ? found.id : 'Não encontrado'
      }
      return
    }
    case 'summarize_note': {
      if (tools.summarizeNote) return tools.summarizeNote(String(args.id))
      return
    }
    case 'mcp_list_tools': {
      if (tools.mcpListTools) return tools.mcpListTools(String(args.serverId))
      return 'MCP não configurado.'
    }
    case 'mcp_call': {
      if (tools.mcpCall) return tools.mcpCall(String(args.serverId), String(args.tool), args.arguments || {})
      return 'MCP não configurado.'
    }
    default:
      return
  }
}
