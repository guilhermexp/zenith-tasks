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

### Environment Setup
Required environment variables (create `.env.local` from `.env.example`):
- `AI_SDK_PROVIDER` - Set to 'google' or 'openrouter'
- `GEMINI_API_KEY` - Required if using Google provider (get from https://makersuite.google.com/app/apikey)
- `OPENROUTER_API_KEY` - Required if using OpenRouter provider
- Optional: Supabase and Clerk credentials for database and auth

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with dark theme (neutral-950 background)
- **AI Integration**: AI SDK with Google Gemini or OpenRouter
- **Auth**: Clerk authentication
- **Database**: Supabase with fallback to localStorage
- **State**: React state with centralized management in App.tsx

### Application Structure
This is a task management app with AI-powered features. The main application logic lives in `src/components/App.tsx` which:
- Manages all application state for items
- Handles routing through filter-based navigation
- Orchestrates data flow between components via props

### Data Model
All items follow the `MindFlowItem` interface (`src/types/index.ts`):
- **Core fields**: id, title, completed, createdAt, type, summary
- **Item types**: 'Tarefa', 'Ideia', 'Nota', 'Lembrete', 'Financeiro', 'Reunião'
- **Optional fields**: dueDate, subtasks, suggestions, chatHistory, amount, transactionType, meetingDetails, notes
- Items persist to Supabase when authenticated, fallback to localStorage

### AI Integration Architecture
AI functionality is server-side only via API routes:
- `/api/inbox/analyze` - Text analysis and categorization
- `/api/subtasks/generate` - Subtask generation
- `/api/chat/for-item` - Contextual chat for items
- `/api/assistant/route.ts` - Main assistant endpoint
- `/api/assistant/act/route.ts` - Tool execution endpoint
- `/api/assistant/chat/route.ts` - Chat streaming endpoint
- AI provider configured via `AI_SDK_PROVIDER` env var (google/openrouter)
- Uses `src/server/aiProvider.ts` for model instantiation

### Component Organization
- All components in `src/components/` (flat structure, no sub-folders)
- Specialized pages: CalendarPage, FinancePage, MeetingPage, UpdatesPage
- Core components: App, Sidebar, TaskList, DetailPanel, TalkModeModal
- UI components follow PascalCase naming, one component per file

### MCP (Model Context Protocol) Integration
- MCP servers configured in `/api/mcp/servers/`
- Server management, tool discovery, and execution endpoints
- Integration with AI assistant for extended tool capabilities

### Key Patterns
- **Portuguese UI**: All user-facing text in Portuguese
- **Error handling**: Graceful fallbacks (Supabase → localStorage)
- **Type safety**: Comprehensive TypeScript interfaces
- **Component composition**: Props-based data flow from App.tsx
- **API routes**: All AI/external service calls through Next.js API routes