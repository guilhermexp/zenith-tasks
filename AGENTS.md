# Repository Guidelines & Agent Context

## Quick Start for New Agents

This is a **Next.js 15 task management application** with AI-powered features, MCP integration, and real-time database synchronization. The application is built in Portuguese but follows English coding conventions.

**Key Facts:**
- 35 files currently modified (pending review)
- Recent refactor: AI SDK v5 upgrade + MCP integration
- Documentation reorganized into structured ai_* directories
- All AI operations are server-side via API routes
- Both Supabase and localStorage support (graceful fallback)

**First Time? Read These:**
1. `/CLAUDE.md` - Architecture and best practices
2. `/README.md` - Feature overview and setup
3. `/ai_docs/` directory - Detailed technical documentation

# Repository Guidelines

## Project Structure & Module Organization
- App router: `src/app/**` (pages, API routes under `src/app/api/**`).
- UI components: `src/components/**` and `src/components/ui/**`.
- Domain/services: `src/services/**` (AI, MCP, database) and `src/server/**` (server-only helpers).
- State and utils: `src/state/**`, `src/utils/**`, `src/lib/**`.
- Types: `src/types/**`.
- Supabase migrations: `supabase/migrations/**`.
- Shared package (local lib): `packages/shared/**`.

## Build, Test, and Development Commands
- `npm run dev` — Start Next.js locally on `http://localhost:3457`.
- `npm run build` — Production build.
- `npm start` — Run production build on port 3456.
- `npm run lint` / `npm run lint:ci` — Lint code (CI blocks warnings).
- `npm run typecheck` — TypeScript type checking.
- MCP test server (optional): `node test-mcp-server.js` (runs on `:8765`).
- API smoke tests: `bash test-suite.sh` (expects dev server running).
- MCP integration test: `bash test-mcp-automated.sh` (requires `jq`, dev server, optional MCP test server).
- Shared package build: `cd packages/shared && npm run build`.

## Coding Style & Naming Conventions
- Language: TypeScript, strict mode enabled.
- Linting: ESLint (`next`, `next/core-web-vitals`). Rules: `no-console` (allow `warn`/`error`), `import/order` with alphabetical grouping.
- Imports: prefer alias `@/*` for `src/*`.
- Naming: React components `PascalCase.tsx` (e.g., `TaskList.tsx`); hooks `use-*.ts(x)` (e.g., `use-click-outside.tsx`); utilities `camelCase.ts`.
- Indentation/formatting: 2 spaces; keep diffs small and focused.

## Testing Guidelines
- Smoke/API: use `test-suite.sh` and `test-mcp-automated.sh` while `npm run dev` is running.
- Add unit tests for new logic under `src/**` using your preferred TS test runner (Vitest/Jest) if you introduce one; name files `*.test.ts` or `*.test.tsx`.
- Aim for meaningful coverage around `src/services/**` and parsers.

## Commit & Pull Request Guidelines
- Prefer Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Keep scope small; write imperative, English subjects. Examples: `feat(ai): add meeting notes parser`, `fix(api): handle 429 in assistant route`.
- Before opening a PR: run `npm run lint`, `npm run typecheck`, and relevant tests; add screenshots for UI changes and link related issues.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local` (git-ignored). Reference `.env.example` / `.env.local.example`.
- Use server-only envs for AI keys (e.g., `GEMINI_API_KEY`); do not expose in client code.
- Avoid logging sensitive data; prefer `console.warn/error` for diagnostics.
- For Supabase, do not commit service keys; use environment variables and rotate leaked keys.

## AI Services & Tools

### Available Tools (17 Total)
See `/ai_docs/TOOLS_DISPONIVEIS.md` for complete tool specifications:

**Item Management:** createItem, updateItem, deleteItem, markAsDone, setDueDate
**Search & Query:** searchItems, listItems, getItemDetails, listAgenda
**Analysis:** analyzeInbox, getStatistics, getFinancialSummary
**Subtasks:** generateSubtasks, addSubtask, toggleSubtask
**Interaction:** chatWithItem, summarizeMeeting

### AI SDK Integration
- Provider: Google Gemini (configurable via `AI_SDK_PROVIDER` env var)
- Location: `src/server/aiProvider.ts` and `src/server/ai/` directory
- Model: `gemini-2.5-flash` (configurable per endpoint)
- Streaming: Supported for chat and assistant endpoints
- Error handling: Automatic fallback and retry logic

### MCP (Model Context Protocol)
- Registry: `/api/mcp/servers/`
- Marketplace: Available servers in `src/services/mcp/marketplace-registry.ts`
- Client: TypeScript MCP client in `src/services/mcp/client.ts`
- Auth: OAuth2, API key, and Basic auth support
- See `/ai_docs/MARKETPLACE_IMPLEMENTATION.md` for details

## Documentation Structure

### AI-Specific Directories
- **ai_changelog/** - Version history and release notes
- **ai_docs/** - Technical guides, tool specifications, integration docs
- **ai_issues/** - Bug reports and known limitations
- **ai_research/** - Experiments and technology evaluations
- **ai_specs/** - Feature and API specifications

### Key Documents
- `/CLAUDE.md` - Development guidelines and best practices
- `/README.md` - Project overview and quick start
- `/AGENTS.md` - This file; guidelines for AI agents and developers
- `./ai_docs/TOOLS_DISPONIVEIS.md` - Complete AI assistant tool specs
- `./ai_docs/MARKETPLACE_IMPLEMENTATION.md` - MCP marketplace guide
- `./ai_docs/CLERK_CONFIGURADO.md` - Authentication setup

## Critical Context for Implementation

### 35 Modified Files Pending Review
Recent changes include:
- AI SDK v5 upgrade (breaking changes in streaming API)
- MCP integration enhancements
- Error handling improvements
- Code cleanup and organization

**Before committing changes:** Run full test suite and verify with DevTools

### Data Model
All items use `MindFlowItem` interface (`src/types/index.ts`):
```
- Core: id, title, completed, createdAt, type, summary
- Types: Tarefa, Ideia, Nota, Lembrete, Financeiro, Reunião
- Optional: dueDate, subtasks, suggestions, chatHistory, amount, transactionType, meetingDetails, notes
```

### Database & Storage
- Primary: Supabase (PostgreSQL + Realtime)
- Fallback: Browser localStorage (auto-sync when online)
- Auth: Clerk (with dev bypass mode)
- Migration files: `supabase/migrations/`

