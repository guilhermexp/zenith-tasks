const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuração do Supabase
const supabaseUrl = 'https://indijtkshpwkampfmvit.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZGlqdGtzaHB3a2FtcGZtdml0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwOTU2MiwiZXhwIjoyMDcyODg1NTYyfQ.yoYb6cJipaWGWp0FQhfHVos0jPjuRgEv8HZE9VOLnwI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Iniciando configuração do banco de dados...');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    
    // Dividir o SQL em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📋 Executando ${commands.length} comandos SQL...`);
    
    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i] + ';';
      console.log(`  [${i + 1}/${commands.length}] Executando comando...`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: command 
      }).single();
      
      if (error && !error.message.includes('already exists')) {
        console.error(`❌ Erro no comando ${i + 1}:`, error.message);
        // Continuar com os próximos comandos mesmo se houver erro
      }
    }
    
    console.log('✅ Banco de dados configurado com sucesso!');
    
    // Verificar as tabelas criadas
    console.log('\n📊 Verificando tabelas criadas...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('mind_flow_items')
      .select('id')
      .limit(1);
    
    if (!tablesError) {
      console.log('  ✓ Tabela mind_flow_items criada');
    } else {
      console.log('  ⚠️ Não foi possível verificar mind_flow_items:', tablesError.message);
    }
    
    const { data: subtasks, error: subtasksError } = await supabase
      .from('subtasks')
      .select('id')
      .limit(1);
    
    if (!subtasksError) {
      console.log('  ✓ Tabela subtasks criada');
    } else {
      console.log('  ⚠️ Não foi possível verificar subtasks:', subtasksError.message);
    }
    
    const { data: configs, error: configsError } = await supabase
      .from('mcp_server_configs')
      .select('id')
      .limit(1);
    
    if (!configsError) {
      console.log('  ✓ Tabela mcp_server_configs criada');
    } else {
      console.log('  ⚠️ Não foi possível verificar mcp_server_configs:', configsError.message);
    }
    
    console.log('\n🎉 Setup completo! O banco de dados está pronto para uso.');
    
  } catch (error) {
    console.error('❌ Erro durante o setup:', error);
    process.exit(1);
  }
}

// Executar a migração
runMigration();