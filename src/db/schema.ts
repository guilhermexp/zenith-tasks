import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const mindFlowItems = pgTable('mind_flow_items', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: text('title').notNull(),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  summary: text('summary'),
  itemType: text('item_type').notNull(),
  dueDate: text('due_date'),
  dueDateIso: text('due_date_iso'),
  suggestions: text('suggestions').array(),
  isGeneratingSubtasks: boolean('is_generating_subtasks').default(false),
  transactionType: text('transaction_type'),
  amount: numeric('amount'),
  isRecurring: boolean('is_recurring').default(false),
  paymentMethod: text('payment_method'),
  isPaid: boolean('is_paid').default(false),
  // Campos de recorrência
  recurrenceType: text('recurrence_type'), // 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  recurrenceInterval: integer('recurrence_interval').default(1), // Ex: a cada 2 dias, 3 semanas
  recurrenceEndDate: text('recurrence_end_date'), // Data de término da recorrência
  recurrenceDays: text('recurrence_days').array(), // Para semanal: ['mon', 'wed', 'fri']
  parentRecurrenceId: text('parent_recurrence_id'), // ID do item pai se for uma ocorrência gerada
  chatHistory: jsonb('chat_history').default(sql`'[]'::jsonb`),
  meetingDetails: jsonb('meeting_details'),
  transcript: jsonb('transcript'),
  notes: text('notes'),
});

export const subtasks = pgTable('subtasks', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  parentItemId: text('parent_item_id')
    .notNull()
    .references(() => mindFlowItems.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  position: integer('position').notNull(),
});

// AI Task Prioritization Tables

export const taskAnalyses = pgTable('task_analyses', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  taskId: text('task_id')
    .notNull()
    .references(() => mindFlowItems.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull(),
  priorityScore: numeric('priority_score', { precision: 5, scale: 2 }),
  recommendedOrder: integer('recommended_order'),
  confidence: numeric('confidence', { precision: 3, scale: 2 }),
  factors: jsonb('factors').default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userPerformancePatterns = pgTable('user_performance_patterns', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  patternType: varchar('pattern_type', { length: 50 }).notNull(),
  patternData: jsonb('pattern_data').notNull(),
  confidence: numeric('confidence', { precision: 3, scale: 2 }),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
});

export const patternSuggestions = pgTable('pattern_suggestions', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  suggestionType: varchar('suggestion_type', { length: 50 }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  actionData: jsonb('action_data'),
  impact: varchar('impact', { length: 10 }),
  isAccepted: boolean('is_accepted').default(false),
  isDismissed: boolean('is_dismissed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const detectedConflicts = pgTable('detected_conflicts', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  conflictType: varchar('conflict_type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),
  description: text('description').notNull(),
  conflictingItems: jsonb('conflicting_items'),
  suggestions: jsonb('suggestions'),
  isResolved: boolean('is_resolved').default(false),
  detectedAt: timestamp('detected_at').defaultNow().notNull(),
});

// Relations

export const mindFlowItemsRelations = relations(mindFlowItems, ({ many }) => ({
  subtasks: many(subtasks),
  analyses: many(taskAnalyses),
}));

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  parentItem: one(mindFlowItems, {
    fields: [subtasks.parentItemId],
    references: [mindFlowItems.id],
  }),
}));

export const taskAnalysesRelations = relations(taskAnalyses, ({ one }) => ({
  task: one(mindFlowItems, {
    fields: [taskAnalyses.taskId],
    references: [mindFlowItems.id],
  }),
}));

// Type exports
export type MindFlowItem = typeof mindFlowItems.$inferSelect;
export type NewMindFlowItem = typeof mindFlowItems.$inferInsert;
export type Subtask = typeof subtasks.$inferSelect;
export type NewSubtask = typeof subtasks.$inferInsert;

export type TaskAnalysis = typeof taskAnalyses.$inferSelect;
export type NewTaskAnalysis = typeof taskAnalyses.$inferInsert;
export type UserPerformancePattern = typeof userPerformancePatterns.$inferSelect;
export type NewUserPerformancePattern = typeof userPerformancePatterns.$inferInsert;
export type PatternSuggestion = typeof patternSuggestions.$inferSelect;
export type NewPatternSuggestion = typeof patternSuggestions.$inferInsert;
export type DetectedConflict = typeof detectedConflicts.$inferSelect;
export type NewDetectedConflict = typeof detectedConflicts.$inferInsert;
