# AI Prioritization API Documentation

**Version**: 1.0.0
**Last Updated**: 2025-11-11
**Base URL**: `https://zenith-tasks.vercel.app/api` (Production)
**Base URL**: `http://localhost:3457/api` (Development)

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Endpoints](#endpoints)
   - [Task Prioritization](#task-prioritization)
   - [Analytics & Insights](#analytics--insights)
   - [Conflict Detection](#conflict-detection)
   - [Pattern Analysis](#pattern-analysis)
   - [Monitoring](#monitoring)
6. [Data Models](#data-models)
7. [Best Practices](#best-practices)

---

## Overview

The AI Prioritization API provides intelligent task management capabilities powered by multi-provider AI services (Google Gemini, OpenAI, Anthropic Claude, XAI Grok). The API enables:

- **Task Prioritization**: AI-powered task ranking with justification
- **Productivity Insights**: Analytics on work patterns and productivity trends
- **Conflict Detection**: Automatic detection of scheduling and workload conflicts
- **Pattern Analysis**: Identification of recurring patterns and optimization opportunities
- **Cost & Performance Monitoring**: Real-time tracking of AI usage and system performance

### Key Features

✅ Multi-provider AI support with automatic failover
✅ Real-time conflict detection and resolution suggestions
✅ Advanced analytics with caching for optimal performance
✅ Comprehensive error handling and retry logic
✅ Built-in rate limiting and cost monitoring
✅ Structured logging for debugging and monitoring

---

## Authentication

### Current Status

**⚠️ Authentication Temporarily Bypassed**

For deployment stability, Clerk authentication is currently disabled. All endpoints use a default `test-user` ID.

```javascript
// Current behavior (temporary)
const userId = 'test-user';
```

### Planned Authentication

When re-enabled, all endpoints will require authentication via Clerk:

```http
Authorization: Bearer <clerk-session-token>
```

**Headers Required**:
- `Authorization`: Bearer token from Clerk session
- `Content-Type`: `application/json`

**Unauthorized Response**:
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication required",
  "code": "AUTH_REQUIRED"
}
```

---

## Rate Limiting

Rate limits are enforced per user to ensure fair usage and prevent abuse.

### Current Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/ai/prioritize` | 10 requests | 1 hour |
| `/api/analytics/insights` | Unlimited* | - |
| `/api/conflicts/check` | Unlimited* | - |
| `/api/monitoring/*` | Unlimited* | - |

*Results are cached; actual AI calls are significantly reduced.

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 2025-11-11T05:30:00.000Z
```

### Rate Limit Exceeded Response

**Status Code**: `429 Too Many Requests`

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 2847 seconds.",
  "retryAfter": 2847
}
```

**Headers**:
```http
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-11-11T05:30:00.000Z
Retry-After: 2847
```

---

## Error Handling

### Standard Error Response

All errors follow a consistent structure:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": "Detailed error information (development only)",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Status | Description | When Used |
|--------|-------------|-----------|
| `200` | Success | Request completed successfully |
| `400` | Bad Request | Invalid request parameters or body |
| `401` | Unauthorized | Missing or invalid authentication |
| `404` | Not Found | Resource not found |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |
| `503` | Service Unavailable | AI service temporarily unavailable |
| `504` | Gateway Timeout | Request timeout (>10s) |

### Common Error Codes

```javascript
// Validation Errors
"VALIDATION_ERROR"      // Invalid request body or parameters
"MISSING_REQUIRED_FIELD" // Required field not provided

// Authentication Errors
"AUTH_REQUIRED"         // Authentication required but not provided
"INVALID_TOKEN"         // Invalid authentication token
"TOKEN_EXPIRED"         // Authentication token expired

// Rate Limiting
"RATE_LIMIT_EXCEEDED"   // Too many requests

// AI Service Errors
"AI_SERVICE_UNAVAILABLE" // AI provider temporarily unavailable
"AI_GENERATION_FAILED"   // AI failed to generate response
"INSUFFICIENT_CREDITS"   // User has insufficient AI credits

// Resource Errors
"NOT_FOUND"             // Requested resource not found
"NO_TASKS_FOUND"        // No tasks available for operation

// Conflict Errors
"CONFLICT_EXISTS"       // Resource conflict detected
```

### Error Examples

#### Validation Error
```json
{
  "error": "Validation error",
  "message": "Invalid request body",
  "details": [
    {
      "field": "tasks",
      "message": "Expected array, received string"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

#### AI Service Error
```json
{
  "error": "Prioritization failed",
  "message": "AI service temporarily unavailable",
  "code": "AI_SERVICE_UNAVAILABLE"
}
```

---

## Endpoints

### Task Prioritization

#### POST /api/ai/prioritize

Prioritize tasks using AI-powered analysis with contextual reasoning.

**Rate Limit**: 10 requests per hour

**Request Body**:
```json
{
  "tasks": [/* optional - fetched from database if not provided */],
  "availableTime": 120,  // optional - minutes available
  "preferences": {       // optional - user preferences
    "focusAreas": ["work", "personal"],
    "priorityFactors": {
      "urgency": 0.8,
      "importance": 0.9,
      "effort": 0.3
    }
  }
}
```

**Request Body Schema**:
```typescript
{
  tasks?: MindFlowItem[];      // Array of tasks (optional)
  availableTime?: number;      // Minutes available (optional)
  preferences?: {              // User preferences (optional)
    [key: string]: any;
  };
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "prioritizedTasks": [
      {
        "taskId": "task-123",
        "priorityScore": 0.92,
        "rank": 1,
        "reasoning": [
          "High urgency: Due in 2 hours",
          "Critical impact: Blocking other team members",
          "Quick win: Estimated 15 minutes"
        ],
        "confidence": 0.89
      },
      {
        "taskId": "task-456",
        "priorityScore": 0.78,
        "rank": 2,
        "reasoning": [
          "Important but not urgent: Due in 3 days",
          "High value: Key project milestone",
          "Moderate effort: Estimated 2 hours"
        ],
        "confidence": 0.85
      }
    ],
    "justification": "Prioritized based on urgency, impact, and available time. Focus on quick wins first to clear blocking items.",
    "confidenceScore": 0.87
  },
  "metadata": {
    "processingTime": 1847,
    "taskCount": 2,
    "timestamp": "2025-11-11T04:30:00.000Z"
  }
}
```

**Error Responses**:

- **400 Bad Request**: No tasks to prioritize
```json
{
  "error": "No tasks to prioritize",
  "message": "No incomplete tasks found for this user"
}
```

- **429 Too Many Requests**: Rate limit exceeded (see [Rate Limiting](#rate-limiting))
- **503 Service Unavailable**: AI service unavailable
```json
{
  "error": "Prioritization failed",
  "message": "AI service temporarily unavailable"
}
```

**Response Headers**:
```http
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 2025-11-11T05:30:00.000Z
```

**cURL Example**:
```bash
curl -X POST https://zenith-tasks.vercel.app/api/ai/prioritize \
  -H "Content-Type: application/json" \
  -d '{
    "availableTime": 120,
    "preferences": {
      "focusAreas": ["work"]
    }
  }'
```

**Performance SLA**: < 3 seconds for 10 tasks

---

#### GET /api/ai/prioritize

Get endpoint information and capabilities.

**Success Response** (200 OK):
```json
{
  "endpoint": "/api/ai/prioritize",
  "method": "POST",
  "description": "AI-powered task prioritization",
  "rateLimit": "10 requests per hour",
  "requestBody": {
    "tasks": "array (optional - will fetch from database if not provided)",
    "availableTime": "number (optional - in minutes)",
    "preferences": "object (optional - user preferences)"
  },
  "response": {
    "success": "boolean",
    "data": {
      "prioritizedTasks": "array of prioritized tasks with scores and reasoning",
      "justification": "overall prioritization strategy",
      "confidenceScore": "confidence in the prioritization (0-1)"
    }
  }
}
```

---

### Analytics & Insights

#### GET /api/analytics/insights

Get productivity insights and analytics for a specified period.

**Query Parameters**:
- `period` (optional): `week` | `month` | `quarter` (default: `week`)
- `metrics` (optional): Comma-separated list of specific metrics

**Request Example**:
```http
GET /api/analytics/insights?period=week&metrics=productivity,completion
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "mostProductiveHours": [
      {
        "hour": 9,
        "productivityScore": 87
      },
      {
        "hour": 14,
        "productivityScore": 82
      }
    ],
    "taskCompletionByType": {
      "Tarefa": 15,
      "Reunião": 8,
      "Ideia": 5
    },
    "procrastinationPatterns": [
      {
        "taskType": "Tarefa",
        "averagePostponements": 2.5,
        "commonReasons": [
          "Task complexity too high",
          "Unclear requirements",
          "Waiting for dependencies"
        ],
        "suggestion": "Break down complex tasks into smaller, actionable subtasks"
      }
    ],
    "improvementSuggestions": [
      "Schedule important tasks during your peak hours (9-11 AM)",
      "Reduce meeting load on Wednesdays to increase focus time",
      "Consider time-boxing open-ended tasks"
    ],
    "productivityScore": 78,
    "trend": "improving"
  },
  "metadata": {
    "cached": true,
    "processingTime": 42,
    "taskCount": 28,
    "timestamp": "2025-11-11T04:30:00.000Z",
    "cacheHitRate": "0.87"
  }
}
```

**Response Headers**:
```http
Cache-Control: private, max-age=3600
X-Cache: HIT
X-Cache-Hit-Rate: 0.87
```

**Error Responses**:

- **400 Bad Request**: Invalid period
```json
{
  "error": "Invalid period",
  "message": "Period must be one of: week, month, quarter"
}
```

- **500 Internal Server Error**: Analytics generation failed

**cURL Example**:
```bash
curl -X GET "https://zenith-tasks.vercel.app/api/analytics/insights?period=week"
```

**Cache Behavior**:
- Cached for 1 hour
- Automatically invalidated on task changes
- Cache hit rate tracked and reported

---

#### DELETE /api/analytics/insights

Invalidate analytics cache for the current user.

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Analytics cache cleared",
  "keysCleared": 3
}
```

---

#### GET /api/analytics/cache-metrics

Get analytics cache performance metrics.

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "size": 24,
    "hits": 187,
    "misses": 28,
    "hitRate": 0.87,
    "evictions": 5,
    "recentAccess": [
      {
        "userId": "test-user",
        "period": "week",
        "hits": 5,
        "avgAge": 1247000,
        "lastAccess": "2025-11-11T04:28:15.000Z"
      }
    ],
    "timestamp": "2025-11-11T04:30:00.000Z"
  }
}
```

---

### Conflict Detection

#### POST /api/conflicts/check

Check for scheduling and workload conflicts.

**Request Body**:
```json
{
  "newItem": {  // optional - check conflicts for a new item
    "title": "Client presentation",
    "type": "Reunião",
    "dueDateISO": "2025-11-15T14:00:00.000Z",
    "meetingDetails": {
      "date": "2025-11-15",
      "time": "14:00"
    }
  },
  "timeframe": {  // optional - check conflicts in a timeframe
    "start": "2025-11-11T00:00:00.000Z",
    "end": "2025-11-18T23:59:59.000Z"
  }
}
```

**Request Body Schema**:
```typescript
{
  newItem?: {                    // New item to check (optional)
    title: string;
    type: string;
    dueDateISO?: string;
    dueDate?: string;
    meetingDetails?: {
      date?: string;
      time?: string;
    };
    subtasks?: any[];
  };
  timeframe?: {                  // Timeframe to check (optional)
    start: string;               // ISO date string
    end: string;                 // ISO date string
  };
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "conflicts": [
      {
        "id": "conflict-123",
        "userId": "test-user",
        "conflictType": "scheduling",
        "severity": "critical",
        "description": "Meeting overlaps with another scheduled event",
        "conflictingItems": [
          {
            "id": "task-789",
            "title": "Team standup",
            "type": "Reunião",
            "meetingDetails": {
              "date": "2025-11-15",
              "time": "14:00"
            }
          }
        ],
        "suggestions": [
          {
            "action": "reschedule",
            "details": {
              "suggestedTime": "2025-11-15T15:00:00.000Z",
              "reason": "Next available slot after current meeting"
            },
            "impact": "low"
          },
          {
            "action": "extend",
            "details": {
              "suggestedDuration": 90,
              "reason": "Combine both meetings if attendees overlap"
            },
            "impact": "medium"
          }
        ],
        "isResolved": false,
        "detectedAt": "2025-11-11T04:30:00.000Z"
      }
    ],
    "summary": {
      "total": 1,
      "critical": 1,
      "warnings": 0,
      "info": 0
    }
  },
  "metadata": {
    "processingTime": 234,
    "timestamp": "2025-11-11T04:30:00.000Z"
  }
}
```

**Conflict Types**:
- `scheduling`: Time-based conflicts (overlapping meetings/deadlines)
- `overload`: Workload conflicts (too many tasks in timeframe)
- `deadline`: Deadline feasibility conflicts

**Severity Levels**:
- `critical`: Must be resolved (e.g., overlapping meetings)
- `warning`: Should be addressed (e.g., tight schedule)
- `info`: Awareness only (e.g., busy period ahead)

**Resolution Actions**:
- `reschedule`: Move task/meeting to different time
- `delegate`: Assign to another person
- `breakdown`: Split into smaller tasks
- `extend`: Extend deadline or duration

**cURL Example**:
```bash
curl -X POST https://zenith-tasks.vercel.app/api/conflicts/check \
  -H "Content-Type: application/json" \
  -d '{
    "newItem": {
      "title": "Client presentation",
      "type": "Reunião",
      "dueDateISO": "2025-11-15T14:00:00.000Z"
    }
  }'
```

**Performance SLA**: < 1 second

---

#### GET /api/conflicts/check

Get recent unresolved conflicts for the current user.

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "unresolvedConflicts": [/* array of conflicts */],
    "criticalConflicts": [/* array of critical conflicts */],
    "stats": {
      "total": 5,
      "resolved": 3,
      "unresolved": 2,
      "critical": 1
    }
  }
}
```

---

### Pattern Analysis

#### POST /api/cron/analyze-patterns

Analyze user behavior patterns and generate improvement suggestions.

**Note**: This endpoint is designed for scheduled execution (cron job) but can be called manually.

**Request Body**:
```json
{
  "userId": "test-user"  // optional - defaults to all users
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "patternsAnalyzed": 5,
    "suggestionsGenerated": 3,
    "patterns": [
      {
        "type": "recurring",
        "patternData": {
          "taskTitle": "daily standup",
          "frequency": 10,
          "averageDaysBetween": 1,
          "suggestedRecurrence": "daily"
        },
        "confidence": 0.9,
        "suggestion": {
          "id": "recurring-123",
          "title": "Create recurring task template",
          "description": "This task appears frequently. Consider automating it.",
          "impact": "high"
        }
      },
      {
        "type": "batch",
        "patternData": {
          "category": "Tarefa",
          "taskCount": 5,
          "estimatedTime": 150,
          "suggestedTimeBlock": "afternoon"
        },
        "confidence": 0.8,
        "suggestion": {
          "id": "batch-456",
          "title": "Batch process similar tasks",
          "description": "Process multiple similar tasks in one focused session.",
          "impact": "medium"
        }
      }
    ]
  },
  "metadata": {
    "processingTime": 3421,
    "timestamp": "2025-11-11T04:30:00.000Z"
  }
}
```

**Pattern Types**:
- `recurring`: Tasks that repeat regularly
- `batch`: Groups of similar tasks that could be batched
- `postponement`: Tasks frequently postponed
- `performance`: Performance optimization opportunities

**cURL Example**:
```bash
curl -X POST https://zenith-tasks.vercel.app/api/cron/analyze-patterns \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}'
```

---

### Monitoring

#### GET /api/monitoring/performance

Get performance metrics and statistics.

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "endpoints": {
      "/api/ai/prioritize": {
        "totalRequests": 127,
        "successRate": 0.98,
        "avgResponseTime": 1847,
        "p50": 1650,
        "p95": 2890,
        "p99": 3240,
        "errors": 3
      },
      "/api/analytics/insights": {
        "totalRequests": 312,
        "successRate": 1.0,
        "avgResponseTime": 234,
        "p50": 45,
        "p95": 1850,
        "p99": 2100,
        "errors": 0
      }
    },
    "aiProviders": {
      "google:gemini-2.5-flash": {
        "totalCalls": 87,
        "successRate": 0.97,
        "avgLatency": 1234,
        "errors": 3
      }
    },
    "database": {
      "loadItems": {
        "totalQueries": 523,
        "avgDuration": 45,
        "errors": 0
      }
    },
    "overallStats": {
      "avgResponseTime": 847,
      "totalRequests": 1024,
      "totalErrors": 8,
      "errorRate": 0.0078,
      "timestamp": "2025-11-11T04:30:00.000Z"
    }
  },
  "timestamp": "2025-11-11T04:30:00.000Z"
}
```

**Metric Definitions**:
- `p50`: 50th percentile (median) response time
- `p95`: 95th percentile response time
- `p99`: 99th percentile response time
- `successRate`: Percentage of successful requests (0-1)
- `errorRate`: Percentage of failed requests (0-1)

---

#### DELETE /api/monitoring/performance

Reset performance metrics.

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Performance metrics reset successfully"
}
```

---

#### GET /api/monitoring/ai-cost

Get AI usage cost metrics and budget information.

**Query Parameters**:
- `period` (optional): `day` | `week` | `month` (default: `day`)
- `userId` (optional): Get costs for specific user

**Request Examples**:
```http
GET /api/monitoring/ai-cost?period=week
GET /api/monitoring/ai-cost?period=month&userId=test-user
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "summary": {
      "period": "week",
      "totalCalls": 127,
      "totalTokens": 458930,
      "totalCost": 2.3456,
      "costByProvider": {
        "google": 1.2340,
        "openai": 0.8976,
        "anthropic": 0.2140
      },
      "costByModel": {
        "gemini-2.5-flash": 0.8765,
        "gpt-4o-mini": 0.5432,
        "claude-3-5-sonnet": 0.9259
      },
      "averageCostPerCall": 0.0185,
      "startDate": "2025-11-04T00:00:00.000Z",
      "endDate": "2025-11-11T04:30:00.000Z"
    },
    "alerts": [
      {
        "id": "alert-123",
        "type": "warning",
        "message": "Daily AI cost has reached 82.3% of budget",
        "severity": "warning",
        "threshold": 80,
        "currentValue": 8.23,
        "createdAt": "2025-11-11T03:45:00.000Z"
      }
    ],
    "budget": {
      "daily": 10,
      "weekly": 50,
      "monthly": 200,
      "perUser": 5,
      "alerts": {
        "warningThreshold": 80,
        "criticalThreshold": 95
      }
    }
  },
  "timestamp": "2025-11-11T04:30:00.000Z"
}
```

**Budget Alerts**:
- `warning`: Triggered at 80% of budget
- `critical`: Triggered at 95% of budget

**Cost Calculation**:
Costs are calculated based on token usage and current provider pricing:
- Input tokens: Charged per 1K tokens
- Output tokens: Charged per 1K tokens (usually higher rate)
- Pricing varies by model (see [AI Provider Pricing](#ai-provider-pricing))

---

#### PATCH /api/monitoring/ai-cost

Update AI cost budget configuration.

**Request Body**:
```json
{
  "daily": 15,
  "weekly": 75,
  "monthly": 300,
  "perUser": 10
}
```

**Validation**:
- All values must be positive numbers
- At least one budget value must be provided

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Budget updated successfully",
  "budget": {
    "daily": 15,
    "weekly": 75,
    "monthly": 300,
    "perUser": 10,
    "alerts": {
      "warningThreshold": 80,
      "criticalThreshold": 95
    }
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Daily budget must be positive"
}
```

**cURL Example**:
```bash
curl -X PATCH https://zenith-tasks.vercel.app/api/monitoring/ai-cost \
  -H "Content-Type: application/json" \
  -d '{
    "daily": 15,
    "weekly": 75
  }'
```

---

## Data Models

### MindFlowItem

```typescript
interface MindFlowItem {
  id: string;
  userId: string;
  title: string;
  type: 'Tarefa' | 'Ideia' | 'Nota' | 'Lembrete' | 'Financeiro' | 'Reunião';
  completed: boolean;
  createdAt: string;          // ISO date string
  updatedAt?: string;         // ISO date string
  dueDate?: string;           // Human-readable date
  dueDateISO?: string;        // ISO date string
  description?: string;
  summary?: string;           // AI-generated summary
  suggestions?: string[];     // AI suggestions
  chatHistory?: ChatMessage[]; // JSONB
  amount?: number;            // For Financeiro type
  transactionType?: 'income' | 'expense';
  isRecurring?: boolean;
  isPaid?: boolean;
  meetingDetails?: {          // For Reunião type
    date?: string;
    time?: string;
    duration?: number;
    attendees?: string[];
    location?: string;
  };
  subtasks?: Subtask[];
}
```

### PrioritizedTask

```typescript
interface PrioritizedTask {
  taskId: string;
  priorityScore: number;      // 0-1, higher is more important
  rank: number;               // 1-based ranking
  reasoning: string[];        // Array of justifications
  confidence: number;         // 0-1, AI confidence in prioritization
}
```

### DetectedConflict

```typescript
interface DetectedConflict {
  id: string;
  userId: string;
  conflictType: 'scheduling' | 'overload' | 'deadline';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  conflictingItems?: MindFlowItem[];
  suggestions?: ConflictResolutionSuggestion[];
  isResolved: boolean;
  detectedAt: string;         // ISO date string
}
```

### ConflictResolutionSuggestion

```typescript
interface ConflictResolutionSuggestion {
  action: 'reschedule' | 'delegate' | 'breakdown' | 'extend';
  details: Record<string, any>;
  impact: 'high' | 'medium' | 'low';
}
```

### ProductivityInsights

```typescript
interface ProductivityInsights {
  mostProductiveHours: TimeSlot[];
  taskCompletionByType: Record<string, number>;
  procrastinationPatterns: ProcrastinationPattern[];
  improvementSuggestions: string[];
  productivityScore: number;  // 0-100
  trend: 'improving' | 'declining' | 'stable';
}
```

### DetectedPattern

```typescript
interface DetectedPattern {
  type: 'recurring' | 'batch' | 'postponement' | 'performance';
  patternData: Record<string, any>;
  confidence: number;         // 0-1
  suggestion: {
    id: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  };
}
```

---

## Best Practices

### 1. Efficient API Usage

**Cache Analytics Results**:
```javascript
// Cache is automatic - results cached for 1 hour
// Manually invalidate when needed
await fetch('/api/analytics/insights', { method: 'DELETE' });
```

**Batch Conflict Checks**:
```javascript
// Check multiple items in one request using timeframe
const response = await fetch('/api/conflicts/check', {
  method: 'POST',
  body: JSON.stringify({
    timeframe: {
      start: '2025-11-11T00:00:00.000Z',
      end: '2025-11-18T23:59:59.000Z'
    }
  })
});
```

**Handle Rate Limits**:
```javascript
const response = await fetch('/api/ai/prioritize', {
  method: 'POST',
  body: JSON.stringify({ availableTime: 120 })
});

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.log(`Rate limited. Retry after ${retryAfter} seconds`);

  // Implement exponential backoff or queue the request
}
```

### 2. Error Handling

**Implement Retry Logic**:
```javascript
async function prioritizeWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        return await response.json();
      }

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }

      // Retry on server errors (5xx)
      if (i < maxRetries - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

**Graceful Degradation**:
```javascript
async function getInsights() {
  try {
    const response = await fetch('/api/analytics/insights?period=week');
    return await response.json();
  } catch (error) {
    // Fall back to basic insights if AI service is unavailable
    return {
      success: false,
      data: {
        productivityScore: 0,
        improvementSuggestions: [
          'Analytics temporarily unavailable. Please try again later.'
        ]
      }
    };
  }
}
```

### 3. Performance Optimization

**Check Cache Headers**:
```javascript
const response = await fetch('/api/analytics/insights');
const cacheStatus = response.headers.get('X-Cache'); // HIT or MISS
const hitRate = response.headers.get('X-Cache-Hit-Rate');

console.log(`Cache ${cacheStatus} - Hit rate: ${hitRate}`);
```

**Monitor Performance**:
```javascript
// Regularly check performance metrics
const performance = await fetch('/api/monitoring/performance')
  .then(res => res.json());

if (performance.data.overallStats.avgResponseTime > 2000) {
  console.warn('API performance degraded');
}
```

### 4. Cost Management

**Monitor AI Costs**:
```javascript
// Check daily costs
const costs = await fetch('/api/monitoring/ai-cost?period=day')
  .then(res => res.json());

if (costs.data.summary.totalCost > costs.data.budget.daily * 0.8) {
  console.warn('Approaching daily budget limit');
}
```

**Set Appropriate Budgets**:
```javascript
// Update budget based on usage patterns
await fetch('/api/monitoring/ai-cost', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    daily: 15,
    weekly: 75,
    monthly: 300
  })
});
```

### 5. User Experience

**Provide Feedback**:
```javascript
// Show loading states
setLoading(true);
const result = await fetch('/api/ai/prioritize', {
  method: 'POST',
  body: JSON.stringify({ availableTime: 120 })
});
setLoading(false);

// Show processing time to users
const { metadata } = await result.json();
console.log(`Processed in ${metadata.processingTime}ms`);
```

**Handle Conflicts Proactively**:
```javascript
// Check for conflicts before saving
const conflictCheck = await fetch('/api/conflicts/check', {
  method: 'POST',
  body: JSON.stringify({ newItem })
});

const { data } = await conflictCheck.json();
if (data.summary.critical > 0) {
  // Show warning to user before saving
  showConflictWarning(data.conflicts);
}
```

---

## AI Provider Pricing

Current pricing per 1M tokens (as of 2025-11-11):

| Provider | Model | Input | Output |
|----------|-------|--------|--------|
| **OpenAI** | gpt-4o | $5.00 | $15.00 |
| | gpt-4o-mini | $0.15 | $0.60 |
| **Google** | gemini-2.5-pro | $1.25 | $5.00 |
| | gemini-2.5-flash | $0.075 | $0.30 |
| **Anthropic** | claude-3-5-sonnet | $3.00 | $15.00 |
| **XAI** | grok-4-fast-reasoning | $2.00 | $10.00 |

**Note**: Prices subject to change by providers. Check current pricing at provider websites.

---

## Support & Feedback

- **Issues**: https://github.com/anthropics/zenith-tasks/issues
- **Documentation**: https://zenith-tasks.vercel.app/docs
- **API Status**: https://zenith-tasks.vercel.app/api/debug/health

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-11
**Generated**: Automatically from API implementation
