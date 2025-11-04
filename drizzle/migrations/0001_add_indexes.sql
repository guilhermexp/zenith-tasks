CREATE INDEX IF NOT EXISTS idx_mind_flow_items_user_id ON mind_flow_items (user_id);
CREATE INDEX IF NOT EXISTS idx_mind_flow_items_created_at ON mind_flow_items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mind_flow_items_item_type ON mind_flow_items (item_type);
CREATE INDEX IF NOT EXISTS idx_subtasks_parent_item_id ON subtasks (parent_item_id);
CREATE INDEX IF NOT EXISTS idx_mcp_server_configs_user_id ON mcp_server_configs (user_id);
