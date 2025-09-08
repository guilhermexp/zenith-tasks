import { NextResponse } from 'next/server'
import { getServer } from '@/server/mcpRegistry'
import { extractClientKey, rateLimit } from '@/server/rateLimit'

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const key = extractClientKey(req)
  if (!rateLimit({ key, limit: 30, windowMs: 60_000 })) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const srv = await getServer(params.id)
  if (!srv) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const { name, arguments: args } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const headers: Record<string,string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  if (srv.apiKey) headers['Authorization'] = `Bearer ${srv.apiKey}`
  if (srv.headersJson) {
    try { Object.assign(headers, JSON.parse(srv.headersJson)) } catch {}
  }
  const callPath = srv.callPath && srv.callPath.trim().length ? srv.callPath : '/call'
  const url = srv.baseUrl.replace(/\/$/, '') + callPath
  const res = await fetch(url, { method: 'POST', headers, cache: 'no-store', body: JSON.stringify({ name, arguments: args || {} }) })
  const code = res.status
  const json = await res.json().catch(()=> ({}))
  if (!res.ok) return NextResponse.json({ error: `Upstream ${code}`, upstream: json }, { status: code })
  return NextResponse.json(json)
}
