import type { GeminiClient } from './client'
import type { MeetingDetails } from '@/types'
import { extractJson } from './parse'

export async function summarizeMeeting(api: GeminiClient, transcript: string): Promise<MeetingDetails> {
  const prompt = `Você é um assistente que recebe a transcrição integral de uma reunião e devolve um resumo estruturado em JSON.

Regras:
- Seja fiel ao conteúdo.
- Produza um parágrafo de resumo curto (3–6 frases).
- Separe 2–5 tópicos com títulos e parágrafos (bullets simples podem ser usados com \n).
- Liste de 3–7 action items (frases curtas, começando com verbo no infinitivo).
- Retorne APENAS JSON válido no formato:
{
  "summary": "texto",
  "topics": [ {"title": "...", "content": "..."} ],
  "actionItems": [ "..." ]
}

Transcrição:
"""
${transcript}
"""`

  const model = api.modelJson()
  const result = await model.generateContent(prompt)
  const aiText = result.response.text()
  const parsed = extractJson(aiText)
  return {
    summary: String(parsed?.summary || '').trim(),
    topics: Array.isArray(parsed?.topics) ? parsed.topics.map((t: any) => ({
      title: String(t?.title || '').trim(),
      content: String(t?.content || '').trim(),
    })) : [],
    actionItems: Array.isArray(parsed?.actionItems) ? parsed.actionItems.map((s: any) => String(s || '').trim()).filter(Boolean) : [],
  }
}

