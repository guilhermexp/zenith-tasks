import { tool } from 'ai';
import { z } from 'zod';

// Importar funções do banco de dados (assumindo que existem)
// import { createTaskInDatabase, updateTaskInDatabase, deleteTaskFromDatabase, searchTasksInDatabase } from '@/services/database/items';

// Mock functions para desenvolvimento - substituir pelas reais
async function createTaskInDatabase(data: any) {
  console.log('Creating task:', data);
  return { id: Date.now().toString(), ...data };
}

async function updateTaskInDatabase(id: string, updates: any) {
  console.log('Updating task:', id, updates);
  return { id, ...updates };
}

async function deleteTaskFromDatabase(id: string) {
  console.log('Deleting task:', id);
  return true;
}

async function searchTasksInDatabase(params: any) {
  console.log('Searching tasks:', params);
  return [];
}

async function logDeletion(id: string, reason: string) {
  console.log('Logging deletion:', id, reason);
}

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
      try {
        const taskData = {
          title,
          summary,
          type,
          completed: false,
          dueDate: dueDate ? new Date(dueDate).toLocaleDateString('pt-BR') : undefined,
          dueDateISO: dueDate,
          priority,
          tags,
          subtasks,
          ...(type === 'Financeiro' && { amount, transactionType })
        };

        const newTask = await createTaskInDatabase(taskData);

        return {
          id: newTask.id,
          created: true,
          message: `Tarefa "${title}" criada com sucesso`,
          task: {
            id: newTask.id,
            title: newTask.title,
            type: newTask.type,
            completed: newTask.completed
          }
        };
      } catch (error) {
        return {
          id: '',
          created: false,
          message: `Erro ao criar tarefa: ${error}`,
          task: { id: '', title: '', type: '', completed: false }
        };
      }
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
      try {
        const updateData = {
          ...updates,
          ...(updates.dueDate !== undefined && {
            dueDate: updates.dueDate ? new Date(updates.dueDate).toLocaleDateString('pt-BR') : null,
            dueDateISO: updates.dueDate
          })
        };

        await updateTaskInDatabase(id, updateData);

        const changedFields = Object.keys(updates)
          .filter(key => updates[key as keyof typeof updates] !== undefined)
          .map(key => {
            const fieldNames: Record<string, string> = {
              title: 'título',
              summary: 'resumo',
              completed: 'status de conclusão',
              dueDate: 'data de vencimento',
              priority: 'prioridade',
              type: 'tipo',
              tags: 'tags',
              amount: 'valor',
              transactionType: 'tipo de transação'
            };
            return fieldNames[key] || key;
          });

        return {
          success: true,
          message: `Tarefa atualizada: ${changedFields.join(', ')}`,
          updated: {
            id,
            changes: changedFields
          }
        };
      } catch (error) {
        return {
          success: false,
          message: `Erro ao atualizar tarefa: ${error}`,
          updated: { id, changes: [] }
        };
      }
    }
  }),

  deleteTask: tool({
    description: 'Remove uma tarefa do sistema permanentemente',
    inputSchema: z.object({
      id: z.string().describe('ID da tarefa a ser removida'),
      reason: z.string().optional().describe('Motivo da remoção (para log)')
    }),
    execute: async ({ id, reason }) => {
      try {
        const deleted = await deleteTaskFromDatabase(id);

        if (reason) {
          await logDeletion(id, reason);
        }

        return {
          deleted,
          id,
          message: deleted
            ? `Tarefa removida com sucesso${reason ? ` (motivo: ${reason})` : ''}`
            : 'Tarefa não encontrada'
        };
      } catch (error) {
        return {
          deleted: false,
          id,
          message: `Erro ao remover tarefa: ${error}`
        };
      }
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
      try {
        const tasks = await searchTasksInDatabase(params);

        return {
          count: tasks.length,
          tasks: tasks.map((task: any) => ({
            id: task.id,
            title: task.title,
            type: task.type,
            completed: task.completed,
            dueDate: task.dueDate,
            priority: task.priority
          })),
          hasMore: tasks.length === params.limit,
          message: `${tasks.length} tarefa(s) encontrada(s)`
        };
      } catch (error) {
        return {
          count: 0,
          tasks: [],
          hasMore: false,
          message: `Erro na busca: ${error}`
        };
      }
    }
  }),

  toggleTaskComplete: tool({
    description: 'Marca ou desmarca uma tarefa como concluída',
    inputSchema: z.object({
      id: z.string().describe('ID da tarefa'),
      completed: z.boolean().describe('Novo status de conclusão')
    }),
    execute: async ({ id, completed }) => {
      try {
        await updateTaskInDatabase(id, { completed });

        return {
          success: true,
          id,
          completed,
          message: completed
            ? 'Tarefa marcada como concluída'
            : 'Tarefa marcada como não concluída'
        };
      } catch (error) {
        return {
          success: false,
          id,
          completed: false,
          message: `Erro ao atualizar status: ${error}`
        };
      }
    }
  })
};