import { z } from 'zod';

// ============================================
// Core AI Prioritization Schemas
// ============================================

export const PriorityFactorSchema = z.object({
  name: z.string(),
  weight: z.number(),
  impact: z.enum(['positive', 'negative']),
  description: z.string(),
});

export const PrioritizedTaskSchema = z.object({
  taskId: z.string(),
  priorityScore: z.number(),
  rank: z.number(),
  reasoning: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const PrioritizationRequestSchema = z.object({
  tasks: z.array(z.any()), // Will be MindFlowItem[] at runtime
  availableTime: z.number().optional(), // in minutes
  preferences: z.record(z.string(), z.any()).optional(),
});

export const PrioritizationResponseSchema = z.object({
  prioritizedTasks: z.array(PrioritizedTaskSchema),
  justification: z.string(),
  confidenceScore: z.number().min(0).max(1),
});

// ============================================
// Task Analysis Schemas
// ============================================

export const TaskAnalysisSchema = z.object({
  id: z.string().optional(),
  taskId: z.string(),
  userId: z.string(),
  priorityScore: z.number().optional(),
  recommendedOrder: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  factors: z.array(PriorityFactorSchema).default([]),
  createdAt: z.date().optional(),
});

// ============================================
// Pattern Analysis Schemas
// ============================================

export const DetectedPatternSchema = z.object({
  type: z.enum(['recurring', 'batch', 'postponement', 'performance']),
  patternData: z.record(z.string(), z.any()),
  confidence: z.number().min(0).max(1),
  suggestion: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
  }),
});

export const PatternSuggestionSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  suggestionType: z.string().max(50),
  title: z.string(),
  description: z.string(),
  actionData: z.record(z.string(), z.any()).optional(),
  impact: z.enum(['high', 'medium', 'low']),
  isAccepted: z.boolean().default(false),
  isDismissed: z.boolean().default(false),
  createdAt: z.date().optional(),
});

export const UserPerformancePatternSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  patternType: z.string().max(50),
  patternData: z.record(z.string(), z.any()),
  confidence: z.number().min(0).max(1).optional(),
  lastUpdated: z.date().optional(),
});

// ============================================
// Conflict Detection Schemas
// ============================================

export const ConflictResolutionSuggestionSchema = z.object({
  action: z.enum(['reschedule', 'delegate', 'breakdown', 'extend']),
  details: z.record(z.string(), z.any()),
  impact: z.enum(['high', 'medium', 'low']),
});

export const DetectedConflictSchema = z.object({
  id: z.string(),
  userId: z.string(),
  conflictType: z.enum(['scheduling', 'overload', 'deadline']),
  severity: z.enum(['critical', 'warning', 'info']),
  description: z.string(),
  conflictingItems: z.array(z.any()).optional(), // Task | Meeting objects
  suggestions: z.array(ConflictResolutionSuggestionSchema).optional(),
  isResolved: z.boolean().default(false),
  detectedAt: z.date().optional(),
});

// ============================================
// Analytics Schemas
// ============================================

export const TimeSlotSchema = z.object({
  hour: z.number().min(0).max(23),
  productivityScore: z.number().min(0).max(100),
});

export const ProcrastinationPatternSchema = z.object({
  taskType: z.string(),
  averagePostponements: z.number(),
  commonReasons: z.array(z.string()),
  suggestion: z.string(),
});

export const ProductivityInsightsSchema = z.object({
  mostProductiveHours: z.array(TimeSlotSchema),
  taskCompletionByType: z.record(z.string(), z.number()),
  procrastinationPatterns: z.array(ProcrastinationPatternSchema),
  improvementSuggestions: z.array(z.string()),
  productivityScore: z.number().min(0).max(100),
  trend: z.enum(['improving', 'declining', 'stable']),
});

export const AnalyticsRequestSchema = z.object({
  userId: z.string(),
  period: z.enum(['week', 'month', 'quarter']),
  metrics: z.array(z.string()).optional(),
});

// ============================================
// Type Exports (inferred from Zod schemas)
// ============================================

export type PriorityFactor = z.infer<typeof PriorityFactorSchema>;
export type PrioritizedTask = z.infer<typeof PrioritizedTaskSchema>;
export type PrioritizationRequest = z.infer<typeof PrioritizationRequestSchema>;
export type PrioritizationResponse = z.infer<typeof PrioritizationResponseSchema>;

export type TaskAnalysis = z.infer<typeof TaskAnalysisSchema>;

export type DetectedPattern = z.infer<typeof DetectedPatternSchema>;
export type PatternSuggestion = z.infer<typeof PatternSuggestionSchema>;
export type UserPerformancePattern = z.infer<typeof UserPerformancePatternSchema>;

export type ConflictResolutionSuggestion = z.infer<typeof ConflictResolutionSuggestionSchema>;
export type DetectedConflict = z.infer<typeof DetectedConflictSchema>;

export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type ProcrastinationPattern = z.infer<typeof ProcrastinationPatternSchema>;
export type ProductivityInsights = z.infer<typeof ProductivityInsightsSchema>;
export type AnalyticsRequest = z.infer<typeof AnalyticsRequestSchema>;
