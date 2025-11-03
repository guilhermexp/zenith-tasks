import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import type { MindFlowItem, Subtask } from '@/types'

type DBItem = Database['public']['Tables']['mind_flow_items']['Row']
type DBSubtask = Database['public']['Tables']['subtasks']['Row']

export class ItemsService {
  /**
   * Load all items for a specific user
   */
  static async loadItems(userId: string): Promise<MindFlowItem[]> {
    // Se Supabase não configurado, retorna vazio (app usa localStorage)
    if (!isSupabaseConfigured) {
      console.log('[ItemsService] Supabase não configurado, usando localStorage')
      return []
    }

    try {
      const { data, error } = await supabase!
        .from('mind_flow_items')
        .select(`
          *,
          subtasks (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading items:', error)
        throw error
      }

      return (data || []).map(this.mapToMindFlowItem)
    } catch (error) {
      console.error('Failed to load items:', error)
      return []
    }
  }

  /**
   * Create a new item
   */
  static async createItem(userId: string, item: Omit<MindFlowItem, 'id' | 'createdAt'>): Promise<MindFlowItem> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado')
    }

    try {
      // First create the main item
      const { data: newItem, error } = await supabase!
        .from('mind_flow_items')
        .insert({
          user_id: userId,
          title: item.title,
          item_type: item.type,
          completed: item.completed || false,
          summary: item.summary,
          due_date: item.dueDate,
          due_date_iso: item.dueDateISO,
          suggestions: item.suggestions,
          transaction_type: item.transactionType,
          amount: item.amount,
          is_recurring: item.isRecurring,
          payment_method: item.paymentMethod,
          is_paid: item.isPaid,
          chat_history: item.chatHistory || [],
          notes: item.notes
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating item:', error)
        throw error
      }

      // Create subtasks if they exist
      if (item.subtasks && item.subtasks.length > 0) {
        await this.createSubtasks(newItem.id, item.subtasks)
      }

      // Return the complete item with subtasks
      return this.mapToMindFlowItem({ ...newItem, subtasks: item.subtasks || [] })
    } catch (error) {
      console.error('Failed to create item:', error)
      throw error
    }
  }

  /**
   * Update an existing item
   */
  static async updateItem(itemId: string, updates: Partial<MindFlowItem>): Promise<void> {
    try {
      const updateData: any = {}
      
      // Map fields that exist in updates
      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.completed !== undefined) updateData.completed = updates.completed
      if (updates.summary !== undefined) updateData.summary = updates.summary
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate
      if (updates.dueDateISO !== undefined) updateData.due_date_iso = updates.dueDateISO
      if (updates.suggestions !== undefined) updateData.suggestions = updates.suggestions
      if (updates.isGeneratingSubtasks !== undefined) updateData.is_generating_subtasks = updates.isGeneratingSubtasks
      if (updates.transactionType !== undefined) updateData.transaction_type = updates.transactionType
      if (updates.amount !== undefined) updateData.amount = updates.amount
      if (updates.isRecurring !== undefined) updateData.is_recurring = updates.isRecurring
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod
      if (updates.isPaid !== undefined) updateData.is_paid = updates.isPaid
      if (updates.chatHistory !== undefined) updateData.chat_history = updates.chatHistory
      if (updates.notes !== undefined) updateData.notes = updates.notes

      const { error } = await supabase!
        .from('mind_flow_items')
        .update(updateData)
        .eq('id', itemId)

      if (error) {
        console.error('Error updating item:', error)
        throw error
      }

      // Handle subtasks update if provided
      if (updates.subtasks !== undefined) {
        // Delete existing subtasks
        await supabase!
          .from('subtasks')
          .delete()
          .eq('parent_item_id', itemId)

        // Create new subtasks
        if (updates.subtasks.length > 0) {
          await this.createSubtasks(itemId, updates.subtasks)
        }
      }
    } catch (error) {
      console.error('Failed to update item:', error)
      throw error
    }
  }

  /**
   * Delete an item
   */
  static async deleteItem(itemId: string): Promise<void> {
    try {
      const { error } = await supabase!
        .from('mind_flow_items')
        .delete()
        .eq('id', itemId)

      if (error) {
        console.error('Error deleting item:', error)
        throw error
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
      throw error
    }
  }

  /**
   * Toggle item completion status
   */
  static async toggleItem(itemId: string): Promise<void> {
    try {
      // First get current status
      const { data: item, error: fetchError } = await supabase!
        .from('mind_flow_items')
        .select('completed')
        .eq('id', itemId)
        .single()

      if (fetchError) {
        console.error('Error fetching item:', fetchError)
        throw fetchError
      }

      // Update with toggled status
      const { error } = await supabase!
        .from('mind_flow_items')
        .update({ completed: !item.completed })
        .eq('id', itemId)

      if (error) {
        console.error('Error toggling item:', error)
        throw error
      }
    } catch (error) {
      console.error('Failed to toggle item:', error)
      throw error
    }
  }

  /**
   * Clear all completed items for a user
   */
  static async clearCompleted(userId: string): Promise<void> {
    try {
      const { error } = await supabase!
        .from('mind_flow_items')
        .delete()
        .eq('user_id', userId)
        .eq('completed', true)

      if (error) {
        console.error('Error clearing completed items:', error)
        throw error
      }
    } catch (error) {
      console.error('Failed to clear completed items:', error)
      throw error
    }
  }

  /**
   * Create subtasks for an item
   */
  private static async createSubtasks(parentItemId: string, subtasks: Subtask[]): Promise<void> {
    try {
      const subtasksToInsert = subtasks.map((subtask, index) => ({
        parent_item_id: parentItemId,
        title: subtask.title,
        completed: subtask.completed || false,
        position: index
      }))

      const { error } = await supabase!
        .from('subtasks')
        .insert(subtasksToInsert)

      if (error) {
        console.error('Error creating subtasks:', error)
        throw error
      }
    } catch (error) {
      console.error('Failed to create subtasks:', error)
      throw error
    }
  }

  /**
   * Map database item to MindFlowItem type
   */
  private static mapToMindFlowItem(data: any): MindFlowItem {
    return {
      id: data.id,
      title: data.title,
      completed: data.completed || false,
      createdAt: data.created_at,
      summary: data.summary,
      type: data.item_type,
      dueDate: data.due_date,
      dueDateISO: data.due_date_iso,
      subtasks: data.subtasks?.sort((a: any, b: any) => a.position - b.position).map((s: any) => ({
        id: s.id,
        title: s.title,
        completed: s.completed,
        createdAt: s.created_at
      })) || [],
      suggestions: data.suggestions,
      isGeneratingSubtasks: data.is_generating_subtasks,
      chatHistory: data.chat_history,
      transactionType: data.transaction_type,
      amount: data.amount,
      isRecurring: data.is_recurring,
      paymentMethod: data.payment_method,
      isPaid: data.is_paid,
      notes: data.notes
    }
  }

  /**
   * Set due date for an item
   */
  static async setDueDate(itemId: string, date: Date | null): Promise<void> {
    try {
      const updateData: any = {}
      
      if (date) {
        updateData.due_date = date.toLocaleDateString('pt-BR')
        updateData.due_date_iso = date.toISOString()
      } else {
        updateData.due_date = null
        updateData.due_date_iso = null
      }

      const { error } = await supabase!
        .from('mind_flow_items')
        .update(updateData)
        .eq('id', itemId)

      if (error) {
        console.error('Error setting due date:', error)
        throw error
      }
    } catch (error) {
      console.error('Failed to set due date:', error)
      throw error
    }
  }
}