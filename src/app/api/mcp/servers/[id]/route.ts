import { NextResponse } from 'next/server'
import { getServer, removeServer } from '@/server/mcpRegistry'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const srv = await getServer(id)
  if (!srv) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(srv)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await removeServer(id)
  return NextResponse.json({ ok: true })
}

