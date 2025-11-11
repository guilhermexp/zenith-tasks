import { db } from '@/lib/db';
import { userPerformancePatterns, patternSuggestions } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type {
  UserPerformancePattern,
  NewUserPerformancePattern,
  PatternSuggestion,
  NewPatternSuggestion,
} from '@/db/schema';

/**
 * Repository for UserPerformancePattern CRUD operations
 * Handles user behavioral patterns for AI analysis
 */
export class UserPerformancePatternRepository {
  /**
   * Create a new performance pattern
   */
  async create(
    data: NewUserPerformancePattern
  ): Promise<UserPerformancePattern> {
    try {
      const [pattern] = await db
        .insert(userPerformancePatterns)
        .values(data)
        .returning();
      return pattern;
    } catch (error) {
      console.error('Error creating performance pattern:', error);
      throw new Error('Failed to create performance pattern');
    }
  }

  /**
   * Find a pattern by ID
   */
  async findById(id: string): Promise<UserPerformancePattern | null> {
    try {
      const [pattern] = await db
        .select()
        .from(userPerformancePatterns)
        .where(eq(userPerformancePatterns.id, id))
        .limit(1);
      return pattern || null;
    } catch (error) {
      console.error('Error finding performance pattern:', error);
      throw new Error('Failed to find performance pattern');
    }
  }

  /**
   * Find all patterns for a specific user
   */
  async findByUserId(userId: string): Promise<UserPerformancePattern[]> {
    try {
      return await db
        .select()
        .from(userPerformancePatterns)
        .where(eq(userPerformancePatterns.userId, userId))
        .orderBy(desc(userPerformancePatterns.lastUpdated));
    } catch (error) {
      console.error('Error finding performance patterns:', error);
      throw new Error('Failed to find performance patterns');
    }
  }

  /**
   * Find patterns by user and type
   */
  async findByUserIdAndType(
    userId: string,
    patternType: string
  ): Promise<UserPerformancePattern[]> {
    try {
      return await db
        .select()
        .from(userPerformancePatterns)
        .where(
          and(
            eq(userPerformancePatterns.userId, userId),
            eq(userPerformancePatterns.patternType, patternType)
          )
        )
        .orderBy(desc(userPerformancePatterns.lastUpdated));
    } catch (error) {
      console.error('Error finding performance patterns by type:', error);
      throw new Error('Failed to find performance patterns');
    }
  }

  /**
   * Update a performance pattern
   */
  async update(
    id: string,
    data: Partial<NewUserPerformancePattern>
  ): Promise<UserPerformancePattern | null> {
    try {
      const [updated] = await db
        .update(userPerformancePatterns)
        .set({ ...data, lastUpdated: new Date() })
        .where(eq(userPerformancePatterns.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      console.error('Error updating performance pattern:', error);
      throw new Error('Failed to update performance pattern');
    }
  }

  /**
   * Upsert (update or insert) a pattern by user and type
   */
  async upsertByUserAndType(
    userId: string,
    patternType: string,
    data: NewUserPerformancePattern
  ): Promise<UserPerformancePattern> {
    try {
      // Check if pattern exists
      const existing = await db
        .select()
        .from(userPerformancePatterns)
        .where(
          and(
            eq(userPerformancePatterns.userId, userId),
            eq(userPerformancePatterns.patternType, patternType)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        const [updated] = await db
          .update(userPerformancePatterns)
          .set({ ...data, lastUpdated: new Date() })
          .where(eq(userPerformancePatterns.id, existing[0].id))
          .returning();
        return updated;
      } else {
        // Create new
        return await this.create(data);
      }
    } catch (error) {
      console.error('Error upserting performance pattern:', error);
      throw new Error('Failed to upsert performance pattern');
    }
  }

  /**
   * Delete a performance pattern
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(userPerformancePatterns)
        .where(eq(userPerformancePatterns.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting performance pattern:', error);
      throw new Error('Failed to delete performance pattern');
    }
  }

  /**
   * Delete all patterns for a user
   */
  async deleteByUserId(userId: string): Promise<number> {
    try {
      const result = await db
        .delete(userPerformancePatterns)
        .where(eq(userPerformancePatterns.userId, userId))
        .returning();
      return result.length;
    } catch (error) {
      console.error('Error deleting performance patterns:', error);
      throw new Error('Failed to delete performance patterns');
    }
  }
}

/**
 * Repository for PatternSuggestion CRUD operations
 * Handles AI-generated suggestions based on detected patterns
 */
export class PatternSuggestionRepository {
  /**
   * Create a new pattern suggestion
   */
  async create(data: NewPatternSuggestion): Promise<PatternSuggestion> {
    try {
      const [suggestion] = await db
        .insert(patternSuggestions)
        .values(data)
        .returning();
      return suggestion;
    } catch (error) {
      console.error('Error creating pattern suggestion:', error);
      throw new Error('Failed to create pattern suggestion');
    }
  }

  /**
   * Find a suggestion by ID
   */
  async findById(id: string): Promise<PatternSuggestion | null> {
    try {
      const [suggestion] = await db
        .select()
        .from(patternSuggestions)
        .where(eq(patternSuggestions.id, id))
        .limit(1);
      return suggestion || null;
    } catch (error) {
      console.error('Error finding pattern suggestion:', error);
      throw new Error('Failed to find pattern suggestion');
    }
  }

  /**
   * Find all suggestions for a user
   */
  async findByUserId(userId: string): Promise<PatternSuggestion[]> {
    try {
      return await db
        .select()
        .from(patternSuggestions)
        .where(eq(patternSuggestions.userId, userId))
        .orderBy(desc(patternSuggestions.createdAt));
    } catch (error) {
      console.error('Error finding pattern suggestions:', error);
      throw new Error('Failed to find pattern suggestions');
    }
  }

  /**
   * Find active (not accepted/dismissed) suggestions for a user
   */
  async findActiveByUserId(userId: string): Promise<PatternSuggestion[]> {
    try {
      return await db
        .select()
        .from(patternSuggestions)
        .where(
          and(
            eq(patternSuggestions.userId, userId),
            eq(patternSuggestions.isAccepted, false),
            eq(patternSuggestions.isDismissed, false)
          )
        )
        .orderBy(desc(patternSuggestions.createdAt));
    } catch (error) {
      console.error('Error finding active pattern suggestions:', error);
      throw new Error('Failed to find active pattern suggestions');
    }
  }

  /**
   * Find suggestions by type
   */
  async findByUserIdAndType(
    userId: string,
    suggestionType: string
  ): Promise<PatternSuggestion[]> {
    try {
      return await db
        .select()
        .from(patternSuggestions)
        .where(
          and(
            eq(patternSuggestions.userId, userId),
            eq(patternSuggestions.suggestionType, suggestionType)
          )
        )
        .orderBy(desc(patternSuggestions.createdAt));
    } catch (error) {
      console.error('Error finding pattern suggestions by type:', error);
      throw new Error('Failed to find pattern suggestions');
    }
  }

  /**
   * Mark a suggestion as accepted
   */
  async markAsAccepted(id: string): Promise<PatternSuggestion | null> {
    try {
      const [updated] = await db
        .update(patternSuggestions)
        .set({ isAccepted: true })
        .where(eq(patternSuggestions.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      console.error('Error marking suggestion as accepted:', error);
      throw new Error('Failed to mark suggestion as accepted');
    }
  }

  /**
   * Mark a suggestion as dismissed
   */
  async markAsDismissed(id: string): Promise<PatternSuggestion | null> {
    try {
      const [updated] = await db
        .update(patternSuggestions)
        .set({ isDismissed: true })
        .where(eq(patternSuggestions.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      console.error('Error marking suggestion as dismissed:', error);
      throw new Error('Failed to mark suggestion as dismissed');
    }
  }

  /**
   * Update a suggestion
   */
  async update(
    id: string,
    data: Partial<NewPatternSuggestion>
  ): Promise<PatternSuggestion | null> {
    try {
      const [updated] = await db
        .update(patternSuggestions)
        .set(data)
        .where(eq(patternSuggestions.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      console.error('Error updating pattern suggestion:', error);
      throw new Error('Failed to update pattern suggestion');
    }
  }

  /**
   * Delete a suggestion
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(patternSuggestions)
        .where(eq(patternSuggestions.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting pattern suggestion:', error);
      throw new Error('Failed to delete pattern suggestion');
    }
  }

  /**
   * Delete all suggestions for a user
   */
  async deleteByUserId(userId: string): Promise<number> {
    try {
      const result = await db
        .delete(patternSuggestions)
        .where(eq(patternSuggestions.userId, userId))
        .returning();
      return result.length;
    } catch (error) {
      console.error('Error deleting pattern suggestions:', error);
      throw new Error('Failed to delete pattern suggestions');
    }
  }
}

// Export singleton instances
export const userPerformancePatternRepository =
  new UserPerformancePatternRepository();
export const patternSuggestionRepository = new PatternSuggestionRepository();
