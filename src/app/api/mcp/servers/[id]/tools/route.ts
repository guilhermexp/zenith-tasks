import { NextResponse } from 'next/server'
import { getServer } from '@/server/mcpRegistry'
import { extractClientKey, rateLimit } from '@/server/rateLimit'

export async function GET(req: Request, { params }: { params: { id: string }}) {
  const key = extractClientKey(req)
  if (!rateLimit({ key, limit: 120, windowMs: 60_000 })) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const srv = await getServer(params.id)
  if (!srv) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const headers: Record<string,string> = { Accept: 'application/json' }
  if (srv.apiKey) headers['Authorization'] = `Bearer ${srv.apiKey}`
  if (srv.headersJson) {
    try { Object.assign(headers, JSON.parse(srv.headersJson)) } catch {}
  }
  const toolsPath = srv.toolsPath && srv.toolsPath.trim().length ? srv.toolsPath : '/tools'
  const url = srv.baseUrl.replace(/\/$/, '') + toolsPath
  const res = await fetch(url, { headers, cache: 'no-store' })
  const code = res.status
  const json = await res.json().catch(()=> ({}))
  if (!res.ok) return NextResponse.json({ error: `Upstream ${code}`, upstream: json }, { status: code })
  return NextResponse.json(json)
}
