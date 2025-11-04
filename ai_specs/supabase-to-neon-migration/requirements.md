# Requirements Document: Supabase to Neon Migration

## Introduction

This document outlines the requirements for completely migrating the Zenith Tasks application from Supabase to Neon PostgreSQL database. The migration involves removing all Supabase dependencies, creating proper database migrations, setting up Neon integration with Drizzle ORM, and ensuring seamless compatibility with the existing Clerk authentication system.

## Requirements

### Requirement 1: Complete Supabase Removal

**User Story:** As a developer, I want all Supabase code and dependencies removed from the application, so that the codebase is clean and only uses Neon PostgreSQL.

#### Acceptance Criteria

1. WHEN the package.json is reviewed THEN the system SHALL NOT contain @supabase/supabase-js dependency
2. WHEN the package.json is reviewed THEN the system SHALL NOT contain @supabase/auth-helpers-nextjs dependency
3. WHEN the codebase is scanned THEN the system SHALL NOT contain any import statements from @supabase packages
4. WHEN src/lib/supabase.ts is checked THEN the file SHALL be deleted
5. WHEN vercel.json is reviewed THEN the system SHALL NOT contain NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables
6. WHEN all service files are reviewed THEN the system SHALL NOT contain any createClient calls from Supabase

### Requirement 2: Neon PostgreSQL Setup

**User Story:** As a developer, I want Neon PostgreSQL properly configured with Drizzle ORM, so that the application has a modern, type-safe database layer.

#### Acceptance Criteria

1. WHEN package.json is reviewed THEN the system SHALL include drizzle-orm dependency
2. WHEN package.json is reviewed THEN the system SHALL include @neondatabase/serverless dependency
3. WHEN package.json is reviewed THEN the system SHALL include drizzle-kit as dev dependency
4. WHEN src/lib/db.ts is created THEN the file SHALL export a configured Neon database client
5. WHEN environment variables are reviewed THEN the system SHALL include DATABASE_URL for Neon connection string
6. WHEN drizzle.config.ts is created THEN the file SHALL configure Drizzle with Neon driver and migration settings

### Requirement 3: Database Schema Migrations

**User Story:** As a developer, I want complete database schema migrations created, so that all existing tables are properly recreated in Neon.

#### Acceptance Criteria

1. WHEN migrations directory is reviewed THEN the system SHALL contain a migration for mind_flow_items table with all columns (id, user_id, title, completed, created_at, updated_at, summary, item_type, due_date, due_date_iso, suggestions, is_generating_subtasks, transaction_type, amount, is_recurring, payment_method, is_paid, chat_history, meeting_details, transcript, notes)
2. WHEN migrations directory is reviewed THEN the system SHALL contain a migration for subtasks table with all columns (id, parent_item_id, title, completed, created_at, position)
3. WHEN migrations directory is reviewed THEN the system SHALL contain a migration for mcp_server_configs table with all columns (id, user_id, name, base_url, api_key, headers_json, tools_path, call_path, created_at)
4. WHEN migrations are reviewed THEN each table migration SHALL include proper foreign key constraints
5. WHEN migrations are reviewed THEN each table migration SHALL include proper indexes for performance
6. WHEN migrations are reviewed THEN the user_id columns SHALL be properly typed as VARCHAR to match Clerk user IDs

### Requirement 4: Drizzle Schema Definition

**User Story:** As a developer, I want TypeScript schema definitions using Drizzle ORM, so that database operations are type-safe and maintainable.

#### Acceptance Criteria

1. WHEN src/db/schema.ts is created THEN the file SHALL define mindFlowItems table schema matching the migration
2. WHEN src/db/schema.ts is created THEN the file SHALL define subtasks table schema matching the migration
3. WHEN src/db/schema.ts is created THEN the file SHALL define mcpServerConfigs table schema matching the migration
4. WHEN schema definitions are reviewed THEN each schema SHALL use proper Drizzle column types (text, boolean, timestamp, json, numeric)
5. WHEN schema definitions are reviewed THEN foreign key relationships SHALL be properly defined using relations
6. WHEN schema types are exported THEN the system SHALL provide InferModel types for TypeScript usage

### Requirement 5: Database Service Layer Migration

**User Story:** As a developer, I want the existing ItemsService refactored to use Drizzle ORM with Neon, so that all database operations work with the new database.

#### Acceptance Criteria

1. WHEN src/services/database/items.ts is reviewed THEN the service SHALL import from drizzle-orm instead of @supabase
2. WHEN ItemsService.loadItems is called THEN the system SHALL query Neon database using Drizzle select statements
3. WHEN ItemsService.createItem is called THEN the system SHALL insert into Neon database using Drizzle insert statements
4. WHEN ItemsService.updateItem is called THEN the system SHALL update Neon database using Drizzle update statements
5. WHEN ItemsService.deleteItem is called THEN the system SHALL delete from Neon database using Drizzle delete statements
6. WHEN ItemsService methods execute THEN the system SHALL maintain the same error handling and logging patterns
7. WHEN database operations fail THEN the system SHALL provide meaningful error messages for debugging

### Requirement 6: Additional Database Services Migration

**User Story:** As a developer, I want all database-related services migrated to Neon, so that no Supabase dependencies remain in the service layer.

#### Acceptance Criteria

1. WHEN src/services/database/data-validator.ts is reviewed THEN the service SHALL use Drizzle ORM instead of Supabase client
2. WHEN src/services/database/performance-monitor.ts is reviewed THEN the service SHALL use Drizzle ORM instead of Supabase client
3. WHEN src/services/database/maintenance-scheduler.ts is reviewed THEN the service SHALL use Drizzle ORM instead of Supabase client
4. WHEN these services execute database queries THEN the system SHALL use Drizzle query syntax
5. IF any service is no longer needed THEN the file SHALL be removed with documentation of why

### Requirement 7: React Hooks Migration

**User Story:** As a developer, I want React hooks updated to work with the new database service, so that components continue to function correctly.

#### Acceptance Criteria

1. WHEN src/hooks/useSupabaseItems.ts is reviewed THEN the hook SHALL be renamed to useItems.ts
2. WHEN useItems hook is implemented THEN the hook SHALL use the migrated ItemsService
3. WHEN useItems hook loads data THEN the system SHALL use Clerk user context for user_id
4. WHEN useItems hook encounters errors THEN the system SHALL maintain the same error handling and fallback to localStorage
5. WHEN components import the hook THEN all imports SHALL be updated to use useItems instead of useSupabaseItems

### Requirement 8: API Routes Migration

**User Story:** As a developer, I want all API routes updated to use Neon database, so that the backend API continues to work correctly.

#### Acceptance Criteria

1. WHEN src/app/api/debug/health/route.ts is reviewed THEN the route SHALL use Drizzle to check database health instead of Supabase
2. WHEN src/app/api/inbox/analyze/route.ts is reviewed THEN the route SHALL use ItemsService with Neon instead of direct Supabase calls
3. WHEN API routes use authentication THEN the system SHALL continue using Clerk auth helper
4. WHEN API routes query the database THEN the system SHALL use the new database service layer

### Requirement 9: Clerk Integration Verification

**User Story:** As a developer, I want to verify Clerk authentication works seamlessly with Neon, so that user authentication and data isolation are maintained.

#### Acceptance Criteria

1. WHEN a user signs in via Clerk THEN the system SHALL use the Clerk user ID as user_id in database queries
2. WHEN user data is loaded THEN the system SHALL filter by Clerk user ID to ensure data isolation
3. WHEN middleware runs THEN Clerk authentication SHALL protect routes as before
4. WHEN useUser hook is called THEN components SHALL receive Clerk user context correctly
5. WHEN new items are created THEN the system SHALL associate them with the current Clerk user ID

### Requirement 10: Environment Variables and Configuration

**User Story:** As a developer, I want proper environment variable configuration documented, so that deployment to production is straightforward.

#### Acceptance Criteria

1. WHEN .env.example is created THEN the file SHALL include DATABASE_URL with Neon connection string format
2. WHEN .env.example is reviewed THEN the file SHALL include all required Clerk environment variables
3. WHEN documentation is created THEN the system SHALL provide instructions for obtaining Neon connection string
4. WHEN vercel.json is updated THEN the file SHALL include DATABASE_URL in environment variables
5. WHEN deployment documentation is created THEN the system SHALL explain how to set secrets in Vercel

### Requirement 11: Testing and Validation

**User Story:** As a developer, I want comprehensive testing to ensure the migration works correctly, so that no data or functionality is lost.

#### Acceptance Criteria

1. WHEN migration is complete THEN all existing pages SHALL load without errors
2. WHEN items are created THEN the system SHALL successfully save to Neon database
3. WHEN items are updated THEN the system SHALL successfully update in Neon database
4. WHEN items are deleted THEN the system SHALL successfully delete from Neon database
5. WHEN subtasks are managed THEN the system SHALL handle subtask operations correctly
6. WHEN the application is tested THEN no console errors related to Supabase SHALL appear
7. WHEN TypeScript compilation runs THEN the system SHALL compile without type errors

### Requirement 12: Type System Migration

**User Story:** As a developer, I want TypeScript types updated to reflect the new database schema, so that type safety is maintained throughout the application.

#### Acceptance Criteria

1. WHEN src/types/index.ts is reviewed THEN MindFlowItem type SHALL match the new Drizzle schema
2. WHEN src/types/index.ts is reviewed THEN Subtask type SHALL match the new Drizzle schema
3. WHEN database query results are used THEN TypeScript SHALL infer correct types from Drizzle schema
4. WHEN the codebase is type-checked THEN no type errors SHALL exist related to database types

## Out of Scope

The following items are explicitly NOT included in this migration:

- Data migration from existing Supabase database to Neon (will be handled separately if needed)
- UI/UX changes to the application interface
- Changes to Clerk authentication configuration
- Performance optimization beyond basic indexing
- Addition of new features or database tables
- Migration of any non-database Supabase features (if they exist)
- Changes to the AI/chat functionality
- Modifications to the task management business logic