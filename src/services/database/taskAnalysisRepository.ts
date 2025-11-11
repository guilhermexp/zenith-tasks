import { db } from '@/lib/db';
import { taskAnalyses } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { TaskAnalysis, NewTaskAnalysis } from '@/db/schema';

/**
 * Repository for TaskAnalysis CRUD operations
 * Handles AI prioritization analysis data for tasks
 */
export class TaskAnalysisRepository {
  /**
   * Create a new task analysis
   */
  async create(data: NewTaskAnalysis): Promise<TaskAnalysis> {
    try {
      const [analysis] = await db.insert(taskAnalyses).values(data).returning();
      return analysis;
    } catch (error) {
      console.error('Error creating task analysis:', error);
      throw new Error('Failed to create task analysis');
    }
  }

  /**
   * Find a task analysis by ID
   */
  async findById(id: string): Promise<TaskAnalysis | null> {
    try {
      const [analysis] = await db
        .select()
        .from(taskAnalyses)
        .where(eq(taskAnalyses.id, id))
        .limit(1);
      return analysis || null;
    } catch (error) {
      console.error('Error finding task analysis:', error);
      throw new Error('Failed to find task analysis');
    }
  }

  /**
   * Find all analyses for a specific task
   */
  async findByTaskId(taskId: string): Promise<TaskAnalysis[]> {
    try {
      return await db
        .select()
        .from(taskAnalyses)
        .where(eq(taskAnalyses.taskId, taskId))
        .orderBy(desc(taskAnalyses.createdAt));
    } catch (error) {
      console.error('Error finding task analyses by task ID:', error);
      throw new Error('Failed to find task analyses');
    }
  }

  /**
   * Find all analyses for a specific user
   */
  async findByUserId(userId: string): Promise<TaskAnalysis[]> {
    try {
      return await db
        .select()
        .from(taskAnalyses)
        .where(eq(taskAnalyses.userId, userId))
        .orderBy(desc(taskAnalyses.createdAt));
    } catch (error) {
      console.error('Error finding task analyses by user ID:', error);
      throw new Error('Failed to find task analyses');
    }
  }

  /**
   * Find the latest analysis for a specific task
   */
  async findLatestByTaskId(taskId: string): Promise<TaskAnalysis | null> {
    try {
      const [analysis] = await db
        .select()
        .from(taskAnalyses)
        .where(eq(taskAnalyses.taskId, taskId))
        .orderBy(desc(taskAnalyses.createdAt))
        .limit(1);
      return analysis || null;
    } catch (error) {
      console.error('Error finding latest task analysis:', error);
      throw new Error('Failed to find latest task analysis');
    }
  }

  /**
   * Find all analyses for a user's tasks
   */
  async findByUserIdAndTaskId(
    userId: string,
    taskId: string
  ): Promise<TaskAnalysis[]> {
    try {
      return await db
        .select()
        .from(taskAnalyses)
        .where(
          and(eq(taskAnalyses.userId, userId), eq(taskAnalyses.taskId, taskId))
        )
        .orderBy(desc(taskAnalyses.createdAt));
    } catch (error) {
      console.error('Error finding task analyses by user and task ID:', error);
      throw new Error('Failed to find task analyses');
    }
  }

  /**
   * Update a task analysis
   */
  async update(
    id: string,
    data: Partial<NewTaskAnalysis>
  ): Promise<TaskAnalysis | null> {
    try {
      const [updated] = await db
        .update(taskAnalyses)
        .set(data)
        .where(eq(taskAnalyses.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      console.error('Error updating task analysis:', error);
      throw new Error('Failed to update task analysis');
    }
  }

  /**
   * Delete a task analysis
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(taskAnalyses)
        .where(eq(taskAnalyses.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting task analysis:', error);
      throw new Error('Failed to delete task analysis');
    }
  }

  /**
   * Delete all analyses for a specific task
   */
  async deleteByTaskId(taskId: string): Promise<number> {
    try {
      const result = await db
        .delete(taskAnalyses)
        .where(eq(taskAnalyses.taskId, taskId))
        .returning();
      return result.length;
    } catch (error) {
      console.error('Error deleting task analyses by task ID:', error);
      throw new Error('Failed to delete task analyses');
    }
  }

  /**
   * Delete all analyses for a specific user
   */
  async deleteByUserId(userId: string): Promise<number> {
    try {
      const result = await db
        .delete(taskAnalyses)
        .where(eq(taskAnalyses.userId, userId))
        .returning();
      return result.length;
    } catch (error) {
      console.error('Error deleting task analyses by user ID:', error);
      throw new Error('Failed to delete task analyses');
    }
  }
}

// Export singleton instance
export const taskAnalysisRepository = new TaskAnalysisRepository();
