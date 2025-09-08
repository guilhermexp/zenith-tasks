import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export type Database = {
  public: {
    Tables: {
      mind_flow_items: {
        Row: {
          id: string
          user_id: string
          title: string
          completed: boolean
          created_at: string
          updated_at: string
          summary: string | null
          item_type: 'Tarefa' | 'Ideia' | 'Nota' | 'Lembrete' | 'Financeiro' | 'Reunião'
          due_date: string | null
          due_date_iso: string | null
          suggestions: string[] | null
          is_generating_subtasks: boolean
          transaction_type: 'Entrada' | 'Saída' | null
          amount: number | null
          is_recurring: boolean
          payment_method: string | null
          is_paid: boolean
          chat_history: any[]
          meeting_details: any | null
          transcript: any[]
        }
        Insert: Omit<Database['public']['Tables']['mind_flow_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['mind_flow_items']['Insert']>
      }
      subtasks: {
        Row: {
          id: string
          parent_item_id: string
          title: string
          completed: boolean
          created_at: string
          position: number
        }
        Insert: Omit<Database['public']['Tables']['subtasks']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['subtasks']['Insert']>
      }
      mcp_server_configs: {
        Row: {
          id: string
          user_id: string
          name: string
          base_url: string
          api_key: string | null
          headers_json: string
          tools_path: string
          call_path: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['mcp_server_configs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['mcp_server_configs']['Insert']>
      }
    }
  }
}