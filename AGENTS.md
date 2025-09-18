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

