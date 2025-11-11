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
ALTER TABLE "task_analyses" ADD CONSTRAINT "task_analyses_task_id_mind_flow_items_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."mind_flow_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_analyses_user_id" ON "task_analyses" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_analyses_task_id" ON "task_analyses" ("task_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_performance_patterns_user_id" ON "user_performance_patterns" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pattern_suggestions_user_id" ON "pattern_suggestions" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_detected_conflicts_user_id" ON "detected_conflicts" ("user_id");
