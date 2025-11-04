CREATE TABLE "mcp_server_configs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"api_key" text,
	"headers_json" text NOT NULL,
	"tools_path" text NOT NULL,
	"call_path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mind_flow_items" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"summary" text,
	"item_type" text NOT NULL,
	"due_date" text,
	"due_date_iso" text,
	"suggestions" text[],
	"is_generating_subtasks" boolean DEFAULT false,
	"transaction_type" text,
	"amount" numeric,
	"is_recurring" boolean DEFAULT false,
	"payment_method" text,
	"is_paid" boolean DEFAULT false,
	"chat_history" jsonb DEFAULT '[]'::jsonb,
	"meeting_details" jsonb,
	"transcript" jsonb DEFAULT '[]'::jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "subtasks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_item_id" text NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_parent_item_id_mind_flow_items_id_fk" FOREIGN KEY ("parent_item_id") REFERENCES "public"."mind_flow_items"("id") ON DELETE cascade ON UPDATE no action;