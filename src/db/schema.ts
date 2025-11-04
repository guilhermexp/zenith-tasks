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
  chatHistory: jsonb('chat_history').default(sql`'[]'::jsonb`),
  meetingDetails: jsonb('meeting_details'),
  transcript: jsonb('transcript').default(sql`'[]'::jsonb`),
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


export const mindFlowItemsRelations = relations(mindFlowItems, ({ many }) => ({
  subtasks: many(subtasks),
}));

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  parentItem: one(mindFlowItems, {
    fields: [subtasks.parentItemId],
    references: [mindFlowItems.id],
  }),
}));

export type MindFlowItem = typeof mindFlowItems.$inferSelect;
export type NewMindFlowItem = typeof mindFlowItems.$inferInsert;
export type Subtask = typeof subtasks.$inferSelect;
export type NewSubtask = typeof subtasks.$inferInsert;
