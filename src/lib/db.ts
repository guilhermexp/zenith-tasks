import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

import * as schema from '@/db/schema';

const connectionString = process.env.DATABASE_URL;

export class DatabaseNotConfiguredError extends Error {
  constructor(message = 'Database is not configured. Set DATABASE_URL to enable persistence.') {
    super(message);
    this.name = 'DatabaseNotConfiguredError';
  }
}

type DatabaseClient = ReturnType<typeof drizzle<typeof schema>>;

const missingDatabaseMessage =
  'DATABASE_URL environment variable is not set. Database-backed features are disabled.';

const createDisabledDb = (): DatabaseClient => {
  const handler: ProxyHandler<object> = {
    get() {
      throw new DatabaseNotConfiguredError();
    },
  };

  return new Proxy({}, handler) as DatabaseClient;
};

const dbInstance: DatabaseClient = (() => {
  if (!connectionString) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(missingDatabaseMessage);
    }

    console.warn(`[database] ${missingDatabaseMessage}`);
    return createDisabledDb();
  }

  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
})();

export const db = dbInstance;
export const isDatabaseConfigured = Boolean(connectionString);
