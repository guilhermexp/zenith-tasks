export interface McpServerConfig {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  headersJson?: string // JSON string for extra headers
  toolsPath?: string   // default: /tools
  callPath?: string    // default: /call
  connectionType?: 'http' | 'websocket' | 'command'
  command?: string
  args?: string[]
  metadata?: Record<string, any>
}

export interface McpToolDesc {
  name: string
  description?: string
  input_schema?: unknown
}
