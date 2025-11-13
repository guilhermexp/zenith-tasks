import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { ItemsService } from '@/services/database/items'
import { z } from 'zod'

const FALLBACK_USER_ID = process.env.NODE_ENV === 'production' ? null : 'test-user'

async function resolveUserId() {
  const { userId } = await auth()
  if (userId) return userId
  return FALLBACK_USER_ID
}

export async function GET() {
  const userId = await resolveUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await ItemsService.loadItems(userId)
    return NextResponse.json({ items })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load items',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const userId = await resolveUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()

    const ItemCreateSchema = z.object({
      title: z.string().min(1),
      type: z.enum(['Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião']),
      completed: z.boolean().optional(),
      summary: z.string().optional(),
      dueDate: z.string().optional().nullable(),
      dueDateISO: z.string().optional().nullable(),
      suggestions: z.array(z.string()).optional(),
      isGeneratingSubtasks: z.boolean().optional(),
      transactionType: z.enum(['Entrada', 'Saída']).optional().nullable(),
      amount: z.number().optional().nullable(),
      isRecurring: z.boolean().optional(),
      paymentMethod: z.string().optional().nullable(),
      isPaid: z.boolean().optional(),
      chatHistory: z
        .array(
          z.object({
            role: z.enum(['user', 'model']),
            parts: z.array(z.object({ text: z.string() })),
          })
        )
        .optional(),
      meetingDetails: z
        .object({
          date: z.string().optional(),
          time: z.string().optional(),
          duration: z.number().optional(),
          recordedAt: z.string().optional(),
          participants: z.array(z.string()).optional(),
          location: z.string().optional(),
          agenda: z.array(z.string()).optional(),
          links: z.array(z.string()).optional(),
          actionItems: z.array(z.string()).optional(),
          topics: z.array(z.string()).optional(),
        })
        .optional()
        .nullable(),
      subtasks: z
        .array(
          z.object({
            title: z.string(),
            completed: z.boolean().optional(),
          })
        )
        .optional(),
    })

    const parsed = ItemCreateSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const item = await ItemsService.createItem(userId, parsed.data as any)
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create item',
      },
      { status: 500 },
    )
  }
}
