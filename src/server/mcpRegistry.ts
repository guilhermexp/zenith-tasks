import type { McpServerConfig } from '@/services/mcp/types'

const KEY = 'mcp:servers'

function hasUpstash() {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
}

async function upstashGet(): Promise<McpServerConfig[] | null> {
  if (!hasUpstash()) return null
  const url = process.env.UPSTASH_REDIS_REST_URL as string
  const token = process.env.UPSTASH_REDIS_REST_TOKEN as string
  const res = await fetch(`${url}/get/${encodeURIComponent(KEY)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
  })
  const json = await res.json().catch(()=> ({})) as any
  if (json && typeof json.result === 'string') {
    try { return JSON.parse(json.result) } catch { return [] }
  }
  return []
}

async function upstashSet(data: McpServerConfig[]) {
  if (!hasUpstash()) return
  const url = process.env.UPSTASH_REDIS_REST_URL as string
  const token = process.env.UPSTASH_REDIS_REST_TOKEN as string
  await fetch(`${url}/set/${encodeURIComponent(KEY)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: JSON.stringify(data) }), cache: 'no-store'
  })
}

// In-memory fallback for dev/local
let MEM: McpServerConfig[] = []

export async function getServers(): Promise<McpServerConfig[]> {
  const fromRedis = await upstashGet()
  if (fromRedis) return fromRedis
  return MEM
}

export async function saveServers(list: McpServerConfig[]) {
  if (hasUpstash()) await upstashSet(list)
  MEM = list
}

export async function upsertServer(cfg: McpServerConfig) {
  const list = await getServers()
  const id = cfg.id || Date.now().toString()
  const idx = list.findIndex(s => s.id === id)
  const next = idx >= 0 ? list.map(s => s.id === id ? { ...cfg, id } : s) : [{ ...cfg, id }, ...list]
  await saveServers(next)
  return { ...cfg, id } as McpServerConfig
}

export async function removeServer(id: string) {
  const list = await getServers()
  await saveServers(list.filter(s => s.id !== id))
}

export async function getServer(id: string): Promise<McpServerConfig | null> {
  const list = await getServers()
  return list.find(s => s.id === id) || null
}

