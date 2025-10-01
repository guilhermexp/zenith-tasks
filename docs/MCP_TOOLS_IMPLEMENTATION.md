# Implementação Completa de MCP e Tools no Zenith Tasks

## 📋 Índice Rápido
- [Configuração Inicial](#configuração-inicial)
- [Implementação de Tools Locais](#tools-locais)
- [Integração MCP Completa](#integração-mcp)
- [Exemplos Práticos](#exemplos-práticos)
- [Troubleshooting](#troubleshooting)

---

## 1. Configuração Inicial {#configuração-inicial}

### Instalação de Dependências

```bash
# Core do AI SDK v5
pnpm add ai@latest

# Providers de IA
pnpm add @ai-sdk/google@latest
pnpm add @ai-sdk/openai@latest
pnpm add @ai-sdk/anthropic@latest

# MCP SDK
pnpm add @modelcontextprotocol/sdk@latest

# Utilitários
pnpm add zod@latest
pnpm add @upstash/redis@latest # Para persistência

# Tipos TypeScript
pnpm add -D @types/node
```

### Estrutura de Arquivos Recomendada

```
src/
├── services/
│   └── ai/
│       ├── tools/
│       │   ├── index.ts           # Exportação central
│       │   ├── task-tools.ts      # Ferramentas de tarefas
│       │   ├── analysis-tools.ts  # Ferramentas de análise
│       │   ├── calendar-tools.ts  # Ferramentas de calendário
│       │   └── mcp-tools.ts       # Ferramentas MCP
│       ├── schemas/
│       │   ├── index.ts
│       │   ├── task-schemas.ts
│       │   └── analysis-schemas.ts
│       └── mcp/
│           ├── client.ts          # Cliente MCP
│           ├── registry.ts        # Registro de servidores
│           └── transports.ts      # Configurações de transporte
```

---

## 2. Implementação de Tools Locais {#tools-locais}

### Definição Completa de Tools com AI SDK v5

```typescript
// src/services/ai/tools/task-tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { createItem, updateItem, deleteItem, listItems } from '@/services/database/items';

export const taskTools = {
  // Criar tarefa com validação completa
  createTask: tool({
    description: 'Cria uma nova tarefa com todos os detalhes necessários',
    inputSchema: z.object({
      title: z.string().min(1).max(200).describe('Título da tarefa'),
      summary: z.string().optional().describe('Descrição detalhada'),
      type: z.enum(['Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião'])
        .default('Tarefa')
        .describe('Tipo do item'),
      dueDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/)
        .optional()
        .describe('Data de vencimento em formato ISO'),
      priority: z.enum(['low', 'medium', 'high', 'urgent'])
        .default('medium')
        .describe('Prioridade da tarefa'),
      tags: z.array(z.string()).optional().describe('Tags para categorização'),
      subtasks: z.array(z.object({
        title: z.string(),
        completed: z.boolean().default(false),
        estimatedMinutes: z.number().optional()
      })).optional().describe('Subtarefas'),
      estimatedHours: z.number()
        .min(0.25)
        .max(100)
        .optional()
        .describe('Horas estimadas para conclusão'),
      assignee: z.string().optional().describe('Responsável pela tarefa')
    }),
    outputSchema: z.object({
      success: z.boolean(),
      taskId: z.string(),
      message: z.string(),
      task: z.object({
        id: z.string(),
        title: z.string(),
        createdAt: z.string(),
        status: z.string()
      }).optional()
    }),
    execute: async (input) => {
      try {
        // Validação adicional
        if (input.dueDate && new Date(input.dueDate) < new Date()) {
          return {
            success: false,
            taskId: '',
            message: 'Data de vencimento não pode ser no passado'
          };
        }

        // Criar tarefa
        const task = await createItem({
          title: input.title,
          summary: input.summary,
          type: input.type,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          priority: input.priority,
          tags: input.tags,
          subtasks: input.subtasks,
          estimatedHours: input.estimatedHours,
          assignee: input.assignee,
          completed: false,
          createdAt: new Date().toISOString()
        });

        return {
          success: true,
          taskId: task.id,
          message: `Tarefa "${input.title}" criada com sucesso`,
          task: {
            id: task.id,
            title: task.title,
            createdAt: task.createdAt,
            status: 'pending'
          }
        };
      } catch (error) {
        console.error('Error creating task:', error);
        return {
          success: false,
          taskId: '',
          message: `Erro ao criar tarefa: ${error.message}`
        };
      }
    },
    // Callbacks para streaming (v5)
    onInputStart: ({ toolCallId }) => {
      console.log(`[createTask] Starting input for call ${toolCallId}`);
    },
    onInputDelta: ({ inputTextDelta }) => {
      // Pode ser usado para mostrar progresso em tempo real
      console.log(`[createTask] Receiving input: ${inputTextDelta}`);
    },
    onInputAvailable: ({ input }) => {
      console.log(`[createTask] Full input ready:`, input);
    }
  }),

  // Buscar tarefas com filtros avançados
  searchTasks: tool({
    description: 'Busca tarefas com filtros complexos e retorna resultados paginados',
    inputSchema: z.object({
      query: z.string().optional().describe('Texto de busca'),
      filters: z.object({
        status: z.enum(['all', 'pending', 'completed', 'overdue']).default('all'),
        priority: z.array(z.enum(['low', 'medium', 'high', 'urgent'])).optional(),
        types: z.array(z.enum(['Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião'])).optional(),
        tags: z.array(z.string()).optional(),
        dateRange: z.object({
          from: z.string().optional(),
          to: z.string().optional()
        }).optional(),
        assignee: z.string().optional()
      }).optional(),
      sort: z.object({
        field: z.enum(['createdAt', 'dueDate', 'priority', 'title']).default('createdAt'),
        order: z.enum(['asc', 'desc']).default('desc')
      }).optional(),
      pagination: z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20)
      }).optional()
    }),
    outputSchema: z.object({
      success: z.boolean(),
      count: z.number(),
      totalCount: z.number(),
      page: z.number(),
      totalPages: z.number(),
      tasks: z.array(z.object({
        id: z.string(),
        title: z.string(),
        type: z.string(),
        status: z.string(),
        priority: z.string().optional(),
        dueDate: z.string().optional(),
        tags: z.array(z.string()).optional(),
        completedAt: z.string().optional()
      }))
    }),
    execute: async ({ query, filters = {}, sort, pagination }) => {
      try {
        const allTasks = await listItems();
        let filteredTasks = [...allTasks];

        // Aplicar filtros
        if (query) {
          const searchLower = query.toLowerCase();
          filteredTasks = filteredTasks.filter(task =>
            task.title.toLowerCase().includes(searchLower) ||
            task.summary?.toLowerCase().includes(searchLower)
          );
        }

        if (filters.status !== 'all') {
          const now = new Date();
          filteredTasks = filteredTasks.filter(task => {
            if (filters.status === 'completed') return task.completed;
            if (filters.status === 'pending') return !task.completed;
            if (filters.status === 'overdue') {
              return !task.completed && task.dueDate && new Date(task.dueDate) < now;
            }
            return true;
          });
        }

        if (filters.priority?.length) {
          filteredTasks = filteredTasks.filter(task =>
            filters.priority!.includes(task.priority as any)
          );
        }

        if (filters.types?.length) {
          filteredTasks = filteredTasks.filter(task =>
            filters.types!.includes(task.type)
          );
        }

        if (filters.tags?.length) {
          filteredTasks = filteredTasks.filter(task =>
            task.tags?.some(tag => filters.tags!.includes(tag))
          );
        }

        if (filters.dateRange) {
          const { from, to } = filters.dateRange;
          if (from) {
            const fromDate = new Date(from);
            filteredTasks = filteredTasks.filter(task =>
              new Date(task.createdAt) >= fromDate
            );
          }
          if (to) {
            const toDate = new Date(to);
            filteredTasks = filteredTasks.filter(task =>
              new Date(task.createdAt) <= toDate
            );
          }
        }

        // Ordenação
        if (sort) {
          filteredTasks.sort((a, b) => {
            const field = sort.field;
            const aVal = a[field];
            const bVal = b[field];

            if (aVal === undefined) return 1;
            if (bVal === undefined) return -1;

            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sort.order === 'asc' ? comparison : -comparison;
          });
        }

        // Paginação
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

        return {
          success: true,
          count: paginatedTasks.length,
          totalCount: filteredTasks.length,
          page,
          totalPages: Math.ceil(filteredTasks.length / limit),
          tasks: paginatedTasks.map(task => ({
            id: task.id,
            title: task.title,
            type: task.type,
            status: task.completed ? 'completed' : 'pending',
            priority: task.priority,
            dueDate: task.dueDate,
            tags: task.tags,
            completedAt: task.completedAt
          }))
        };
      } catch (error) {
        console.error('Search error:', error);
        return {
          success: false,
          count: 0,
          totalCount: 0,
          page: 1,
          totalPages: 0,
          tasks: []
        };
      }
    }
  }),

  // Atualização em lote
  batchUpdateTasks: tool({
    description: 'Atualiza múltiplas tarefas de uma vez',
    inputSchema: z.object({
      taskIds: z.array(z.string()).min(1).max(100),
      updates: z.object({
        status: z.enum(['pending', 'completed']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        assignee: z.string().optional(),
        addTags: z.array(z.string()).optional(),
        removeTags: z.array(z.string()).optional(),
        dueDate: z.string().nullable().optional()
      }).describe('Atualizações a serem aplicadas')
    }),
    execute: async ({ taskIds, updates }) => {
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const taskId of taskIds) {
        try {
          const task = await getTaskById(taskId);
          if (!task) {
            results.push({ id: taskId, success: false, error: 'Not found' });
            failureCount++;
            continue;
          }

          const updatedTask = {
            ...task,
            completed: updates.status === 'completed' ? true :
                      updates.status === 'pending' ? false : task.completed,
            priority: updates.priority || task.priority,
            assignee: updates.assignee !== undefined ? updates.assignee : task.assignee,
            dueDate: updates.dueDate !== undefined ? updates.dueDate : task.dueDate,
            tags: (() => {
              let tags = [...(task.tags || [])];
              if (updates.addTags) tags = [...new Set([...tags, ...updates.addTags])];
              if (updates.removeTags) tags = tags.filter(t => !updates.removeTags!.includes(t));
              return tags;
            })()
          };

          await updateItem(taskId, updatedTask);
          results.push({ id: taskId, success: true });
          successCount++;
        } catch (error) {
          results.push({ id: taskId, success: false, error: error.message });
          failureCount++;
        }
      }

      return {
        success: failureCount === 0,
        totalProcessed: taskIds.length,
        successCount,
        failureCount,
        results
      };
    }
  })
};
```

---

## 3. Integração MCP Completa {#integração-mcp}

### Cliente MCP Avançado

```typescript
// src/services/ai/mcp/client.ts
import {
  experimental_createMCPClient as createMCPClient,
  MCPClient,
  MCPTransport,
  dynamicTool
} from 'ai';
import { z } from 'zod';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';

// Tipos
export interface MCPServerConfig {
  id: string;
  name: string;
  description?: string;
  type: 'stdio' | 'sse' | 'http';
  enabled: boolean;
  // Configurações de conexão
  connection: {
    url?: string;
    command?: string;
    args?: string[];
    apiKey?: string;
    headers?: Record<string, string>;
    sessionId?: string;
    timeout?: number;
  };
  // Configurações de ferramentas
  tools?: {
    whitelist?: string[];  // Apenas estas ferramentas
    blacklist?: string[];  // Excluir estas ferramentas
    prefix?: string;       // Prefixo para evitar conflitos
  };
  // Configurações de retry
  retry?: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
  };
}

export class MCPManager {
  private clients: Map<string, MCPClient> = new Map();
  private toolSets: Map<string, Record<string, any>> = new Map();
  private connectionStatus: Map<string, 'connected' | 'disconnected' | 'error'> = new Map();
  private serverConfigs: Map<string, MCPServerConfig> = new Map();

  constructor(private configs: MCPServerConfig[] = []) {
    for (const config of configs) {
      this.serverConfigs.set(config.id, config);
    }
  }

  // Conectar a um servidor MCP
  async connectServer(configOrId: MCPServerConfig | string): Promise<MCPClient> {
    const config = typeof configOrId === 'string'
      ? this.serverConfigs.get(configOrId)
      : configOrId;

    if (!config) {
      throw new Error(`Server configuration not found: ${configOrId}`);
    }

    if (!config.enabled) {
      throw new Error(`Server ${config.id} is disabled`);
    }

    // Se já conectado, retornar cliente existente
    if (this.clients.has(config.id)) {
      return this.clients.get(config.id)!;
    }

    try {
      console.log(`[MCP] Connecting to ${config.name} (${config.id})...`);

      const transport = await this.createTransport(config);
      const client = await createMCPClient({ transport });

      this.clients.set(config.id, client);
      this.connectionStatus.set(config.id, 'connected');

      // Carregar e processar ferramentas
      await this.loadTools(config.id, client, config.tools);

      console.log(`[MCP] Successfully connected to ${config.name}`);
      return client;
    } catch (error) {
      console.error(`[MCP] Failed to connect to ${config.name}:`, error);
      this.connectionStatus.set(config.id, 'error');
      throw error;
    }
  }

  // Criar transport baseado no tipo
  private async createTransport(config: MCPServerConfig): Promise<MCPTransport> {
    const { type, connection } = config;

    switch (type) {
      case 'stdio': {
        if (!connection.command) {
          throw new Error('Command is required for stdio transport');
        }

        return new StdioMCPTransport({
          command: connection.command,
          args: connection.args || [],
          env: process.env // Passar variáveis de ambiente
        });
      }

      case 'sse': {
        if (!connection.url) {
          throw new Error('URL is required for SSE transport');
        }

        const headers: Record<string, string> = {
          ...connection.headers
        };

        if (connection.apiKey) {
          headers['Authorization'] = `Bearer ${connection.apiKey}`;
        }

        const transport = new SSEClientTransport(
          new URL(connection.url),
          { headers }
        );

        return transport as any;
      }

      case 'http': {
        if (!connection.url) {
          throw new Error('URL is required for HTTP transport');
        }

        const transport = new StreamableHTTPClientTransport(
          new URL(connection.url),
          {
            headers: connection.headers,
            sessionId: connection.sessionId
          }
        );

        return transport as any;
      }

      default:
        throw new Error(`Unsupported transport type: ${type}`);
    }
  }

  // Carregar e processar ferramentas
  private async loadTools(
    serverId: string,
    client: MCPClient,
    toolConfig?: MCPServerConfig['tools']
  ) {
    try {
      const tools = await client.tools();
      let processedTools: Record<string, any> = {};

      for (const [toolName, tool] of Object.entries(tools)) {
        // Aplicar whitelist/blacklist
        if (toolConfig?.whitelist && !toolConfig.whitelist.includes(toolName)) {
          continue;
        }
        if (toolConfig?.blacklist && toolConfig.blacklist.includes(toolName)) {
          continue;
        }

        // Adicionar prefixo se configurado
        const finalName = toolConfig?.prefix
          ? `${toolConfig.prefix}_${toolName}`
          : `${serverId}__${toolName}`;

        // Converter para ferramenta dinâmica se necessário
        processedTools[finalName] = this.wrapTool(tool, serverId, toolName);
      }

      this.toolSets.set(serverId, processedTools);
      console.log(`[MCP] Loaded ${Object.keys(processedTools).length} tools from ${serverId}`);
    } catch (error) {
      console.error(`[MCP] Failed to load tools from ${serverId}:`, error);
      throw error;
    }
  }

  // Envolver ferramenta com logging e tratamento de erro
  private wrapTool(tool: any, serverId: string, originalName: string) {
    const originalExecute = tool.execute;

    return {
      ...tool,
      execute: async (input: any) => {
        const startTime = Date.now();
        console.log(`[MCP] Executing ${serverId}::${originalName}`, input);

        try {
          const result = await originalExecute(input);
          const duration = Date.now() - startTime;
          console.log(`[MCP] Completed ${serverId}::${originalName} in ${duration}ms`);
          return result;
        } catch (error) {
          console.error(`[MCP] Error in ${serverId}::${originalName}:`, error);
          throw error;
        }
      }
    };
  }

  // Obter todas as ferramentas disponíveis
  async getAllTools(): Promise<Record<string, any>> {
    const allTools: Record<string, any> = {};

    for (const [serverId, tools] of this.toolSets.entries()) {
      Object.assign(allTools, tools);
    }

    return allTools;
  }

  // Obter ferramentas de um servidor específico
  getServerTools(serverId: string): Record<string, any> | undefined {
    return this.toolSets.get(serverId);
  }

  // Desconectar servidor específico
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      console.log(`[MCP] Disconnecting from ${serverId}...`);
      await client.close();
      this.clients.delete(serverId);
      this.toolSets.delete(serverId);
      this.connectionStatus.set(serverId, 'disconnected');
    }
  }

  // Desconectar todos os servidores
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.clients.keys()).map(
      serverId => this.disconnectServer(serverId)
    );
    await Promise.all(promises);
  }

  // Reconectar servidor com erro
  async reconnectFailed(): Promise<void> {
    for (const [serverId, status] of this.connectionStatus.entries()) {
      if (status === 'error') {
        try {
          await this.connectServer(serverId);
        } catch (error) {
          console.error(`[MCP] Failed to reconnect ${serverId}:`, error);
        }
      }
    }
  }

  // Status de conexão
  getStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    for (const [serverId, connectionStatus] of this.connectionStatus.entries()) {
      status[serverId] = connectionStatus;
    }
    return status;
  }

  // Verificar saúde das conexões
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [serverId, client] of this.clients.entries()) {
      try {
        // Tentar obter ferramentas como teste de conexão
        await client.tools();
        health[serverId] = true;
      } catch {
        health[serverId] = false;
      }
    }

    return health;
  }
}
```

### Configuração de Servidores MCP

```typescript
// src/services/ai/mcp/registry.ts
import { MCPServerConfig } from './client';

// Servidores MCP pré-configurados
export const MCP_SERVERS: MCPServerConfig[] = [
  {
    id: 'github',
    name: 'GitHub MCP Server',
    description: 'Gerenciar repositórios, issues e pull requests',
    type: 'http',
    enabled: true,
    connection: {
      url: process.env.GITHUB_MCP_URL || 'https://api.github.com/mcp',
      apiKey: process.env.GITHUB_TOKEN,
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 30000
    },
    tools: {
      prefix: 'github',
      whitelist: [
        'create_issue',
        'list_issues',
        'create_pr',
        'list_prs',
        'search_code'
      ]
    },
    retry: {
      maxAttempts: 3,
      delay: 1000,
      backoff: 2
    }
  },

  {
    id: 'filesystem',
    name: 'Filesystem MCP Server',
    description: 'Operações seguras no sistema de arquivos',
    type: 'stdio',
    enabled: true,
    connection: {
      command: 'npx',
      args: [
        '@modelcontextprotocol/server-filesystem',
        '--allowed-paths',
        './data,./uploads,./exports'
      ]
    },
    tools: {
      prefix: 'fs',
      blacklist: ['delete_file', 'execute_command']
    }
  },

  {
    id: 'slack',
    name: 'Slack MCP Server',
    description: 'Enviar mensagens e interagir com workspaces',
    type: 'sse',
    enabled: !!process.env.SLACK_TOKEN,
    connection: {
      url: process.env.SLACK_MCP_URL || 'https://slack.com/api/mcp/sse',
      apiKey: process.env.SLACK_TOKEN,
      headers: {
        'X-Slack-User': process.env.SLACK_USER_ID
      }
    },
    tools: {
      prefix: 'slack'
    }
  },

  {
    id: 'database',
    name: 'Database MCP Server',
    description: 'Consultas SQL seguras',
    type: 'stdio',
    enabled: true,
    connection: {
      command: 'node',
      args: ['./scripts/database-mcp-server.js'],
      env: {
        DATABASE_URL: process.env.DATABASE_URL
      }
    },
    tools: {
      prefix: 'db',
      whitelist: ['query', 'explain', 'analyze']
    }
  },

  {
    id: 'weather',
    name: 'Weather MCP Server',
    description: 'Obter informações meteorológicas',
    type: 'http',
    enabled: true,
    connection: {
      url: 'https://api.weather.com/mcp',
      apiKey: process.env.WEATHER_API_KEY
    },
    tools: {
      prefix: 'weather'
    }
  },

  {
    id: 'calendar',
    name: 'Calendar MCP Server',
    description: 'Gerenciar eventos e compromissos',
    type: 'http',
    enabled: !!process.env.GOOGLE_CALENDAR_CREDENTIALS,
    connection: {
      url: 'https://calendar.google.com/mcp',
      apiKey: process.env.GOOGLE_CALENDAR_API_KEY,
      headers: {
        'X-Calendar-Id': process.env.GOOGLE_CALENDAR_ID
      }
    },
    tools: {
      prefix: 'cal'
    }
  }
];

// Função para obter configuração de servidor
export function getServerConfig(serverId: string): MCPServerConfig | undefined {
  return MCP_SERVERS.find(server => server.id === serverId);
}

// Função para obter servidores habilitados
export function getEnabledServers(): MCPServerConfig[] {
  return MCP_SERVERS.filter(server => server.enabled);
}

// Função para adicionar servidor customizado
export function addCustomServer(config: MCPServerConfig): void {
  const existing = MCP_SERVERS.findIndex(s => s.id === config.id);
  if (existing >= 0) {
    MCP_SERVERS[existing] = config;
  } else {
    MCP_SERVERS.push(config);
  }
}
```

---

## 4. Exemplos Práticos {#exemplos-práticos}

### API Route Completa com Tools e MCP

```typescript
// src/app/api/assistant/enhanced/route.ts
import { streamText, generateText, stepCountIs } from 'ai';
import { getAISDKModel } from '@/server/aiProvider';
import { taskTools } from '@/services/ai/tools/task-tools';
import { analysisTools } from '@/services/ai/tools/analysis-tools';
import { MCPManager, getEnabledServers } from '@/services/ai/mcp';
import { z } from 'zod';

// Cache de MCP Manager (singleton)
let mcpManager: MCPManager | null = null;

async function getMCPManager(): Promise<MCPManager> {
  if (!mcpManager) {
    mcpManager = new MCPManager(getEnabledServers());
  }
  return mcpManager;
}

export async function POST(req: Request) {
  try {
    const {
      message,
      mode = 'stream',
      useMCP = true,
      mcpServers = ['github', 'filesystem'],
      maxSteps = 10,
      context = {}
    } = await req.json();

    // Validação
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Obter modelo
    const model = await getAISDKModel();

    // Preparar ferramentas
    let allTools = {
      ...taskTools,
      ...analysisTools
    };

    // Adicionar ferramentas MCP se habilitado
    if (useMCP) {
      const manager = await getMCPManager();

      // Conectar aos servidores solicitados
      const connectionPromises = mcpServers.map(async (serverId: string) => {
        try {
          await manager.connectServer(serverId);
          return { serverId, success: true };
        } catch (error) {
          console.error(`Failed to connect to ${serverId}:`, error);
          return { serverId, success: false, error: error.message };
        }
      });

      const connections = await Promise.all(connectionPromises);

      // Log de conexões
      console.log('[MCP] Connection results:', connections);

      // Obter ferramentas MCP
      const mcpTools = await manager.getAllTools();
      allTools = { ...allTools, ...mcpTools };

      console.log(`[Assistant] Total tools available: ${Object.keys(allTools).length}`);
    }

    // Configuração do sistema
    const systemPrompt = `Você é um assistente avançado de produtividade com acesso a múltiplas ferramentas.

    FERRAMENTAS DISPONÍVEIS:
    ${Object.entries(allTools).map(([name, tool]) =>
      `- ${name}: ${tool.description}`
    ).join('\n')}

    CONTEXTO:
    - Data/Hora: ${new Date().toLocaleString('pt-BR')}
    - Usuário: ${context.userId || 'Anônimo'}
    - Modo: ${mode}
    ${context.projectId ? `- Projeto: ${context.projectId}` : ''}

    DIRETRIZES:
    1. Use as ferramentas apropriadas para completar as tarefas
    2. Sempre confirme ações críticas antes de executar
    3. Forneça feedback claro sobre cada ação executada
    4. Se uma ferramenta falhar, tente uma abordagem alternativa
    5. Limite-se a ${maxSteps} passos para evitar loops infinitos

    FORMATO DE RESPOSTA:
    - Explique seu raciocínio
    - Liste as ações executadas
    - Forneça o resultado final
    - Sugira próximos passos se apropriado`;

    // Configuração comum
    const config = {
      model,
      system: systemPrompt,
      messages: [{ role: 'user' as const, content: message }],
      tools: allTools,
      stopWhen: stepCountIs(maxSteps),
      temperature: 0.7,
      maxTokens: 4000,
      // Callbacks
      onStepFinish: async ({ usage, finishReason }) => {
        console.log(`[Step] Finished: ${finishReason}, Tokens: ${usage.totalTokens}`);
      },
      onToolCall: async ({ toolCall }) => {
        console.log(`[Tool] Calling: ${toolCall.toolName}`, toolCall.args);
      }
    };

    // Executar baseado no modo
    if (mode === 'stream') {
      const result = await streamText({
        ...config,
        onFinish: async ({ text, usage, steps, finishReason }) => {
          console.log(`[Assistant] Completed:`, {
            steps: steps.length,
            tokens: usage.totalTokens,
            reason: finishReason
          });

          // Salvar conversa (implemente conforme necessário)
          await saveConversation({
            message,
            response: text,
            tools: steps.filter(s => s.type === 'tool-call'),
            usage,
            context
          });

          // Desconectar MCP se usado
          if (useMCP && mcpManager) {
            const manager = await getMCPManager();
            await manager.disconnectAll();
          }
        },
        onError: async (error) => {
          console.error('[Assistant] Stream error:', error);

          // Cleanup
          if (mcpManager) {
            await mcpManager.disconnectAll();
          }
        }
      });

      return result.toUIMessageStreamResponse();
    } else {
      const result = await generateText(config);

      // Cleanup
      if (useMCP && mcpManager) {
        await mcpManager.disconnectAll();
      }

      return NextResponse.json({
        text: result.text,
        steps: result.steps.map(step => ({
          type: step.type,
          tool: step.type === 'tool-call' ? step.toolName : undefined,
          args: step.type === 'tool-call' ? step.args : undefined,
          result: step.type === 'tool-call' ? step.result : undefined
        })),
        usage: result.usage
      });
    }

  } catch (error) {
    console.error('[Assistant] Error:', error);

    // Garantir cleanup
    if (mcpManager) {
      try {
        await mcpManager.disconnectAll();
      } catch {}
    }

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        type: error.name || 'Error'
      },
      { status: 500 }
    );
  }
}
```

### Cliente React com Suporte a Tools

```typescript
// src/components/AIAssistant.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';

export function AIAssistant() {
  const [mcpServers, setMcpServers] = useState(['github', 'filesystem']);
  const [maxSteps, setMaxSteps] = useState(10);
  const [toolExecutions, setToolExecutions] = useState<any[]>([]);

  const {
    messages,
    input,
    isLoading,
    error,
    sendMessage,
    setInput,
    reload,
    stop,
    addToolResult
  } = useChat({
    api: '/api/assistant/enhanced',
    body: {
      useMCP: true,
      mcpServers,
      maxSteps,
      context: {
        userId: 'user123',
        projectId: 'proj456'
      }
    },
    // Callbacks
    onFinish: (message, { usage, finishReason }) => {
      console.log('Assistant finished:', {
        message: message.content,
        tokens: usage?.totalTokens,
        reason: finishReason
      });

      // Analytics
      trackAssistantUsage(usage);
    },
    onError: (error) => {
      console.error('Assistant error:', error);
      showErrorNotification(error.message);
    },
    onToolCall: ({ toolCall }) => {
      console.log('Tool called:', toolCall);
      setToolExecutions(prev => [...prev, {
        id: toolCall.toolCallId,
        name: toolCall.toolName,
        args: toolCall.args,
        status: 'executing',
        timestamp: new Date().toISOString()
      }]);

      // Handle client-side tools
      handleClientTool(toolCall, addToolResult);
    }
  });

  // Processar mensagens para extrair tool calls
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.parts) {
      lastMessage.parts.forEach(part => {
        if (part.type === 'tool-call') {
          const execution = toolExecutions.find(e => e.id === part.toolCallId);
          if (execution && execution.status === 'executing') {
            setToolExecutions(prev => prev.map(e =>
              e.id === part.toolCallId
                ? { ...e, status: 'completed', result: part.result }
                : e
            ));
          }
        }
      });
    }
  }, [messages, toolExecutions]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header com configurações */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Assistente AI</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <span className="text-sm">Max Steps:</span>
              <input
                type="number"
                value={maxSteps}
                onChange={(e) => setMaxSteps(Number(e.target.value))}
                className="w-16 px-2 py-1 border rounded"
                min="1"
                max="20"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm">MCP:</span>
              <select
                multiple
                value={mcpServers}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, o => o.value);
                  setMcpServers(selected);
                }}
                className="px-2 py-1 border rounded"
              >
                <option value="github">GitHub</option>
                <option value="filesystem">Filesystem</option>
                <option value="slack">Slack</option>
                <option value="calendar">Calendar</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Área de ferramentas em execução */}
      {toolExecutions.length > 0 && (
        <div className="bg-blue-50 border-b p-3">
          <div className="text-sm font-medium mb-2">Ferramentas Executadas:</div>
          <div className="space-y-1">
            {toolExecutions.slice(-5).map((exec, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs p-2 rounded ${
                  exec.status === 'executing'
                    ? 'bg-yellow-100'
                    : exec.status === 'completed'
                    ? 'bg-green-100'
                    : 'bg-red-100'
                }`}
              >
                <span className="font-mono">{exec.name}</span>
                <span className="text-gray-600">
                  {JSON.stringify(exec.args).substring(0, 50)}...
                </span>
                <span className={`ml-auto ${
                  exec.status === 'executing' ? 'animate-pulse' : ''
                }`}>
                  {exec.status === 'executing' ? '⏳' : '✅'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagens */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message, i) => (
          <MessageComponent key={i} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-600">
            <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
            <span>Assistente está pensando...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded">
            Erro: {error.message}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Digite sua mensagem..."
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar
          </button>
          {isLoading && (
            <button
              onClick={stop}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Parar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// Componente de mensagem com suporte a tool calls
function MessageComponent({ message }: { message: any }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-blue-500 text-white p-3 rounded-lg max-w-lg">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="bg-white p-3 rounded-lg max-w-lg shadow">
        {message.parts?.map((part: any, i: number) => {
          if (part.type === 'text') {
            return <div key={i}>{part.text}</div>;
          }
          if (part.type === 'tool-call') {
            return (
              <div key={i} className="mt-2 p-2 bg-gray-100 rounded text-xs">
                <div className="font-mono">🔧 {part.toolName}</div>
                {part.state === 'output-available' && (
                  <pre className="mt-1 text-gray-600">
                    {JSON.stringify(part.output, null, 2)}
                  </pre>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

// Função para lidar com ferramentas client-side
async function handleClientTool(toolCall: any, addToolResult: Function) {
  const { toolName, args, toolCallId } = toolCall;

  switch (toolName) {
    case 'getLocation':
      navigator.geolocation.getCurrentPosition(
        (position) => {
          addToolResult({
            toolCallId,
            result: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          });
        },
        (error) => {
          addToolResult({
            toolCallId,
            result: { error: error.message }
          });
        }
      );
      break;

    case 'getUserConfirmation':
      const confirmed = window.confirm(args.message);
      addToolResult({
        toolCallId,
        result: { confirmed }
      });
      break;

    // Adicione mais ferramentas client-side conforme necessário
  }
}
```

---

## 5. Troubleshooting {#troubleshooting}

### Problemas Comuns e Soluções

```typescript
// src/services/ai/troubleshooting.ts

// 1. MCP Connection Failures
export async function diagnoseMCPConnection(serverId: string) {
  const diagnostics = {
    serverId,
    timestamp: new Date().toISOString(),
    checks: [] as any[]
  };

  // Check environment variables
  const envCheck = {
    name: 'Environment Variables',
    passed: false,
    details: {}
  };

  switch (serverId) {
    case 'github':
      envCheck.passed = !!process.env.GITHUB_TOKEN;
      envCheck.details = {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN ? 'Set' : 'Missing',
        GITHUB_MCP_URL: process.env.GITHUB_MCP_URL || 'Using default'
      };
      break;
    // Add other servers...
  }

  diagnostics.checks.push(envCheck);

  // Test network connectivity
  const networkCheck = {
    name: 'Network Connectivity',
    passed: false,
    details: {}
  };

  try {
    const response = await fetch('https://api.github.com', { method: 'HEAD' });
    networkCheck.passed = response.ok;
    networkCheck.details = {
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    networkCheck.details = { error: error.message };
  }

  diagnostics.checks.push(networkCheck);

  return diagnostics;
}

// 2. Tool Execution Failures
export function wrapToolWithErrorHandling(tool: any) {
  const originalExecute = tool.execute;

  return {
    ...tool,
    execute: async (input: any) => {
      try {
        return await originalExecute(input);
      } catch (error) {
        console.error(`Tool execution failed: ${tool.name}`, error);

        // Categorize error
        if (error.message?.includes('timeout')) {
          throw new Error(`Tool ${tool.name} timed out. Try again with simpler input.`);
        }

        if (error.message?.includes('validation')) {
          throw new Error(`Invalid input for ${tool.name}: ${error.message}`);
        }

        if (error.message?.includes('permission')) {
          throw new Error(`Permission denied for ${tool.name}`);
        }

        // Generic error
        throw new Error(`Tool ${tool.name} failed: ${error.message}`);
      }
    }
  };
}

// 3. Streaming Issues
export class StreamDebugger {
  private chunks: any[] = [];
  private errors: any[] = [];

  logChunk(chunk: any) {
    this.chunks.push({
      timestamp: Date.now(),
      type: chunk.type,
      size: JSON.stringify(chunk).length,
      data: chunk
    });
  }

  logError(error: any) {
    this.errors.push({
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack
    });
  }

  getReport() {
    return {
      totalChunks: this.chunks.length,
      chunkTypes: this.chunks.reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      }, {}),
      errors: this.errors,
      duration: this.chunks.length > 0
        ? this.chunks[this.chunks.length - 1].timestamp - this.chunks[0].timestamp
        : 0
    };
  }
}
```

---

## Conclusão

Esta documentação fornece uma implementação completa e robusta de MCP e Tools para o Zenith Tasks, incluindo:

- ✅ **Configuração detalhada de ferramentas** com schemas completos
- ✅ **Cliente MCP avançado** com múltiplos transportes
- ✅ **Tratamento de erros robusto** e reconexão automática
- ✅ **Exemplos práticos** prontos para uso
- ✅ **Troubleshooting** e diagnóstico

Com esta implementação, o assistente AI terá capacidades expandidas através de ferramentas locais e remotas via MCP, mantendo segurança, confiabilidade e performance.