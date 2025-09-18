import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { streamText, tool } from 'ai'
import { z } from 'zod'
import { getAISDKModel } from '@/server/aiProvider'
import { ItemsService } from '@/services/database/items'
import { subtasksWithAI } from '@/services/ai'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { message } = await req.json().catch(() => ({})) as any
    const text = typeof message === 'string' ? message.trim() : ''
    if (!text) return NextResponse.json({ error: 'message required' }, { status: 400 })

    let model: any
    try {
      model = await getAISDKModel()
    } catch {
      // Graceful fallback: simple helpful reply
      return NextResponse.json({ text: 'Olá! Posso criar tarefas, lembretes, notas e ajustar vencimentos. Diga o que precisa e eu resolvo.' })
    }

    // Helpers
    async function getItemWithSubtasks(id: string) {
      const { data, error } = await supabase
        .from('mind_flow_items')
        .select('*, subtasks (*)')
        .eq('id', id)
        .single()
      if (error || !data) return null
      const subs = Array.isArray(data.subtasks) ? data.subtasks.map((s: any) => ({ id: s.id, title: s.title, completed: s.completed, createdAt: s.created_at })) : []
      return {
        id: data.id,
        title: data.title as string,
        type: data.item_type as string,
        summary: data.summary as string | null,
        dueDate: data.due_date as string | null,
        dueDateISO: data.due_date_iso as string | null,
        subtasks: subs,
      }
    }

    const result = await streamText({
      model,
      messages: [
        {
          role: 'system',
          content: [{
            type: 'text',
            text: 'Você é um assistente de produtividade em português (Brasil). Responda de forma clara e breve. Quando adequado, chame ferramentas para: criar tarefas, notas, lembretes; ajustar data; concluir tarefas; gerar subtarefas. Se a instrução for apenas conversa, responda naturalmente.'
          }]
        },
        { role: 'user', content: [{ type: 'text', text }] }
      ],
      tools: {
        create_task: tool({
          description: 'Criar uma tarefa com título, resumo opcional e data opcional',
          parameters: z.object({ title: z.string(), summary: z.string().optional(), dueDateISO: z.string().optional() }),
          execute: async ({ title, summary, dueDateISO }) => {
            const item = await ItemsService.createItem(userId, {
              title,
              type: 'Tarefa',
              summary,
              completed: false,
              dueDate: dueDateISO ? new Date(dueDateISO).toLocaleDateString('pt-BR') : null as any,
              dueDateISO,
              subtasks: [],
            } as any)
            return { ok: true, id: item.id, title: item.title }
          }
        }),
        create_note: tool({
          description: 'Criar uma nota com título e resumo opcional',
          parameters: z.object({ title: z.string(), summary: z.string().optional() }),
          execute: async ({ title, summary }) => {
            const item = await ItemsService.createItem(userId, {
              title,
              type: 'Nota',
              summary,
              completed: false,
              subtasks: [],
            } as any)
            return { ok: true, id: item.id, title: item.title }
          }
        }),
        create_reminder: tool({
          description: 'Criar um lembrete com título e data opcional',
          parameters: z.object({ title: z.string(), dueDateISO: z.string().optional() }),
          execute: async ({ title, dueDateISO }) => {
            const item = await ItemsService.createItem(userId, {
              title,
              type: 'Lembrete',
              completed: false,
              dueDate: dueDateISO ? new Date(dueDateISO).toLocaleDateString('pt-BR') : null as any,
              dueDateISO,
              subtasks: [],
            } as any)
            return { ok: true, id: item.id, title: item.title }
          }
        }),
        set_due_date: tool({
          description: 'Definir ou remover data de vencimento de um item',
          parameters: z.object({ id: z.string(), dueDateISO: z.string().nullable() }),
          execute: async ({ id, dueDateISO }) => {
            await ItemsService.setDueDate(id, dueDateISO ? new Date(dueDateISO) : null)
            return { ok: true, id }
          }
        }),
        mark_done: tool({
          description: 'Marcar um item como concluído',
          parameters: z.object({ id: z.string() }),
          execute: async ({ id }) => {
            await ItemsService.updateItem(id, { completed: true })
            return { ok: true, id }
          }
        }),
        generate_subtasks: tool({
          description: 'Gerar subtarefas para um item',
          parameters: z.object({ id: z.string(), force: z.boolean().optional() }),
          execute: async ({ id, force }) => {
            const item = await getItemWithSubtasks(id)
            if (!item) return { ok: false, error: 'not found' }
            const list = await subtasksWithAI({ title: item.title, summary: item.summary || undefined, type: item.type as any }, { force: !!force })
            if (!list.length) return { ok: true, generated: 0 }
            const newSubs = list.map((title: string) => ({ id: Date.now().toString() + Math.random().toString(36).slice(2), title, completed: false, createdAt: new Date().toISOString() }))
            const updated = [...(item.subtasks || []), ...newSubs]
            await ItemsService.updateItem(id, { subtasks: updated, isGeneratingSubtasks: false })
            return { ok: true, generated: newSubs.length }
          }
        }),
        find_item: tool({
          description: 'Encontrar um item pelo título (aproximação)',
          parameters: z.object({ query: z.string() }),
          execute: async ({ query }) => {
            const { data } = await supabase
              .from('mind_flow_items')
              .select('id, title')
              .eq('user_id', userId)
              .ilike('title', `%${query}%`)
              .limit(1)
            return { id: data?.[0]?.id || null, title: data?.[0]?.title || null }
          }
        })
      },
      toolChoice: 'auto'
    })

    return result.toAIStreamResponse()
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'assistant act error' }, { status: 500 })
  }
}

