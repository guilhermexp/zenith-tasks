import { tool } from 'ai';
import { z } from 'zod';

const NOT_CONFIGURED_MESSAGE = 'Integração direta com o banco ainda não está configurada neste ambiente.';

export const taskTools = {
  createTask: tool({
    description: 'Cria uma nova tarefa no sistema com informações detalhadas',
    inputSchema: z.object({
      title: z.string().describe('Título da tarefa'),
      summary: z.string().optional().describe('Resumo ou descrição detalhada'),
      type: z.enum(['Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião']).default('Tarefa'),
      dueDate: z.string().optional().describe('Data de vencimento em formato ISO 8601'),
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
      tags: z.array(z.string()).optional().describe('Tags associadas à tarefa'),
      subtasks: z.array(z.object({
        title: z.string(),
        completed: z.boolean().default(false)
      })).optional().describe('Lista de subtarefas'),
      amount: z.number().optional().describe('Valor monetário (para tarefas financeiras)'),
      transactionType: z.enum(['Entrada', 'Saída']).optional().describe('Tipo de transação financeira')
    }),
    execute: async ({ title, summary, type, dueDate, priority, tags, subtasks, amount, transactionType }) => {
      return {
        created: false,
        message: `${NOT_CONFIGURED_MESSAGE} Utilize as tools de app (createItem) ou configure Supabase para habilitar esta operação direta.`,
        requested: {
          title,
          summary,
          type,
          dueDate,
          priority,
          tags,
          subtasks,
          amount,
          transactionType
        }
      };
    }
  }),

  updateTask: tool({
    description: 'Atualiza uma tarefa existente com novas informações',
    inputSchema: z.object({
      id: z.string().describe('ID da tarefa a ser atualizada'),
      updates: z.object({
        title: z.string().optional(),
        summary: z.string().optional(),
        completed: z.boolean().optional(),
        dueDate: z.string().nullable().optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        type: z.enum(['Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião']).optional(),
        tags: z.array(z.string()).optional(),
        amount: z.number().optional(),
        transactionType: z.enum(['Entrada', 'Saída']).optional()
      }).describe('Campos a serem atualizados')
    }),
    execute: async ({ id, updates }) => {
      return {
        success: false,
        message: `${NOT_CONFIGURED_MESSAGE} Utilize a ferramenta updateItem do app para alterações.`,
        requested: { id, updates }
      };
    }
  }),

  deleteTask: tool({
    description: 'Remove uma tarefa do sistema permanentemente',
    inputSchema: z.object({
      id: z.string().describe('ID da tarefa a ser removida'),
      reason: z.string().optional().describe('Motivo da remoção (para log)')
    }),
    execute: async ({ id, reason }) => {
      return {
        deleted: false,
        id,
        message: `${NOT_CONFIGURED_MESSAGE} Solicite ao assistente para usar deleteItem quando disponível.`,
        requestedReason: reason
      };
    }
  }),

  searchTasks: tool({
    description: 'Busca tarefas no sistema com filtros avançados',
    inputSchema: z.object({
      query: z.string().optional().describe('Texto de busca'),
      filters: z.object({
        type: z.enum(['Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião']).optional(),
        completed: z.boolean().optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        tags: z.array(z.string()).optional(),
        dateRange: z.object({
          from: z.string().optional().describe('Data inicial (ISO 8601)'),
          to: z.string().optional().describe('Data final (ISO 8601)')
        }).optional()
      }).optional().describe('Filtros de busca'),
      limit: z.number().min(1).max(100).default(10).describe('Número máximo de resultados'),
      sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'title']).default('createdAt')
    }),
    execute: async (params) => {
      return {
        count: 0,
        tasks: [],
        hasMore: false,
        message: `${NOT_CONFIGURED_MESSAGE} Configure uma origem de dados ou utilize listItems/searchItems das ferramentas do app.`,
        request: params
      };
    }
  }),

  toggleTaskComplete: tool({
    description: 'Marca ou desmarca uma tarefa como concluída',
    inputSchema: z.object({
      id: z.string().describe('ID da tarefa'),
      completed: z.boolean().describe('Novo status de conclusão')
    }),
    execute: async ({ id, completed }) => {
      return {
        success: false,
        id,
        completed,
        message: `${NOT_CONFIGURED_MESSAGE} Utilize a ferramenta markAsDone/setDueDate para alterar status.`
      };
    }
  })
};