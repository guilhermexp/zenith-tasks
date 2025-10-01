import { generateText } from 'ai'
import { NextResponse } from 'next/server'

import { getAISDKModel } from '@/server/aiProvider'
import { extractClientKey, rateLimit } from '@/server/rateLimit'

export async function POST(req: Request) {
  try {
    const key = extractClientKey(req)
    if (!rateLimit({ key, limit: 10, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json()
    const { transcript, context } = body

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript required' }, { status: 400 })
    }

    const model = await getAISDKModel()

    const systemPrompt = `Você é um assistente especializado em resumir reuniões.
    Analise a transcrição fornecida e gere um resumo estruturado.

    Responda SEMPRE em formato JSON válido com a seguinte estrutura:
    {
      "summary": "Resumo geral da reunião em 2-3 frases",
      "topics": [
        {
          "title": "Tópico Principal 1",
          "content": "Detalhes sobre o que foi discutido neste tópico"
        }
      ],
      "participants": ["Nome1", "Nome2"],
      "startTime": "ISO timestamp",
      "duration": "duração em formato legível",
      "actionItems": [
        {
          "task": "Descrição da ação",
          "responsible": "Pessoa responsável",
          "deadline": "Prazo se mencionado"
        }
      ],
      "decisions": ["Decisão 1", "Decisão 2"],
      "nextSteps": ["Próximo passo 1", "Próximo passo 2"]
    }`

    const userPrompt = `Transcrição da reunião:
    ${transcript}

    ${context ? `Contexto adicional: ${JSON.stringify(context)}` : ''}`

    const result = await generateText({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.3
    })

    // Parse JSON response
    let summary
    try {
      summary = JSON.parse(result.text)
    } catch (e) {
      // Fallback if JSON parsing fails
      summary = {
        summary: result.text.substring(0, 500),
        topics: [{
          title: 'Discussão Geral',
          content: result.text
        }],
        participants: context?.participants || ['Participantes não identificados'],
        startTime: new Date().toISOString(),
        duration: 'Duração não especificada',
        actionItems: [],
        decisions: [],
        nextSteps: []
      }
    }

    // Ensure required fields
    summary.summary = summary.summary || 'Resumo não disponível'
    summary.topics = summary.topics || []
    summary.participants = summary.participants || []
    summary.startTime = summary.startTime || new Date().toISOString()
    summary.duration = summary.duration || 'Duração não especificada'

    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('Meeting summary error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate summary' },
      { status: 500 }
    )
  }
}