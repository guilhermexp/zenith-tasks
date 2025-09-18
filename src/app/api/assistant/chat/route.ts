import { streamText, generateText } from 'ai'
import { getAISDKModel } from '@/server/aiProvider'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const streamQuery = url.searchParams.get('stream') === '1'
    const { message, history } = await req.json().catch(() => ({})) as any
    const text = typeof message === 'string' ? message.trim() : ''
    if (!text) return NextResponse.json({ error: 'message required' }, { status: 400 })

    let model: any
    try {
      model = await getAISDKModel()
    } catch {
      // Graceful fallback without model: return a simple helpful reply
      const polite = text.length <= 3 ? 'Olá! Como posso ajudar você hoje?' : `Entendi: "${text}". Posso ajudar criando tarefas, notas ou respondendo dúvidas. Diga como posso proceder.`
      // Respect streaming hint: client will fallback to JSON if SSE is not provided
      return NextResponse.json({ text: polite })
    }
    const sys = 'Você é um assistente útil e proativo em português do Brasil. Responda de forma clara e breve, e pergunte quando precisar de contexto.'
    const messages: any[] = []
    messages.push({ role: 'system', content: [{ type: 'text', text: sys }] })
    if (Array.isArray(history)) {
      for (const m of history.slice(-10)) {
        const role = m?.role === 'assistant' ? 'assistant' : 'user'
        const text = typeof m?.content === 'string' ? m.content : (m?.parts?.[0]?.text || '')
        if (text) messages.push({ role, content: [{ type: 'text', text }] })
      }
    }
    messages.push({ role: 'user', content: [{ type: 'text', text }] })

    // Decide streaming by Accept header or query param
    const accept = req.headers.get('accept') || ''
    const wantsStream = streamQuery || accept.includes('text/event-stream')
    if (wantsStream) {
      const result = await streamText({ model, messages })
      return result.toAIStreamResponse()
    }
    const result = await generateText({ model, messages })
    return NextResponse.json({ text: result.text })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'assistant chat error' }, { status: 500 })
  }
}
