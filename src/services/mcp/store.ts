import type { McpServerConfig } from './types'

const KEY = 'mcp-servers'

export function loadServers(): McpServerConfig[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveServers(list: McpServerConfig[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function upsertServer(cfg: McpServerConfig) {
  const list = loadServers()
  const idx = list.findIndex((s) => s.id === cfg.id)
  if (idx >= 0) list[idx] = cfg
  else list.push(cfg)
  saveServers(list)
}

export function removeServer(id: string) {
  saveServers(loadServers().filter((s) => s.id !== id))
}

