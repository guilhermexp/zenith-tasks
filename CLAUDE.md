# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Scripts
- `npm run dev` - Start development server on port 3457
- `npm run build` - Build for production
- `npm start` - Start production server on port 3456
- `npm run lint` - Run ESLint checks
- `npm run lint:ci` - Run ESLint with zero warnings tolerance
- `npm run typecheck` - Run TypeScript type checking

### Database Commands
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio

### Environment Setup
Required environment variables (create `.env.local` from `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string (Neon database)
- `AI_SDK_PROVIDER` - Set to 'google' or 'openrouter'
- `GEMINI_API_KEY` - Required if using Google provider (get from https://makersuite.google.com/app/apikey)
- Optional: Clerk credentials for authentication
- Optional: AI Gateway configuration for unified AI access

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript 5.9.2 with strict mode
- **Styling**: Tailwind CSS 3.4.17 with dark theme (neutral-950 background)
- **AI Integration**: AI SDK 5.0.59 with multi-provider support
- **Database**: Neon PostgreSQL with Drizzle ORM 0.44.7
- **Authentication**: Clerk 6.33.1 (currently bypassed for deployment)
- **Deployment**: Vercel with serverless functions

### Application Architecture
This is an AI-powered task management application with sophisticated features:

**Central State Management**: `src/components/App.tsx` serves as the main hub that:
- Manages all application state for items
- Handles routing through filter-based navigation (activeNavItem state)
- Orchestrates data flow between components via props (no global state library)
- Integrates with useItems hook for database operations

**Data Model Architecture**: All items follow the `MindFlowItem` interface (`src/types/index.ts`):
- **Core fields**: id, userId, title, completed, createdAt, updatedAt
- **Item types**: 'Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião'
- **AI-enhanced fields**: summary, suggestions, chatHistory (JSONB)
- **Financial fields**: amount, transactionType, isRecurring, isPaid
- **Date tracking**: dueDate, dueDateIso
- **Meeting fields**: meetingDetails, transcript (JSONB)
- **JSONB fields**: chatHistory, meetingDetails, transcript for flexibility

### Database Schema (Neon PostgreSQL + Drizzle ORM)
Three main tables with comprehensive relationships:

**mind_flow_items** (Primary table):
- Server-side only architecture with row-level security ready
- JSONB fields for flexible data storage (chatHistory, transcripts)
- Full-text search capabilities
- Multi-tenant architecture with userId partitioning

**subtasks**:
- Parent-child relationship to mind_flow_items
- Position tracking for ordered subtasks
- Automatic cleanup when parent items are deleted


### AI Integration Architecture
AI functionality uses sophisticated multi-provider system:

**AI Provider Abstraction** (`src/server/aiProvider.ts`):
- **Multi-provider support**: Google Gemini, OpenAI, Anthropic Claude, OpenRouter
- **AI Gateway Integration**: Portkey AI Gateway for unified access
- **Context-Aware Selection**: Different models for different use cases
- **Caching**: Model instance caching for performance
- **Streaming Support**: Real-time AI responses

**AI Contexts**:
```typescript
const modelSettings = {
  'task-planning': { temperature: 0.3, maxTokens: 2000 },
  'creative-writing': { temperature: 0.9, maxTokens: 4000 },
  'code-generation': { temperature: 0.2, maxTokens: 3000 },
  'chat': { temperature: 0.7, maxTokens: 1500 },
  'analysis': { temperature: 0.3, maxTokens: 2500 }
};
```

**API Architecture**: Server-side only with 32 endpoints:
- `/api/inbox/analyze` - Text analysis and intelligent categorization
- `/api/subtasks/generate` - AI-powered subtask generation
- `/api/chat/for-item` - Contextual chat with persistent history
- `/api/assistant` - Main assistant with 17+ tool execution capabilities
- `/api/assistant/act` - Tool execution endpoint
- `/api/speech/transcribe` - Speech-to-text transcription
- `/api/items/*` - CRUD operations with authentication
- `/api/models` - AI model listing and provider switching
- `/api/credits/*` - AI usage tracking and management


### Component Organization
- **Flat structure**: All components in `src/components/` (no sub-folders)
- **Core components**: App, Sidebar, TaskList, DetailPanel, TalkModeModal
- **Specialized pages**: CalendarPage, FinancePage, MeetingPage, UpdatesPage
- **UI components**: Located in `src/components/ui/` with reusable design elements
- **Convention**: PascalCase naming, one component per file

### Server-Side Architecture
**ItemsService Class** (`src/services/database/items.ts`):
- Server-only architecture prevents database driver from bundling to client
- Comprehensive CRUD operations with error handling
- TypeScript interfaces for type safety
- Database transaction support
- Fallback mechanisms (database → localStorage)

**API Route Structure**:
- All AI/external service calls through Next.js API routes
- Authentication middleware (currently bypassed for deployment)
- Error boundaries and graceful degradation
- Streaming support for AI responses
- Request/response validation with Zod schemas

### Current Development State
**Authentication**:
- Clerk integration configured but bypassed for deployment stability
- Uses "test-user" ID for development in API routes
- Middleware disabled to prevent MIDDLEWARE_INVOCATION_FAILED errors
- Ready to re-enable with proper environment variable configuration

**Database Migration**:
- Successfully migrated from Supabase to Neon PostgreSQL
- All migrations applied and tested
- Connection pooling configured for serverless deployment
- Data integrity maintained during migration

**Deployment Status**:
- Production: https://zenith-tasks.vercel.app (fully functional)
- Development: http://localhost:3457 (fully functional)
- Error 500 middleware issue resolved by temporarily disabling Clerk
- All core features operational without authentication

## Key Development Patterns

### State Management
- **Centralized**: All state flows through App.tsx
- **Props-based**: Data flows from parent to child components
- **Hooks Pattern**: Custom hooks for complex logic (useItems, useToast)
- **No Global State**: Avoids context providers for performance

### Error Handling
- **Graceful Fallbacks**: Database → localStorage → default values
- **API Error Handling**: Structured error responses with user-friendly messages
- **AI Error Handling**: Fallback to simple categorization when AI fails
- **Validation**: Zod schemas for runtime type checking

### Database Operations
- **Server-Only**: Database operations never exposed to client bundle
- **Type Safety**: Full TypeScript integration with Drizzle ORM
- **Transactions**: Support for atomic database operations
- **Migrations**: Version-controlled schema changes

### AI Integration
- **Context Preservation**: Chat history and item context maintained across conversations
- **Tool Execution**: AI can execute database operations via API tools
- **Multi-Modal**: Text, speech, and image processing capabilities
- **Streaming**: Real-time AI responses for better UX

## Important Notes for Developers

### Before Testing
⚠️ Always use DevTools to verify functionality. Never assume code is working without testing.

### Common Development Tasks
- **Start dev server**: `npm run dev` (runs on port 3457)
- **Type checking**: `npm run typecheck` (catches TypeScript errors early)
- **Linting**: `npm run lint:ci` (strict mode with zero warnings tolerance)
- **Building**: `npm run build` (always test build before committing)
- **Database Operations**: Use `npm run db:migrate` for schema changes
- **Testing Database**: Use `npm run db:studio` for visual database inspection

### Deployment Tasks
- **Local Development**: All features work without authentication
- **Production Deployment**: App fully functional at https://zenith-tasks.vercel.app
- **Environment Variables**: Configure in Vercel dashboard for production
- **Database**: Neon PostgreSQL already connected and operational

### Best Practices
1. Test UI changes with DevTools to verify visual appearance
2. Use TypeScript strict mode - fix all type errors before committing
3. Keep components small and focused - one component per file
4. Document complex logic with inline comments
5. Follow Portuguese naming for user-facing text, English for code
6. Verify API endpoints with test routes before integrating into UI
7. Test AI features with real API keys before deployment
8. Use server-side architecture for all database operations

### Current Limitations
- **Authentication**: Clerk temporarily disabled for deployment stability
- **Rate Limiting**: Not yet implemented (infrastructure ready)
- **Testing**: No automated tests (manual testing only)
- **Monitoring**: Basic error handling, no advanced monitoring setup

### AI Development Notes
- **Provider Selection**: Use appropriate models for different tasks
- **Token Management**: Monitor usage and implement credit system
- **Context Management**: Preserve conversation context across AI interactions
- **Tool Safety**: Validate all tool parameters before execution
- **Error Recovery**: Implement graceful degradation when AI services fail

### Database Development
- **Schema Changes**: Use Drizzle migrations (`npm run db:generate`)
- **Data Validation**: Use Zod schemas for runtime validation
- **Performance**: Use connection pooling and efficient queries
- **Backup Strategy**: Neon provides automatic backups
- **Testing**: Use local development database before production changes

This application represents a sophisticated AI-powered task management system with modern architecture, comprehensive AI integration, and production-ready deployment infrastructure.