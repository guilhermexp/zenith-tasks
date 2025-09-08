import { NextResponse } from 'next/server'
import { getServer, removeServer } from '@/server/mcpRegistry'

export async function GET(_: Request, { params }: { params: { id: string }}) {
  const srv = await getServer(params.id)
  if (!srv) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(srv)
}

export async function DELETE(_: Request, { params }: { params: { id: string }}) {
  await removeServer(params.id)
  return NextResponse.json({ ok: true })
}

