-- Add recurrence fields to mind_flow_items table
ALTER TABLE "mind_flow_items" ADD COLUMN IF NOT EXISTS "recurrence_type" text;
ALTER TABLE "mind_flow_items" ADD COLUMN IF NOT EXISTS "recurrence_interval" integer DEFAULT 1;
ALTER TABLE "mind_flow_items" ADD COLUMN IF NOT EXISTS "recurrence_end_date" text;
ALTER TABLE "mind_flow_items" ADD COLUMN IF NOT EXISTS "recurrence_days" text[];
ALTER TABLE "mind_flow_items" ADD COLUMN IF NOT EXISTS "parent_recurrence_id" text;

-- Add comment for documentation
COMMENT ON COLUMN "mind_flow_items"."recurrence_type" IS 'Type of recurrence: daily, weekly, monthly, yearly, custom';
COMMENT ON COLUMN "mind_flow_items"."recurrence_interval" IS 'Interval for recurrence, e.g., every 2 days';
COMMENT ON COLUMN "mind_flow_items"."recurrence_end_date" IS 'End date for recurrence (ISO format)';
COMMENT ON COLUMN "mind_flow_items"."recurrence_days" IS 'For weekly recurrence: array of day keys (mon, tue, wed, etc.)';
COMMENT ON COLUMN "mind_flow_items"."parent_recurrence_id" IS 'ID of the parent item if this is a generated recurring instance';
