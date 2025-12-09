CREATE TABLE "detected_conflicts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"conflict_type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"conflicting_items" jsonb,
	"suggestions" jsonb,
	"is_resolved" boolean DEFAULT false,
	"detected_at" timestamp DEFAULT now() NOT NULL
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
	"recurrence_type" text,
	"recurrence_interval" integer DEFAULT 1,
	"recurrence_end_date" text,
	"recurrence_days" text[],
	"parent_recurrence_id" text,
	"chat_history" jsonb DEFAULT '[]'::jsonb,
	"meeting_details" jsonb,
	"transcript" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "pattern_suggestions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"suggestion_type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"action_data" jsonb,
	"impact" varchar(10),
	"is_accepted" boolean DEFAULT false,
	"is_dismissed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "task_analyses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" text NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"priority_score" numeric(5, 2),
	"recommended_order" integer,
	"confidence" numeric(3, 2),
	"factors" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_performance_patterns" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"pattern_type" varchar(50) NOT NULL,
	"pattern_data" jsonb NOT NULL,
	"confidence" numeric(3, 2),
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_parent_item_id_mind_flow_items_id_fk" FOREIGN KEY ("parent_item_id") REFERENCES "public"."mind_flow_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_analyses" ADD CONSTRAINT "task_analyses_task_id_mind_flow_items_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."mind_flow_items"("id") ON DELETE cascade ON UPDATE no action;