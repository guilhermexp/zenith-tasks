/**
 * Tools reais do Zenith Tasks que se conectam com as APIs do app
 * Estas ferramentas permitem ao assistente interagir com todas as funcionalidades
 */

import { tool } from 'ai';
import { z } from 'zod';

import { getServer, getServers } from '@/server/mcpRegistry';
import { safeResponseJson } from '@/utils/safe-json';

// Schema dos tipos de item do app
const ItemTypeSchema = z.enum(['Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião']);
const TransactionTypeSchema = z.enum(['Entrada', 'Saída']);

export const appTools = {
  // ============================================
  // CRUD de Itens (Tarefas, Notas, Ideias, etc)
  // ============================================
  
  createItem: tool({
    description: 'Cria um novo item no sistema (tarefa, nota, ideia, lembrete, financeiro ou reunião). Use esta ferramenta para adicionar qualquer tipo de conteúdo ao app.',
    inputSchema: z.object({
      title: z.string().describe('Título do item'),
      type: ItemTypeSchema.describe('Tipo do item'),
      summary: z.string().optional().describe('Descrição detalhada ou notas adicionais'),
      dueDate: z.string().optional().describe('Data de vencimento em formato brasileiro (DD/MM/YYYY)'),
      dueDateISO: z.string().optional().describe('Data/hora em formato ISO 8601 (YYYY-MM-DDTHH:mm:ss)'),
      amount: z.number().optional().describe('Valor monetário (apenas para tipo Financeiro)'),
      transactionType: TransactionTypeSchema.optional().describe('Tipo de transação (apenas para tipo Financeiro)'),
    }),
    execute: async (params: any) => {
      // Esta tool será chamada pelo assistente
      // A execução real acontece no lado do cliente via callbacks
      return {
        action: 'create_item',
        params,
        message: `Item "${params.title}" (${params.type}) será criado`
      };
    }
  }),

  updateItem: tool({
    description: 'Atualiza um item existente. Pode modificar título, status, descrição, data de vencimento, etc.',
    inputSchema: z.object({
      id: z.string().describe('ID do item a ser atualizado'),
      title: z.string().optional().describe('Novo título'),
      summary: z.string().optional().describe('Nova descrição'),
      completed: z.boolean().optional().describe('Status de conclusão'),
      dueDate: z.string().nullable().optional().describe('Nova data de vencimento (DD/MM/YYYY) ou null para remover'),
      dueDateISO: z.string().nullable().optional().describe('Nova data/hora ISO ou null para remover'),
      amount: z.number().optional().describe('Novo valor (para itens financeiros)'),
      transactionType: TransactionTypeSchema.optional().describe('Novo tipo de transação'),
    }),
    execute: async (params: any) => {
      return {
        action: 'update_item',
        params,
        message: `Item ${params.id} será atualizado`
      };
    }
  }),

  deleteItem: tool({
    description: 'Remove um item permanentemente do sistema. Use com cuidado pois esta ação não pode ser desfeita.',
    inputSchema: z.object({
      id: z.string().describe('ID do item a ser removido'),
      reason: z.string().optional().describe('Motivo da remoção (para registro)')
    }),
    execute: async (params: any) => {
      return {
        action: 'delete_item',
        params,
        message: `Item ${params.id} será removido${params.reason ? ` (motivo: ${params.reason})` : ''}`
      };
    }
  }),

  // ============================================
  // Busca e Consulta
  // ============================================

  searchItems: tool({
    description: 'Busca itens no sistema usando texto livre ou filtros específicos. Útil para encontrar tarefas, notas, ideias pendentes, etc.',
    inputSchema: z.object({
      query: z.string().optional().describe('Texto de busca livre'),
      type: ItemTypeSchema.optional().describe('Filtrar por tipo específico'),
      completed: z.boolean().optional().describe('Filtrar por status de conclusão'),
      hasDoueDate: z.boolean().optional().describe('Filtrar itens com ou sem prazo'),
      dueDateBefore: z.string().optional().describe('Buscar itens com vencimento antes desta data'),
      dueDateAfter: z.string().optional().describe('Buscar itens com vencimento depois desta data'),
      limit: z.number().min(1).max(100).default(20).describe('Número máximo de resultados')
    }),
    execute: async (params: any) => {
      return {
        action: 'search_items',
        params,
        message: 'Buscando itens...'
      };
    }
  }),

  listItems: tool({
    description: 'Lista todos os itens ou filtra por tipo. Use para obter visão geral do sistema.',
    inputSchema: z.object({
      type: ItemTypeSchema.optional().describe('Filtrar por tipo específico'),
      completed: z.boolean().optional().describe('Mostrar apenas concluídos ou pendentes'),
      sortBy: z.enum(['createdAt', 'dueDate', 'title']).default('createdAt').describe('Ordenar por campo'),
      limit: z.number().min(1).max(100).default(50).describe('Número máximo de resultados')
    }),
    execute: async (params: any) => {
      return {
        action: 'list_items',
        params,
        message: 'Listando itens...'
      };
    }
  }),

  getItemDetails: tool({
    description: 'Obtém detalhes completos de um item específico incluindo subtarefas, histórico de chat, e metadados.',
    inputSchema: z.object({
      id: z.string().describe('ID do item')
    }),
    execute: async (params: any) => {
      return {
        action: 'get_item',
        params,
        message: `Buscando detalhes do item ${params.id}...`
      };
    }
  }),

  // ============================================
  // Agenda e Calendário
  // ============================================

  listAgenda: tool({
    description: 'Lista itens da agenda com prazo em um período específico. Útil para ver tarefas do dia, semana, etc.',
    inputSchema: z.object({
      rangeDays: z.number().min(1).max(365).default(7).describe('Número de dias à frente para consultar'),
      startDate: z.string().optional().describe('Data inicial (ISO 8601), padrão: hoje'),
      includeOverdue: z.boolean().default(true).describe('Incluir itens atrasados')
    }),
    execute: async (params: any) => {
      return {
        action: 'list_agenda',
        params,
        message: `Consultando agenda dos próximos ${params.rangeDays} dia(s)...`
      };
    }
  }),

  // ============================================
  // Subtarefas
  // ============================================

  generateSubtasks: tool({
    description: 'Gera automaticamente subtarefas para uma tarefa usando IA. Útil para quebrar tarefas complexas em passos menores.',
    inputSchema: z.object({
      id: z.string().describe('ID da tarefa'),
      force: z.boolean().default(false).describe('Forçar geração mesmo se já tiver subtarefas')
    }),
    execute: async (params: any) => {
      return {
        action: 'generate_subtasks',
        params,
        message: `Gerando subtarefas para item ${params.id}...`
      };
    }
  }),

  addSubtask: tool({
    description: 'Adiciona uma subtarefa manualmente a uma tarefa existente.',
    inputSchema: z.object({
      itemId: z.string().describe('ID da tarefa pai'),
      title: z.string().describe('Título da subtarefa')
    }),
    execute: async (params: any) => {
      return {
        action: 'add_subtask',
        params,
        message: `Adicionando subtarefa "${params.title}"...`
      };
    }
  }),

  toggleSubtask: tool({
    description: 'Marca ou desmarca uma subtarefa como concluída.',
    inputSchema: z.object({
      itemId: z.string().describe('ID da tarefa pai'),
      subtaskId: z.string().describe('ID da subtarefa'),
      completed: z.boolean().describe('Novo status de conclusão')
    }),
    execute: async (params: any) => {
      return {
        action: 'toggle_subtask',
        params,
        message: `Atualizando status da subtarefa...`
      };
    }
  }),

  // ============================================
  // Análise e Produtividade
  // ============================================

  analyzeInbox: tool({
    description: 'Analisa texto livre e sugere criação de múltiplos itens (tarefas, notas, ideias). Útil para processar brainstorms ou anotações.',
    inputSchema: z.object({
      text: z.string().describe('Texto a ser analisado')
    }),
    execute: async (params: any) => {
      return {
        action: 'analyze_inbox',
        params,
        message: 'Analisando texto...'
      };
    }
  }),

  getStatistics: tool({
    description: 'Obtém estatísticas gerais de produtividade: total de itens, conclusão, itens por tipo, etc.',
    inputSchema: z.object({
      period: z.enum(['today', 'week', 'month', 'all']).default('week').describe('Período de análise')
    }),
    execute: async (params: any) => {
      return {
        action: 'get_statistics',
        params,
        message: 'Calculando estatísticas...'
      };
    }
  }),

  // ============================================
  // Ações Rápidas
  // ============================================

  markAsDone: tool({
    description: 'Marca um item como concluído rapidamente.',
    inputSchema: z.object({
      id: z.string().describe('ID do item')
    }),
    execute: async (params: any) => {
      return {
        action: 'mark_done',
        params,
        message: `Marcando item ${params.id} como concluído...`
      };
    }
  }),

  setDueDate: tool({
    description: 'Define ou remove a data de vencimento de um item.',
    inputSchema: z.object({
      id: z.string().describe('ID do item'),
      dueDateISO: z.string().nullable().describe('Nova data ISO 8601 ou null para remover')
    }),
    execute: async (params: any) => {
      return {
        action: 'set_due_date',
        params,
        message: params.dueDateISO 
          ? `Definindo prazo para ${new Date(params.dueDateISO).toLocaleDateString('pt-BR')}...`
          : 'Removendo prazo...'
      };
    }
  }),

  // ============================================
  // Chat Contextual
  // ============================================

  chatWithItem: tool({
    description: 'Inicia ou continua uma conversa contextual sobre um item específico. Útil para fazer perguntas ou obter sugestões.',
    inputSchema: z.object({
      itemId: z.string().describe('ID do item'),
      message: z.string().describe('Mensagem ou pergunta sobre o item')
    }),
    execute: async (params: any) => {
      return {
        action: 'chat_with_item',
        params,
        message: 'Processando mensagem...'
      };
    }
  }),

  // ============================================
  // Itens Financeiros
  // ============================================

  getFinancialSummary: tool({
    description: 'Obtém resumo financeiro: total de entradas, saídas, saldo, etc.',
    inputSchema: z.object({
      period: z.enum(['month', 'quarter', 'year', 'all']).default('month'),
      includeProjections: z.boolean().default(false).describe('Incluir projeções baseadas em itens recorrentes')
    }),
    execute: async (params: any) => {
      return {
        action: 'get_financial_summary',
        params,
        message: 'Calculando resumo financeiro...'
      };
    }
  }),

  // ============================================
  // Reuniões
  // ============================================

  summarizeMeeting: tool({
    description: 'Gera resumo automático de uma reunião baseado na transcrição.',
    inputSchema: z.object({
      meetingId: z.string().describe('ID da reunião')
    }),
    execute: async (params: any) => {
      return {
        action: 'summarize_meeting',
        params,
        message: `Gerando resumo da reunião ${params.meetingId}...`
      };
    }
  }),

  // ============================================
  // MCP
  // ============================================

  mcpListServers: tool({
    description: 'Lista servidores MCP configurados no app.',
    inputSchema: z.object({
      includeHeaders: z.boolean().default(false).describe('Incluir cabeçalhos personalizados armazenados'),
      includeApiKey: z.boolean().default(false).describe('Incluir chaves de API completas (use apenas em modo seguro)')
    }),
    execute: async ({ includeHeaders, includeApiKey }) => {
      const servers = await getServers();
      const mapped = servers.map(({ apiKey, headersJson, ...rest }) => ({
        ...rest,
        hasApiKey: !!apiKey,
        ...(includeApiKey ? { apiKey } : {}),
        ...(includeHeaders ? { headersJson } : {})
      }));

      return {
        servers: mapped,
        total: mapped.length,
        message: mapped.length
          ? `Encontrados ${mapped.length} servidor(es) MCP.`
          : 'Nenhum servidor MCP configurado.'
      };
    }
  }),

  mcpListTools: tool({
    description: 'Busca ferramentas disponíveis em um servidor MCP HTTP.',
    inputSchema: z.object({
      serverId: z.string().describe('ID do servidor MCP registrado')
    }),
    execute: async ({ serverId }) => {
      const srv = await getServer(serverId);
      if (!srv) {
        return {
          tools: [],
          message: `Servidor ${serverId} não encontrado.`
        };
      }

      if (!srv.baseUrl || !srv.baseUrl.trim()) {
        return {
          tools: [],
          message: `Servidor ${serverId} não possui baseUrl configurada.`
        };
      }

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (srv.apiKey) headers['Authorization'] = `Bearer ${srv.apiKey}`;
      if (srv.headersJson) {
        try { Object.assign(headers, JSON.parse(srv.headersJson)); } catch {}
      }

      const toolsPath = srv.toolsPath && srv.toolsPath.trim().length ? srv.toolsPath : '/tools';
      const url = srv.baseUrl.replace(/\/$/, '') + toolsPath;

      const res = await fetch(url, { headers, cache: 'no-store' });
      const json = await safeResponseJson(res, {});

      if (!res.ok) {
        return {
          tools: [],
          error: `Falha ao obter ferramentas (${res.status})`,
          upstream: json
        };
      }

      const tools = Array.isArray((json as any)?.tools) ? (json as any).tools : json;
      return {
        tools,
        message: Array.isArray(tools)
          ? `Servidor ${serverId} retornou ${tools.length} ferramenta(s).`
          : `Resposta recebida do servidor ${serverId}.`
      };
    }
  }),

  mcpCall: tool({
    description: 'Executa uma ferramenta em um servidor MCP HTTP.',
    inputSchema: z.object({
      serverId: z.string().describe('ID do servidor MCP registrado'),
      name: z.string().describe('Nome da ferramenta'),
      arguments: z.record(z.string(), z.any()).default({}).describe('Argumentos para a ferramenta')
    }),
    execute: async ({ serverId, name, arguments: args }) => {
      const srv = await getServer(serverId);
      if (!srv) {
        return {
          error: `Servidor ${serverId} não encontrado.`,
          result: null
        };
      }

      if (!srv.baseUrl || !srv.baseUrl.trim()) {
        return {
          error: `Servidor ${serverId} não possui baseUrl configurada.`,
          result: null
        };
      }

      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      };
      if (srv.apiKey) headers['Authorization'] = `Bearer ${srv.apiKey}`;
      if (srv.headersJson) {
        try { Object.assign(headers, JSON.parse(srv.headersJson)); } catch {}
      }

      const callPath = srv.callPath && srv.callPath.trim().length ? srv.callPath : '/call';
      const url = srv.baseUrl.replace(/\/$/, '') + callPath;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify({ name, arguments: args || {} })
      });
      const json = await safeResponseJson(res, {});

      if (!res.ok) {
        return {
          error: `Servidor retornou ${res.status}.`,
          upstream: json
        };
      }

      return {
        result: json,
        message: `Ferramenta ${name} executada com sucesso em ${serverId}.`
      };
    }
  })
};
