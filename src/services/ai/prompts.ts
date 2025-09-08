export function buildAnalyzePrompt(text: string) {
  const todayISO = new Date().toISOString().split('T')[0]
  const tomorrowISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const afterISO = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const nextWeekISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return `
Você é um assistente de produtividade que recebe um texto livre do usuário e retorna itens estruturados.

Regras importantes:
- Sempre identifique múltiplos itens quando houver várias intenções.
- Tipos permitidos: Tarefa | Ideia | Nota | Lembrete | Financeiro | Reunião
- Datas sempre em YYYY-MM-DD. Converta natural language:
  • hoje=${todayISO} • amanhã=${tomorrowISO} • depois de amanhã=${afterISO} • semana que vem≈${nextWeekISO}
- Para Financeiro, identifique valores e defina transactionType como Entrada ou Saída.
- Subtarefas: SOMENTE quando a tarefa for claramente multi-etapas. Em tarefas simples/rotineiras (ex.: passear com cachorro, enviar um e-mail), retorne "subtasks: []".
- Responda APENAS em JSON válido (application/json) no formato abaixo.

Formato de resposta:
{
  "items": [
    {
      "title": "...",
      "type": "Tarefa|Ideia|Nota|Lembrete|Financeiro|Reunião",
      "summary": "... opcional ...",
      "dueDate": "YYYY-MM-DD" | null,
      "subtasks": [{"title":"..."}],
      "amount": 0,
      "transactionType": "Entrada"|"Saída"
    }
  ]
}

Texto do usuário:
"""
${text}
"""
`
}

export function buildSubtasksPrompt(title: string, summary?: string, type?: string, complexity: 'simple'|'medium'|'complex' = 'medium') {
  return `Você é um assistente de produtividade que decide se vale a pena criar subtarefas.

Tarefa principal: ${title}
${summary ? `Contexto: ${summary}` : ''}
${type ? `Tipo: ${type}` : ''}

Regras de bom senso:
- Se a tarefa for simples/rotineira (ex.: "passear com o cachorro", "enviar e-mail único"), NÃO crie subtarefas — retorne lista VAZIA.
- Se for média complexidade, crie no MÁXIMO 2–3 subtarefas que realmente agreguem valor (planejar, preparar material, confirmar, etc.).
- Se for projeto/complexa, crie 4–6 subtarefas claras, ordenadas e com verbos de ação.
- Evite trivialidades (ex.: “retornar para casa”, “lavar as mãos”, “pegar a chave”) e duplicações.
- Responda APENAS em JSON válido no formato {"subtasks":[{"title":"..."}]}.

Nível sugerido: ${complexity}
`
}
