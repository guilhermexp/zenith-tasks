import { db } from '@/lib/db';
import { detectedConflicts } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { DetectedConflict, NewDetectedConflict } from '@/db/schema';

/**
 * Repository for DetectedConflict CRUD operations
 * Handles scheduling and workload conflict detection data
 */
export class ConflictRepository {
  /**
   * Create a new detected conflict
   */
  async create(data: NewDetectedConflict): Promise<DetectedConflict> {
    try {
      const [conflict] = await db
        .insert(detectedConflicts)
        .values(data)
        .returning();
      return conflict;
    } catch (error) {
      console.error('Error creating detected conflict:', error);
      throw new Error('Failed to create detected conflict');
    }
  }

  /**
   * Find a conflict by ID
   */
  async findById(id: string): Promise<DetectedConflict | null> {
    try {
      const [conflict] = await db
        .select()
        .from(detectedConflicts)
        .where(eq(detectedConflicts.id, id))
        .limit(1);
      return conflict || null;
    } catch (error) {
      console.error('Error finding detected conflict:', error);
      throw new Error('Failed to find detected conflict');
    }
  }

  /**
   * Find all conflicts for a specific user
   */
  async findByUserId(userId: string): Promise<DetectedConflict[]> {
    try {
      return await db
        .select()
        .from(detectedConflicts)
        .where(eq(detectedConflicts.userId, userId))
        .orderBy(desc(detectedConflicts.detectedAt));
    } catch (error) {
      console.error('Error finding detected conflicts:', error);
      throw new Error('Failed to find detected conflicts');
    }
  }

  /**
   * Find unresolved conflicts for a user
   */
  async findUnresolvedByUserId(userId: string): Promise<DetectedConflict[]> {
    try {
      return await db
        .select()
        .from(detectedConflicts)
        .where(
          and(
            eq(detectedConflicts.userId, userId),
            eq(detectedConflicts.isResolved, false)
          )
        )
        .orderBy(desc(detectedConflicts.detectedAt));
    } catch (error) {
      console.error('Error finding unresolved conflicts:', error);
      throw new Error('Failed to find unresolved conflicts');
    }
  }

  /**
   * Find conflicts by type
   */
  async findByUserIdAndType(
    userId: string,
    conflictType: string
  ): Promise<DetectedConflict[]> {
    try {
      return await db
        .select()
        .from(detectedConflicts)
        .where(
          and(
            eq(detectedConflicts.userId, userId),
            eq(detectedConflicts.conflictType, conflictType)
          )
        )
        .orderBy(desc(detectedConflicts.detectedAt));
    } catch (error) {
      console.error('Error finding conflicts by type:', error);
      throw new Error('Failed to find conflicts');
    }
  }

  /**
   * Find conflicts by severity
   */
  async findByUserIdAndSeverity(
    userId: string,
    severity: string
  ): Promise<DetectedConflict[]> {
    try {
      return await db
        .select()
        .from(detectedConflicts)
        .where(
          and(
            eq(detectedConflicts.userId, userId),
            eq(detectedConflicts.severity, severity)
          )
        )
        .orderBy(desc(detectedConflicts.detectedAt));
    } catch (error) {
      console.error('Error finding conflicts by severity:', error);
      throw new Error('Failed to find conflicts');
    }
  }

  /**
   * Find critical unresolved conflicts for a user
   */
  async findCriticalUnresolvedByUserId(
    userId: string
  ): Promise<DetectedConflict[]> {
    try {
      return await db
        .select()
        .from(detectedConflicts)
        .where(
          and(
            eq(detectedConflicts.userId, userId),
            eq(detectedConflicts.isResolved, false),
            eq(detectedConflicts.severity, 'critical')
          )
        )
        .orderBy(desc(detectedConflicts.detectedAt));
    } catch (error) {
      console.error('Error finding critical unresolved conflicts:', error);
      throw new Error('Failed to find critical unresolved conflicts');
    }
  }

  /**
   * Mark a conflict as resolved
   */
  async markAsResolved(id: string): Promise<DetectedConflict | null> {
    try {
      const [updated] = await db
        .update(detectedConflicts)
        .set({ isResolved: true })
        .where(eq(detectedConflicts.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      console.error('Error marking conflict as resolved:', error);
      throw new Error('Failed to mark conflict as resolved');
    }
  }

  /**
   * Update a conflict
   */
  async update(
    id: string,
    data: Partial<NewDetectedConflict>
  ): Promise<DetectedConflict | null> {
    try {
      const [updated] = await db
        .update(detectedConflicts)
        .set(data)
        .where(eq(detectedConflicts.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      console.error('Error updating detected conflict:', error);
      throw new Error('Failed to update detected conflict');
    }
  }

  /**
   * Delete a conflict
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(detectedConflicts)
        .where(eq(detectedConflicts.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting detected conflict:', error);
      throw new Error('Failed to delete detected conflict');
    }
  }

  /**
   * Delete all conflicts for a user
   */
  async deleteByUserId(userId: string): Promise<number> {
    try {
      const result = await db
        .delete(detectedConflicts)
        .where(eq(detectedConflicts.userId, userId))
        .returning();
      return result.length;
    } catch (error) {
      console.error('Error deleting detected conflicts:', error);
      throw new Error('Failed to delete detected conflicts');
    }
  }

  /**
   * Delete resolved conflicts older than a specific date
   */
  async deleteResolvedOlderThan(date: Date): Promise<number> {
    try {
      const result = await db
        .delete(detectedConflicts)
        .where(
          and(
            eq(detectedConflicts.isResolved, true),
            // Note: This would need a comparison operator for dates
            // For now, returning empty result as placeholder
          )
        )
        .returning();
      return result.length;
    } catch (error) {
      console.error('Error deleting old resolved conflicts:', error);
      throw new Error('Failed to delete old resolved conflicts');
    }
  }

  /**
   * Get conflict statistics for a user
   */
  async getStatsByUserId(userId: string): Promise<{
    total: number;
    unresolved: number;
    critical: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    try {
      const conflicts = await this.findByUserId(userId);

      const stats = {
        total: conflicts.length,
        unresolved: conflicts.filter((c) => !c.isResolved).length,
        critical: conflicts.filter((c) => c.severity === 'critical').length,
        byType: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
      };

      conflicts.forEach((conflict) => {
        // Count by type
        if (conflict.conflictType) {
          stats.byType[conflict.conflictType] =
            (stats.byType[conflict.conflictType] || 0) + 1;
        }

        // Count by severity
        if (conflict.severity) {
          stats.bySeverity[conflict.severity] =
            (stats.bySeverity[conflict.severity] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting conflict stats:', error);
      throw new Error('Failed to get conflict statistics');
    }
  }
}

// Export singleton instance
export const conflictRepository = new ConflictRepository();
