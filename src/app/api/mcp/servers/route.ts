import { NextResponse } from 'next/server'
import { getServers, upsertServer } from '@/server/mcpRegistry'

export async function GET() {
  const list = await getServers()
  return NextResponse.json(list)
}

export async function POST(req: Request) {
  const body = await req.json()
  const saved = await upsertServer(body)
  const list = await getServers()
  return NextResponse.json({ saved, list })
}

