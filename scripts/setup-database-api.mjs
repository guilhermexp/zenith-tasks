import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://indijtkshpwkampfmvit.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZGlqdGtzaHB3a2FtcGZtdml0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwOTU2MiwiZXhwIjoyMDcyODg1NTYyfQ.yoYb6cJipaWGWp0FQhfHVos0jPjuRgEv8HZE9VOLnwI';

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return true;
}

async function setupDatabase() {
  console.log('🚀 Configurando banco de dados Supabase...\n');

  try {
    // Comandos SQL separados para melhor controle
    const sqlCommands = [
      // Extensão UUID
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
      
      // Tabela principal
      `CREATE TABLE IF NOT EXISTS mind_flow_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        summary TEXT,
        item_type TEXT NOT NULL CHECK (item_type IN ('Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião')),
        due_date TEXT,
        due_date_iso TIMESTAMPTZ,
        suggestions TEXT[],
        is_generating_subtasks BOOLEAN DEFAULT FALSE,
        transaction_type TEXT CHECK (transaction_type IN ('Entrada', 'Saída')),
        amount DECIMAL(10, 2),
        is_recurring BOOLEAN DEFAULT FALSE,
        payment_method TEXT,
        is_paid BOOLEAN DEFAULT FALSE,
        chat_history JSONB DEFAULT '[]'::JSONB,
        meeting_details JSONB,
        transcript JSONB DEFAULT '[]'::JSONB
      )`,
      
      // Tabela de subtarefas
      `CREATE TABLE IF NOT EXISTS subtasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parent_item_id UUID NOT NULL REFERENCES mind_flow_items(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        position INTEGER NOT NULL DEFAULT 0
      )`,
      
      // Tabela de configurações MCP
      `CREATE TABLE IF NOT EXISTS mcp_server_configs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        base_url TEXT NOT NULL,
        api_key TEXT,
        headers_json TEXT DEFAULT '{}',
        tools_path TEXT DEFAULT '/tools',
        call_path TEXT DEFAULT '/call',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // Índices
      `CREATE INDEX IF NOT EXISTS idx_mind_flow_items_user_id ON mind_flow_items(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_mind_flow_items_created_at ON mind_flow_items(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_mind_flow_items_type ON mind_flow_items(item_type)`,
      `CREATE INDEX IF NOT EXISTS idx_subtasks_parent_id ON subtasks(parent_item_id)`,
      
      // Trigger para updated_at
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`,
      
      `DROP TRIGGER IF EXISTS update_mind_flow_items_updated_at ON mind_flow_items`,
      
      `CREATE TRIGGER update_mind_flow_items_updated_at 
        BEFORE UPDATE ON mind_flow_items 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()`,
      
      // RLS
      `ALTER TABLE mind_flow_items ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE mcp_server_configs ENABLE ROW LEVEL SECURITY`
    ];

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      const commandPreview = command.substring(0, 50).replace(/\n/g, ' ') + '...';
      
      try {
        process.stdout.write(`[${i + 1}/${sqlCommands.length}] ${commandPreview}`);
        await executeSql(command);
        console.log(' ✅');
        successCount++;
      } catch (error) {
        console.log(' ❌');
        console.log(`  Erro: ${error.message}`);
        errorCount++;
        
        // Se for erro crítico, parar
        if (error.message.includes('relation') && !error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    console.log(`\n📊 Resumo: ${successCount} comandos executados com sucesso, ${errorCount} erros`);
    
    if (errorCount === 0) {
      console.log('✅ Banco de dados configurado com sucesso!');
    } else {
      console.log('⚠️ Banco de dados configurado com alguns avisos. Verifique os erros acima.');
    }

  } catch (error) {
    console.error('\n❌ Erro crítico durante configuração:', error.message);
    process.exit(1);
  }
}

// Executar
console.log('='.repeat(60));
console.log('ZENITH TASKS - SETUP DO BANCO DE DADOS');
console.log('='.repeat(60));
setupDatabase();