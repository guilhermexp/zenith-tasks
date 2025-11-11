/**
 * Vitest setup file
 * Sets up test environment before tests run
 */

// Set required environment variables for tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
// NODE_ENV is set by the test runner automatically
