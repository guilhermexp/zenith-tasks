import type { McpServerConfig, McpToolDesc } from './types'

function buildHeaders(cfg: McpServerConfig) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cfg.apiKey) h['Authorization'] = `Bearer ${cfg.apiKey}`
  if (cfg.headersJson) {
    try {
      Object.assign(h, JSON.parse(cfg.headersJson))
    } catch {}
  }
  return h
}

export async function listTools(cfg: McpServerConfig): Promise<McpToolDesc[]> {
  const res = await fetch(`/api/mcp/servers/${encodeURIComponent(cfg.id)}/tools`, { method: 'GET' })
  if (!res.ok) throw new Error(`List tools failed: ${res.status}`)
  const json = await res.json().catch(()=> ({}))
  if (Array.isArray(json.tools)) return json.tools
  if (Array.isArray(json)) return json as McpToolDesc[]
  return []
}

export async function callTool(cfg: McpServerConfig, name: string, args: any): Promise<any> {
  const res = await fetch(`/api/mcp/servers/${encodeURIComponent(cfg.id)}/call`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, arguments: args }) })
  if (!res.ok) throw new Error(`Tool call failed: ${res.status}`)
  const json = await res.json().catch(()=> ({}))
  return json
}

export async function listServers(): Promise<McpServerConfig[]> {
  const res = await fetch('/api/mcp/servers', { cache: 'no-store' })
  if (!res.ok) return []
  return await res.json()
}

export async function upsertServerApi(cfg: McpServerConfig) {
  const res = await fetch('/api/mcp/servers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) })
  if (!res.ok) throw new Error('save failed')
  return await res.json()
}

export async function removeServerApi(id: string) {
  const res = await fetch(`/api/mcp/servers/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('delete failed')
}
