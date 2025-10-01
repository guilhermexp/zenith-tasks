/**
 * Data validation and consistency checker
 */

import { createClient } from '@supabase/supabase-js'

import type { MindFlowItem } from '@/types'
import { logger } from '@/utils/logger'

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  fixedIssues: string[]
}

export interface ValidationError {
  type: string
  message: string
  itemId?: string
  field?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface ValidationWarning {
  type: string
  message: string
  itemId?: string
  field?: string
  suggestion?: string
}

export interface DataConsistencyReport {
  totalItems: number
  validItems: number
  invalidItems: number
  orphanedSubtasks: number
  duplicateItems: number
  inconsistentDates: number
  missingRequiredFields: number
  fixableIssues: number
  criticalIssues: number
}

export class DataValidator {
  private static instance: DataValidator
  private supabase: any

  private constructor() {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    }
  }

  static getInstance(): DataValidator {
    if (!DataValidator.instance) {
      DataValidator.instance = new DataValidator()
    }
    return DataValidator.instance
  }

  /**
   * Validate all data in the database
   */
  async validateAllData(): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const fixedIssues: string[] = []

    try {
      // Validate items
      const itemValidation = await this.validateItems()
      errors.push(...itemValidation.errors)
      warnings.push(...itemValidation.warnings)
      fixedIssues.push(...itemValidation.fixedIssues)

      // Validate subtasks
      const subtaskValidation = await this.validateSubtasks()
      errors.push(...subtaskValidation.errors)
      warnings.push(...subtaskValidation.warnings)
      fixedIssues.push(...subtaskValidation.fixedIssues)

      // Check for orphaned records
      const orphanValidation = await this.checkOrphanedRecords()
      errors.push(...orphanValidation.errors)
      warnings.push(...orphanValidation.warnings)
      fixedIssues.push(...orphanValidation.fixedIssues)

      // Check for duplicates
      const duplicateValidation = await this.checkDuplicates()
      errors.push(...duplicateValidation.errors)
      warnings.push(...duplicateValidation.warnings)
      fixedIssues.push(...duplicateValidation.fixedIssues)

      logger.info('[DataValidator] Validation completed', {
        errors: errors.length,
        warnings: warnings.length,
        fixed: fixedIssues.length
      })

      return {
        isValid: errors.filter(e => e.severity === 'critical').length === 0,
        errors,
        warnings,
        fixedIssues
      }
    } catch (error: any) {
      logger.error('[DataValidator] Validation failed', error)
      
      return {
        isValid: false,
        errors: [{
          type: 'validation_error',
          message: `Validation process failed: ${error.message}`,
          severity: 'critical'
        }],
        warnings: [],
        fixedIssues: []
      }
    }
  }

  /**
   * Validate items table
   */
  private async validateItems(): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const fixedIssues: string[] = []

    if (!this.supabase) {
      errors.push({
        type: 'connection_error',
        message: 'Database connection not available',
        severity: 'critical'
      })
      return { isValid: false, errors, warnings, fixedIssues }
    }

    try {
      const { data: items, error } = await this.supabase
        .from('mind_flow_items')
        .select('*')

      if (error) throw error

      for (const item of items || []) {
        const itemErrors = this.validateItem(item)
        errors.push(...itemErrors.errors)
        warnings.push(...itemErrors.warnings)

        // Auto-fix some issues
        const fixes = await this.autoFixItem(item)
        fixedIssues.push(...fixes)
      }

      return { isValid: errors.length === 0, errors, warnings, fixedIssues }
    } catch (error: any) {
      errors.push({
        type: 'query_error',
        message: `Failed to validate items: ${error.message}`,
        severity: 'high'
      })
      return { isValid: false, errors, warnings, fixedIssues }
    }
  }

  /**
   * Validate individual item
   */
  private validateItem(item: any): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Required fields
    if (!item.title || item.title.trim() === '') {
      errors.push({
        type: 'missing_required_field',
        message: 'Item title is required',
        itemId: item.id,
        field: 'title',
        severity: 'high'
      })
    }

    if (!item.item_type) {
      errors.push({
        type: 'missing_required_field',
        message: 'Item type is required',
        itemId: item.id,
        field: 'item_type',
        severity: 'high'
      })
    }

    if (!item.user_id) {
      errors.push({
        type: 'missing_required_field',
        message: 'User ID is required',
        itemId: item.id,
        field: 'user_id',
        severity: 'critical'
      })
    }

    // Valid item types
    const validTypes = ['Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião']
    if (item.item_type && !validTypes.includes(item.item_type)) {
      errors.push({
        type: 'invalid_value',
        message: `Invalid item type: ${item.item_type}`,
        itemId: item.id,
        field: 'item_type',
        severity: 'medium'
      })
    }

    // Date validation
    if (item.due_date_iso) {
      const dueDate = new Date(item.due_date_iso)
      if (isNaN(dueDate.getTime())) {
        errors.push({
          type: 'invalid_date',
          message: 'Invalid due date format',
          itemId: item.id,
          field: 'due_date_iso',
          severity: 'medium'
        })
      }
    }

    if (item.created_at) {
      const createdAt = new Date(item.created_at)
      if (isNaN(createdAt.getTime())) {
        errors.push({
          type: 'invalid_date',
          message: 'Invalid created_at date format',
          itemId: item.id,
          field: 'created_at',
          severity: 'medium'
        })
      }
    }

    // Financial item validation
    if (item.item_type === 'Financeiro') {
      if (item.amount === null || item.amount === undefined) {
        warnings.push({
          type: 'missing_financial_data',
          message: 'Financial item missing amount',
          itemId: item.id,
          field: 'amount',
          suggestion: 'Set amount to 0 if not applicable'
        })
      }

      if (!item.transaction_type) {
        warnings.push({
          type: 'missing_financial_data',
          message: 'Financial item missing transaction type',
          itemId: item.id,
          field: 'transaction_type',
          suggestion: 'Set transaction type to Entrada or Saída'
        })
      }
    }

    // JSON field validation
    if (item.chat_history && typeof item.chat_history === 'string') {
      try {
        JSON.parse(item.chat_history)
      } catch {
        errors.push({
          type: 'invalid_json',
          message: 'Invalid JSON in chat_history field',
          itemId: item.id,
          field: 'chat_history',
          severity: 'medium'
        })
      }
    }

    if (item.meeting_details && typeof item.meeting_details === 'string') {
      try {
        JSON.parse(item.meeting_details)
      } catch {
        errors.push({
          type: 'invalid_json',
          message: 'Invalid JSON in meeting_details field',
          itemId: item.id,
          field: 'meeting_details',
          severity: 'medium'
        })
      }
    }

    // Title length validation
    if (item.title && item.title.length > 500) {
      warnings.push({
        type: 'field_too_long',
        message: 'Item title is very long',
        itemId: item.id,
        field: 'title',
        suggestion: 'Consider shortening the title'
      })
    }

    return { errors, warnings }
  }

  /**
   * Auto-fix common item issues
   */
  private async autoFixItem(item: any): Promise<string[]> {
    const fixes: string[] = []

    if (!this.supabase) return fixes

    const updates: any = {}

    // Fix empty JSON fields
    if (item.chat_history === null) {
      updates.chat_history = []
      fixes.push(`Fixed null chat_history for item ${item.id}`)
    }

    if (item.transcript === null) {
      updates.transcript = []
      fixes.push(`Fixed null transcript for item ${item.id}`)
    }

    // Fix boolean fields
    if (item.completed === null) {
      updates.completed = false
      fixes.push(`Fixed null completed status for item ${item.id}`)
    }

    if (item.is_generating_subtasks === null) {
      updates.is_generating_subtasks = false
      fixes.push(`Fixed null is_generating_subtasks for item ${item.id}`)
    }

    // Fix financial fields for non-financial items
    if (item.item_type !== 'Financeiro') {
      if (item.amount !== null) {
        updates.amount = null
        fixes.push(`Cleared amount for non-financial item ${item.id}`)
      }
      if (item.transaction_type !== null) {
        updates.transaction_type = null
        fixes.push(`Cleared transaction_type for non-financial item ${item.id}`)
      }
    }

    // Apply fixes
    if (Object.keys(updates).length > 0) {
      try {
        const { error } = await this.supabase
          .from('mind_flow_items')
          .update(updates)
          .eq('id', item.id)

        if (error) {
          logger.error('[DataValidator] Failed to apply fixes', error, { itemId: item.id })
        }
      } catch (error: any) {
        logger.error('[DataValidator] Error applying fixes', error, { itemId: item.id })
      }
    }

    return fixes
  }

  /**
   * Validate subtasks
   */
  private async validateSubtasks(): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const fixedIssues: string[] = []

    if (!this.supabase) {
      errors.push({
        type: 'connection_error',
        message: 'Database connection not available',
        severity: 'critical'
      })
      return { isValid: false, errors, warnings, fixedIssues }
    }

    try {
      const { data: subtasks, error } = await this.supabase
        .from('subtasks')
        .select('*')

      if (error) throw error

      for (const subtask of subtasks || []) {
        // Required fields
        if (!subtask.title || subtask.title.trim() === '') {
          errors.push({
            type: 'missing_required_field',
            message: 'Subtask title is required',
            itemId: subtask.id,
            field: 'title',
            severity: 'medium'
          })
        }

        if (!subtask.parent_item_id) {
          errors.push({
            type: 'missing_required_field',
            message: 'Subtask parent_item_id is required',
            itemId: subtask.id,
            field: 'parent_item_id',
            severity: 'high'
          })
        }
      }

      return { isValid: errors.length === 0, errors, warnings, fixedIssues }
    } catch (error: any) {
      errors.push({
        type: 'query_error',
        message: `Failed to validate subtasks: ${error.message}`,
        severity: 'high'
      })
      return { isValid: false, errors, warnings, fixedIssues }
    }
  }

  /**
   * Check for orphaned records
   */
  private async checkOrphanedRecords(): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const fixedIssues: string[] = []

    if (!this.supabase) return { isValid: true, errors, warnings, fixedIssues }

    try {
      // Find orphaned subtasks
      const { data: orphanedSubtasks, error } = await this.supabase
        .from('subtasks')
        .select('id, parent_item_id')
        .not('parent_item_id', 'in', 
          this.supabase
            .from('mind_flow_items')
            .select('id')
        )

      if (error) throw error

      for (const subtask of orphanedSubtasks || []) {
        errors.push({
          type: 'orphaned_record',
          message: `Orphaned subtask found (parent item ${subtask.parent_item_id} does not exist)`,
          itemId: subtask.id,
          severity: 'medium'
        })

        // Auto-fix: delete orphaned subtasks
        try {
          await this.supabase
            .from('subtasks')
            .delete()
            .eq('id', subtask.id)

          fixedIssues.push(`Deleted orphaned subtask ${subtask.id}`)
        } catch (deleteError: any) {
          logger.error('[DataValidator] Failed to delete orphaned subtask', deleteError)
        }
      }

      return { isValid: errors.length === 0, errors, warnings, fixedIssues }
    } catch (error: any) {
      errors.push({
        type: 'query_error',
        message: `Failed to check orphaned records: ${error.message}`,
        severity: 'medium'
      })
      return { isValid: false, errors, warnings, fixedIssues }
    }
  }

  /**
   * Check for duplicate items
   */
  private async checkDuplicates(): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const fixedIssues: string[] = []

    if (!this.supabase) return { isValid: true, errors, warnings, fixedIssues }

    try {
      // Find potential duplicates (same title, type, and user within 1 minute)
      const { data: duplicates, error } = await this.supabase
        .rpc('find_duplicate_items')

      if (error && !error.message.includes('function')) {
        throw error
      }

      // If the function doesn't exist, do a basic check
      if (error?.message.includes('function')) {
        const { data: items } = await this.supabase
          .from('mind_flow_items')
          .select('id, title, item_type, user_id, created_at')
          .order('created_at', { ascending: false })

        const seen = new Map()
        for (const item of items || []) {
          const key = `${item.user_id}-${item.title}-${item.item_type}`
          if (seen.has(key)) {
            const existing = seen.get(key)
            const timeDiff = new Date(item.created_at).getTime() - new Date(existing.created_at).getTime()
            
            if (Math.abs(timeDiff) < 60000) { // Within 1 minute
              warnings.push({
                type: 'potential_duplicate',
                message: `Potential duplicate item found`,
                itemId: item.id,
                suggestion: `Similar to item ${existing.id} created at similar time`
              })
            }
          } else {
            seen.set(key, item)
          }
        }
      }

      return { isValid: true, errors, warnings, fixedIssues }
    } catch (error: any) {
      warnings.push({
        type: 'check_failed',
        message: `Could not check for duplicates: ${error.message}`,
        suggestion: 'Manual review recommended'
      })
      return { isValid: true, errors, warnings, fixedIssues }
    }
  }

  /**
   * Generate data consistency report
   */
  async generateConsistencyReport(): Promise<DataConsistencyReport> {
    const validation = await this.validateAllData()

    const totalItems = await this.getItemCount()
    const validItems = totalItems - validation.errors.filter(e => e.itemId).length
    const invalidItems = validation.errors.filter(e => e.itemId).length

    const orphanedSubtasks = validation.errors.filter(e => e.type === 'orphaned_record').length
    const duplicateItems = validation.warnings.filter(w => w.type === 'potential_duplicate').length
    const inconsistentDates = validation.errors.filter(e => e.type === 'invalid_date').length
    const missingRequiredFields = validation.errors.filter(e => e.type === 'missing_required_field').length

    const fixableIssues = validation.errors.filter(e => 
      ['invalid_json', 'missing_financial_data', 'orphaned_record'].includes(e.type)
    ).length

    const criticalIssues = validation.errors.filter(e => e.severity === 'critical').length

    return {
      totalItems,
      validItems,
      invalidItems,
      orphanedSubtasks,
      duplicateItems,
      inconsistentDates,
      missingRequiredFields,
      fixableIssues,
      criticalIssues
    }
  }

  /**
   * Get total item count
   */
  private async getItemCount(): Promise<number> {
    if (!this.supabase) return 0

    try {
      const { count, error } = await this.supabase
        .from('mind_flow_items')
        .select('*', { count: 'exact', head: true })

      if (error) throw error
      return count || 0
    } catch (error: any) {
      logger.error('[DataValidator] Failed to get item count', error)
      return 0
    }
  }

  /**
   * Fix all auto-fixable issues
   */
  async fixAllIssues(): Promise<{ fixed: string[]; failed: string[] }> {
    const validation = await this.validateAllData()
    const fixed: string[] = [...validation.fixedIssues]
    const failed: string[] = []

    // Additional fixes can be implemented here
    logger.info('[DataValidator] Auto-fix completed', {
      fixed: fixed.length,
      failed: failed.length
    })

    return { fixed, failed }
  }
}

// Export singleton instance
export const dataValidator = DataValidator.getInstance()