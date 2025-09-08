export interface McpServerConfig {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  headersJson?: string // JSON string for extra headers
  toolsPath?: string   // default: /tools
  callPath?: string    // default: /call
}

export interface McpToolDesc {
  name: string
  description?: string
  input_schema?: unknown
}
