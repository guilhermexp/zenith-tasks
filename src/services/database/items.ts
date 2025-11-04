import { and, desc, eq } from 'drizzle-orm';

import { mindFlowItems, subtasks } from '@/db/schema';
import type {
  MindFlowItem as DbMindFlowItem,
  Subtask as DbSubtask,
} from '@/db/schema';
import { db } from '@/lib/db';
import type { MindFlowItem as MindFlowItemDTO } from '@/types';
import { logger } from '@/utils/logger';

type RawItem = DbMindFlowItem & {
  subtasks?: DbSubtask[];
};

const ERROR_ALREADY_LOGGED: unique symbol = Symbol('ITEMS_SERVICE_ERROR_ALREADY_LOGGED');

type LoggedError = Error & {
  [ERROR_ALREADY_LOGGED]?: boolean;
};

export class ItemsService {
  /**
   * Load all items for a specific user
   */
  static async loadItems(userId: string): Promise<MindFlowItemDTO[]> {
    try {
      const items = await db.query.mindFlowItems.findMany({
        where: eq(mindFlowItems.userId, userId),
        with: {
          subtasks: true,
        },
        orderBy: [desc(mindFlowItems.createdAt)],
      });

      return items.map(item => this.mapToMindFlowItem(item));
    } catch (error) {
      throw this.logAndWrapError('loadItems', error, { userId });
    }
  }

  /**
   * Create a new item
   */
  static async createItem(
    userId: string,
    item: Omit<MindFlowItemDTO, 'id' | 'createdAt'>,
  ): Promise<MindFlowItemDTO> {
    try {
      const result = await db.transaction(async tx => {
        const [created] = await tx
          .insert(mindFlowItems)
          .values({
            userId,
            title: item.title,
            itemType: item.type,
            completed: item.completed ?? false,
            summary: item.summary,
            dueDate: item.dueDate ?? null,
            dueDateIso: item.dueDateISO ?? null,
            suggestions: item.suggestions,
            isGeneratingSubtasks: item.isGeneratingSubtasks ?? false,
            transactionType: item.transactionType ?? null,
            amount: item.amount !== undefined && item.amount !== null ? String(item.amount) : null,
            isRecurring: item.isRecurring ?? false,
            paymentMethod: item.paymentMethod ?? null,
            isPaid: item.isPaid ?? false,
            chatHistory: item.chatHistory ?? [],
            meetingDetails: item.meetingDetails ?? null,
            notes: item.notes ?? null,
          })
          .returning();

        if (!created) {
          throw new Error('Failed to create mind flow item');
        }

        let createdSubtasks: DbSubtask[] = [];

        if (item.subtasks?.length) {
          const values = item.subtasks.map((subtask, index) => ({
            parentItemId: created.id,
            title: subtask.title,
            completed: subtask.completed ?? false,
            position: index,
          }));

          createdSubtasks = await tx.insert(subtasks).values(values).returning();
        }

        return {
          created,
          subtasks: createdSubtasks,
        };
      });

      return this.mapToMindFlowItem({
        ...result.created,
        subtasks: result.subtasks,
      });
    } catch (error) {
      throw this.logAndWrapError('createItem', error, { userId, title: item.title });
    }
  }

  /**
   * Update an existing item
   */
  static async updateItem(itemId: string, updates: Partial<MindFlowItemDTO>): Promise<void> {
    try {
      await db.transaction(async tx => {
        const updateData: Partial<DbMindFlowItem> = {};

        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.completed !== undefined) updateData.completed = updates.completed;
        if (updates.summary !== undefined) updateData.summary = updates.summary;
        if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate ?? null;
        if (updates.dueDateISO !== undefined) updateData.dueDateIso = updates.dueDateISO ?? null;
        if (updates.suggestions !== undefined) updateData.suggestions = updates.suggestions;
        if (updates.isGeneratingSubtasks !== undefined) {
          updateData.isGeneratingSubtasks = updates.isGeneratingSubtasks;
        }
        if (updates.transactionType !== undefined) {
          updateData.transactionType = (updates.transactionType ?? null) as
            | MindFlowItemDTO['transactionType']
            | null;
        }
        if (updates.amount !== undefined) {
          updateData.amount =
            updates.amount === null || updates.amount === undefined
              ? null
              : updates.amount.toString();
        }
        if (updates.isRecurring !== undefined) updateData.isRecurring = updates.isRecurring;
        if (updates.paymentMethod !== undefined) {
          updateData.paymentMethod = updates.paymentMethod ?? null;
        }
        if (updates.isPaid !== undefined) updateData.isPaid = updates.isPaid;
        if (updates.chatHistory !== undefined) updateData.chatHistory = updates.chatHistory ?? [];
        if (updates.meetingDetails !== undefined) {
          updateData.meetingDetails = updates.meetingDetails ?? null;
        }
        if (updates.notes !== undefined) updateData.notes = updates.notes ?? null;

        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();

          await tx
            .update(mindFlowItems)
            .set(updateData)
            .where(eq(mindFlowItems.id, itemId));
        }

        if (updates.subtasks !== undefined) {
          await tx.delete(subtasks).where(eq(subtasks.parentItemId, itemId));

          if (updates.subtasks.length > 0) {
            const values = updates.subtasks.map((subtask, index) => ({
              parentItemId: itemId,
              title: subtask.title,
              completed: subtask.completed ?? false,
              position: index,
            }));

            await tx.insert(subtasks).values(values);
          }
        }
      });
    } catch (error) {
      throw this.logAndWrapError('updateItem', error, { itemId });
    }
  }

  /**
   * Delete an item
   */
  static async deleteItem(itemId: string): Promise<void> {
    try {
      await db.delete(mindFlowItems).where(eq(mindFlowItems.id, itemId));
    } catch (error) {
      throw this.logAndWrapError('deleteItem', error, { itemId });
    }
  }

  /**
   * Toggle item completion status
   */
  static async toggleItem(itemId: string): Promise<void> {
    try {
      await db.transaction(async tx => {
        const [item] = await tx
          .select({
            completed: mindFlowItems.completed,
          })
          .from(mindFlowItems)
          .where(eq(mindFlowItems.id, itemId))
          .limit(1);

        if (!item) {
          throw new Error('Item not found');
        }

        await tx
          .update(mindFlowItems)
          .set({
            completed: !item.completed,
            updatedAt: new Date(),
          })
          .where(eq(mindFlowItems.id, itemId));
      });
    } catch (error) {
      throw this.logAndWrapError('toggleItem', error, { itemId });
    }
  }

  /**
   * Clear all completed items for a user
   */
  static async clearCompleted(userId: string): Promise<void> {
    try {
      await db
        .delete(mindFlowItems)
        .where(and(eq(mindFlowItems.userId, userId), eq(mindFlowItems.completed, true)));
    } catch (error) {
      throw this.logAndWrapError('clearCompleted', error, { userId });
    }
  }

  /**
   * Set due date for an item
   */
  static async setDueDate(itemId: string, date: Date | null): Promise<void> {
    try {
      const updateData = date
        ? {
            dueDate: date.toLocaleDateString('pt-BR'),
            dueDateIso: date.toISOString(),
          }
        : {
            dueDate: null,
            dueDateIso: null,
          };

      await db
        .update(mindFlowItems)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(mindFlowItems.id, itemId));
    } catch (error) {
      throw this.logAndWrapError('setDueDate', error, { itemId });
    }
  }

  static isNetworkError(error: unknown): error is Error {
    return error instanceof Error && error.name === 'DatabaseNetworkError';
  }

  private static mapToMindFlowItem(data: RawItem): MindFlowItemDTO {
    const subtasks = Array.isArray(data.subtasks)
      ? [...data.subtasks]
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map(subtask => ({
            id: subtask.id,
            title: subtask.title,
            completed: subtask.completed ?? false,
            createdAt: this.formatDate(subtask.createdAt),
          }))
      : [];

    return {
      id: data.id,
      title: data.title,
      completed: data.completed ?? false,
      createdAt: this.formatDate(data.createdAt),
      summary: data.summary ?? undefined,
      type: data.itemType as MindFlowItemDTO['type'],
      dueDate: data.dueDate ?? undefined,
      dueDateISO: data.dueDateIso ?? undefined,
      subtasks,
      suggestions: data.suggestions ?? undefined,
      isGeneratingSubtasks: data.isGeneratingSubtasks ?? false,
      chatHistory: (data.chatHistory as MindFlowItemDTO['chatHistory']) ?? [],
      transactionType: data.transactionType
        ? (data.transactionType as MindFlowItemDTO['transactionType'])
        : undefined,
      amount: data.amount !== null && data.amount !== undefined ? Number(data.amount) : undefined,
      isRecurring: data.isRecurring ?? false,
      paymentMethod: data.paymentMethod ?? undefined,
      isPaid: data.isPaid ?? false,
      notes: data.notes ?? undefined,
      meetingDetails: (data.meetingDetails as MindFlowItemDTO['meetingDetails']) ?? undefined,
    };
  }

  private static formatDate(value: Date | string | null | undefined): string {
    if (!value) {
      return new Date().toISOString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return new Date(value).toISOString();
  }

  private static logAndWrapError(
    operation: string,
    error: unknown,
    context: Record<string, unknown> = {},
  ): Error {
    const fallbackMessage = `ItemsService.${operation} failed`;
    const normalized = this.normalizeError(error, fallbackMessage) as LoggedError;

    if (!normalized[ERROR_ALREADY_LOGGED]) {
      const metadata = this.extractDatabaseErrorContext(error);
      const networkContext = this.isNetworkError(normalized) ? { isNetworkError: true } : {};
      logger.error(fallbackMessage, normalized, {
        operation,
        ...context,
        ...(metadata ?? {}),
        ...networkContext,
      });
      normalized[ERROR_ALREADY_LOGGED] = true;
    }

    return normalized;
  }

  private static normalizeError(error: unknown, fallbackMessage: string): Error {
    if (error instanceof Error) {
      if (!error.message) {
        error.message = fallbackMessage;
      }

      if (this.isNetworkErrorMessage(error.message)) {
        return this.createNetworkError(fallbackMessage, error);
      }

      return error;
    }

    if (typeof error === 'string' && error.trim().length > 0) {
      const trimmed = error.trim();

      if (this.isNetworkErrorMessage(trimmed)) {
        return this.createNetworkError(fallbackMessage, trimmed);
      }

      return new Error(trimmed);
    }

    if (typeof error === 'object' && error !== null) {
      const errRecord = error as Record<string, unknown>;
      const code =
        typeof errRecord.code === 'string' && errRecord.code.trim().length > 0
          ? errRecord.code.trim()
          : undefined;
      const textCandidates = (['message', 'details', 'hint', 'error', 'statusText'] as const)
        .map(key => {
          const value = errRecord[key];
          return typeof value === 'string' ? value.trim() : undefined;
        })
        .filter((value): value is string => !!value);

      if (textCandidates.some(value => this.isNetworkErrorMessage(value))) {
        return this.createNetworkError(fallbackMessage, errRecord);
      }

      const seen = new Set<string>();
      const normalizedParts = textCandidates
        .map(value => value.replace(/\s+/g, ' ').trim())
        .filter(value => {
          if (!value) return false;
          const key = value.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      const parts: string[] = [fallbackMessage];
      if (code) {
        parts.push(`[${code}]`);
      }
      parts.push(...normalizedParts);

      const message = parts.join(' ').trim();
      return message ? new Error(message) : new Error(fallbackMessage);
    }

    if (error !== undefined) {
      const stringified = String(error).trim();

      if (this.isNetworkErrorMessage(stringified)) {
        return this.createNetworkError(fallbackMessage, error);
      }

      return stringified
        ? new Error(`${fallbackMessage}: ${stringified}`)
        : new Error(fallbackMessage);
    }

    return new Error(fallbackMessage);
  }

  private static extractDatabaseErrorContext(error: unknown): Record<string, unknown> | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    const errRecord = error as Record<string, unknown>;
    const context: Record<string, unknown> = {};

    const assignIfPresent = (key: string, targetKey = key) => {
      const value = errRecord[key];
      if (value === undefined || value === null) {
        return;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          context[targetKey] = trimmed;
        }
      } else {
        context[targetKey] = value;
      }
    };

    assignIfPresent('code');
    assignIfPresent('details');
    assignIfPresent('hint');
    assignIfPresent('message', 'databaseMessage');
    assignIfPresent('status');

    return Object.keys(context).length > 0 ? context : undefined;
  }

  private static createNetworkError(fallbackMessage: string, raw: unknown): LoggedError {
    const error = new Error(`${fallbackMessage}: network request failed`) as LoggedError & {
      cause?: unknown;
    };
    error.name = 'DatabaseNetworkError';
    error.cause = raw;
    return error;
  }

  private static isNetworkErrorMessage(value?: string | null): boolean {
    if (!value) {
      return false;
    }

    const normalized = value.toLowerCase();
    return (
      normalized.includes('failed to fetch') ||
      normalized.includes('network request failed') ||
      normalized.includes('network error') ||
      normalized.includes('net::err') ||
      normalized.includes('dns lookup')
    );
  }
}
