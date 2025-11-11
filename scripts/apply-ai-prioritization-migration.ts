import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_8ZVAYbe3PkSz@ep-bitter-wind-aebg6w19-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function applyMigration() {
  const sql = neon(DATABASE_URL);

  const migrationPath = path.join(__dirname, '../drizzle/migrations/0002_add_ai_prioritization_tables.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Applying migration: 0002_add_ai_prioritization_tables.sql');

  try {
    // Split by statement breakpoint and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await sql.query(statement, []);
    }

    console.log('✅ Migration applied successfully!');

    // Register migration in drizzle schema
    await sql`
      CREATE SCHEMA IF NOT EXISTS drizzle
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `;

    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES ('0002_add_ai_prioritization_tables', ${Date.now()})
      ON CONFLICT DO NOTHING
    `;

    console.log('✅ Migration registered in drizzle schema');

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('⚠️  Tables already exist, skipping creation');
    } else {
      console.error('❌ Error applying migration:', error);
      throw error;
    }
  }
}

applyMigration()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
