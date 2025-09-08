-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create main items table
CREATE TABLE IF NOT EXISTS mind_flow_items (
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
  
  -- Financial fields
  transaction_type TEXT CHECK (transaction_type IN ('Entrada', 'Saída')),
  amount DECIMAL(10, 2),
  is_recurring BOOLEAN DEFAULT FALSE,
  payment_method TEXT,
  is_paid BOOLEAN DEFAULT FALSE,
  
  -- JSON fields for complex structures
  chat_history JSONB DEFAULT '[]'::JSONB,
  meeting_details JSONB,
  transcript JSONB DEFAULT '[]'::JSONB,
  notes TEXT
);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_item_id UUID NOT NULL REFERENCES mind_flow_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  position INTEGER NOT NULL DEFAULT 0
);

-- Create MCP server configurations table
CREATE TABLE IF NOT EXISTS mcp_server_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT,
  headers_json TEXT DEFAULT '{}',
  tools_path TEXT DEFAULT '/tools',
  call_path TEXT DEFAULT '/call',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mind_flow_items_user_id ON mind_flow_items(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_flow_items_created_at ON mind_flow_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mind_flow_items_type ON mind_flow_items(item_type);
CREATE INDEX IF NOT EXISTS idx_mind_flow_items_completed ON mind_flow_items(completed);
CREATE INDEX IF NOT EXISTS idx_subtasks_parent_id ON subtasks(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_mcp_configs_user_id ON mcp_server_configs(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_mind_flow_items_updated_at 
  BEFORE UPDATE ON mind_flow_items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE mind_flow_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for mind_flow_items
CREATE POLICY "Users can view their own items" ON mind_flow_items
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can create their own items" ON mind_flow_items
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own items" ON mind_flow_items
  FOR UPDATE USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own items" ON mind_flow_items
  FOR DELETE USING (user_id = current_setting('app.current_user_id', true));

-- Create RLS policies for subtasks
CREATE POLICY "Users can view subtasks of their items" ON subtasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mind_flow_items 
      WHERE id = parent_item_id 
      AND user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "Users can create subtasks for their items" ON subtasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM mind_flow_items 
      WHERE id = parent_item_id 
      AND user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "Users can update subtasks of their items" ON subtasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM mind_flow_items 
      WHERE id = parent_item_id 
      AND user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "Users can delete subtasks of their items" ON subtasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM mind_flow_items 
      WHERE id = parent_item_id 
      AND user_id = current_setting('app.current_user_id', true)
    )
  );

-- Create RLS policies for mcp_server_configs
CREATE POLICY "Users can view their own MCP configs" ON mcp_server_configs
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can create their own MCP configs" ON mcp_server_configs
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own MCP configs" ON mcp_server_configs
  FOR UPDATE USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own MCP configs" ON mcp_server_configs
  FOR DELETE USING (user_id = current_setting('app.current_user_id', true));