/**
 * MCP Marketplace Registry
 * Central registry of available MCP servers that users can connect to
 */

export interface MCPMarketplaceServer {
  id: string
  name: string
  description: string
  icon: string
  category: 'productivity' | 'development' | 'data' | 'ai' | 'automation' | 'communication'
  provider: string
  website?: string
  documentation?: string
  connectionType: 'http' | 'websocket' | 'command'
  authMethod: 'none' | 'api-key' | 'oauth2' | 'basic'
  authConfig?: {
    oauthUrl?: string
    tokenUrl?: string
    scopes?: string[]
    apiKeyName?: string
    apiKeyDescription?: string
  }
  defaultConfig?: {
    url?: string
    command?: string
    args?: string[]
    callPath?: string
  }
  requiredFields?: Array<{
    name: string
    label: string
    type: 'text' | 'password' | 'url' | 'select'
    placeholder?: string
    description?: string
    options?: Array<{ value: string; label: string }>
  }>
  capabilities?: string[]
  exampleTools?: Array<{
    name: string
    description: string
  }>
}

// ONLY REAL MCP SERVERS - NO MOCKS
// These servers actually exist and can be installed/used
export const marketplaceServers: MCPMarketplaceServer[] = [
  {
    id: 'filesystem',
    name: 'Local Filesystem',
    description: 'Read and write files on your local filesystem (sandboxed)',
    icon: '📁',
    category: 'development',
    provider: 'Model Context Protocol',
    website: 'https://modelcontextprotocol.io',
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    connectionType: 'command',
    authMethod: 'none',
    defaultConfig: {
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', '--sandbox', '/tmp']
    },
    requiredFields: [
      {
        name: 'sandboxPath',
        label: 'Sandbox Directory',
        type: 'text',
        placeholder: '/home/user/documents',
        description: 'Directory to allow filesystem access (will be sandboxed)'
      }
    ],
    capabilities: ['Read files', 'Write files', 'List directories', 'Create directories', 'Delete files'],
    exampleTools: [
      { name: 'read_file', description: 'Read contents of a file' },
      { name: 'write_file', description: 'Write content to a file' },
      { name: 'list_directory', description: 'List files in a directory' },
      { name: 'create_directory', description: 'Create a new directory' },
      { name: 'delete_file', description: 'Delete a file' }
    ]
  },
  {
    id: 'playwright',
    name: 'Web Browser (Playwright)',
    description: 'Control web browsers, take screenshots, and automate web interactions',
    icon: '🌐',
    category: 'automation',
    provider: 'Playwright',
    website: 'https://playwright.dev',
    documentation: 'https://github.com/microsoft/playwright',
    connectionType: 'command',
    authMethod: 'none',
    defaultConfig: {
      command: 'npx',
      args: ['@playwright/mcp-server']
    },
    capabilities: ['Navigate pages', 'Take screenshots', 'Click elements', 'Fill forms', 'Extract content'],
    exampleTools: [
      { name: 'navigate', description: 'Navigate to a URL' },
      { name: 'screenshot', description: 'Take a screenshot of the page' },
      { name: 'click', description: 'Click on an element' },
      { name: 'fill', description: 'Fill in a form field' },
      { name: 'extract_text', description: 'Extract text from the page' }
    ]
  },
  {
    id: 'sqlite',
    name: 'SQLite Database',
    description: 'Query and manage SQLite databases locally',
    icon: '🗄️',
    category: 'data',
    provider: 'Model Context Protocol',
    website: 'https://modelcontextprotocol.io',
    documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
    connectionType: 'command',
    authMethod: 'none',
    defaultConfig: {
      command: 'npx',
      args: ['@modelcontextprotocol/server-sqlite']
    },
    requiredFields: [
      {
        name: 'databasePath',
        label: 'Database File Path',
        type: 'text',
        placeholder: '/path/to/database.db',
        description: 'Path to your SQLite database file'
      }
    ],
    capabilities: ['Execute SQL queries', 'Create tables', 'Insert data', 'Update records', 'Delete records'],
    exampleTools: [
      { name: 'query', description: 'Execute a SQL query' },
      { name: 'list_tables', description: 'List all tables in the database' },
      { name: 'describe_table', description: 'Get schema of a table' },
      { name: 'insert', description: 'Insert data into a table' }
    ]
  },
  {
    id: 'memory',
    name: 'Memory Storage',
    description: 'Store and retrieve information across sessions',
    icon: '🧠',
    category: 'productivity',
    provider: 'Anthropic',
    website: 'https://anthropic.com',
    documentation: 'https://github.com/anthropic/memory-server',
    connectionType: 'command',
    authMethod: 'none',
    defaultConfig: {
      command: 'npx',
      args: ['@anthropic/server-memory']
    },
    capabilities: ['Store facts', 'Retrieve memories', 'Update information', 'Search memories'],
    exampleTools: [
      { name: 'store', description: 'Store a piece of information' },
      { name: 'retrieve', description: 'Retrieve stored information' },
      { name: 'search', description: 'Search through memories' },
      { name: 'delete', description: 'Delete a memory' }
    ]
  }
]

/**
 * Get server definition by ID
 */
export function getMarketplaceServer(id: string): MCPMarketplaceServer | undefined {
  return marketplaceServers.find(server => server.id === id)
}

/**
 * Search servers by category
 */
export function getServersByCategory(category: string): MCPMarketplaceServer[] {
  return marketplaceServers.filter(server => server.category === category)
}

/**
 * Search servers by capability
 */
export function searchServers(query: string): MCPMarketplaceServer[] {
  const lowerQuery = query.toLowerCase()
  return marketplaceServers.filter(server => 
    server.name.toLowerCase().includes(lowerQuery) ||
    server.description.toLowerCase().includes(lowerQuery) ||
    server.capabilities?.some(cap => cap.toLowerCase().includes(lowerQuery)) ||
    server.provider.toLowerCase().includes(lowerQuery)
  )
}