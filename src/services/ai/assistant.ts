import type { AssistantPlan, AssistantCommand, Tools } from './tools'

export function buildAssistantPrompt(message: string, nowISO: string) {
  return `Você é um assistente de produtividade inteligente e proativo.

CONTEXTO ATUAL:
- Data/hora: ${nowISO}
- Sistema: Zenith Tasks (app de produtividade)

CAPACIDADES PRINCIPAIS:
✅ Criar e gerenciar tarefas, notas, ideias e lembretes
✅ Organizar agenda e prazos
✅ Analisar produtividade e gerar insights
✅ Executar múltiplas ações quando necessário
✅ Buscar e organizar informações existentes

FERRAMENTAS DISPONÍVEIS:
1. create_task(title, summary?, dueDateISO?) - Criar tarefas com prazos
2. create_reminder(title, dueDateISO?) - Criar lembretes com data/hora
3. create_note(title, summary?) - Criar notas e anotações
4. create_idea(title, summary?) - Registrar ideias e insights
5. create_meeting() - Criar nova reunião
6. create_event(title, dueDateISO?) - Criar eventos simples
7. set_due_date(id, dueDateISO|null) - Definir ou remover prazos
8. mark_done(id) - Marcar como concluído
9. list_agenda(rangeDays?) - Consultar agenda (padrão: 1 dia)
10. find_item(query) - Buscar itens por texto
11. summarize_note(id) - Resumir notas longas
12. generate_subtasks(id) - Gerar subtarefas automaticamente

DIRETRIZES DE RESPOSTA:
🎯 Seja proativo: sugira ações úteis além do solicitado
🎯 Use múltiplas ferramentas quando apropriado
🎯 Forneça feedback claro sobre ações executadas
🎯 Mantenha respostas concisas mas informativas
🎯 Sempre confirme ações importantes

FORMATO DE RESPOSTA:
Responda APENAS em JSON válido:
{
  "commands": [
    {"action": "nome_ferramenta", "args": {"param": "valor"}},
    {"action": "outra_ferramenta", "args": {...}}
  ],
  "reply": "Mensagem clara e útil para o usuário",
  "confidence": 0.9,
  "needsMoreInfo": false
}

REGRAS IMPORTANTES:
❌ NUNCA invente IDs - use find_item() primeiro
❌ NUNCA execute ações sem confirmação para itens críticos
✅ Use dueDateISO no formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
✅ Identifique claramente a intenção (criar/consultar/editar/analisar)
✅ Sugira melhorias e próximos passos quando relevante

MENSAGEM DO USUÁRIO:
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
