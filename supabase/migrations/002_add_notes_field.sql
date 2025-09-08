-- Add notes field to mind_flow_items table
ALTER TABLE mind_flow_items 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Optional: Add index for notes field if needed for search
-- CREATE INDEX idx_mind_flow_items_notes ON mind_flow_items USING gin(to_tsvector('portuguese', notes));