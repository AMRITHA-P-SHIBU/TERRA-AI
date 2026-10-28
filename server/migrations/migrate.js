import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, testConnection } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('🔄 Checking database connectivity...');
  const conn = await testConnection();

  if (!conn.connected) {
    console.error('❌ Could not connect to PostgreSQL database:');
    console.error(conn.error);
    console.error('\nPlease verify your DATABASE_URL in server/.env.');
    console.error('Example: DATABASE_URL=postgresql://postgres:[password]@db.[id].supabase.co:5432/postgres\n');
    process.exit(1);
  }

  console.log(`✅ Connected to database: "${conn.database}" at ${conn.time}`);

  try {
    const migrationFile = path.join(__dirname, '001_initial_schema.sql');
    console.log(`📦 Running migration: ${path.basename(migrationFile)}...`);

    const sql = fs.readFileSync(migrationFile, 'utf8');
    await pool.query(sql);

    console.log('🎉 Migrations executed successfully!');
    console.log('Tables created / verified:');
    console.log('  - users');
    console.log('  - organizations');
    console.log('  - organization_members');
    console.log('  - organization_approval_logs');
    console.log('  - auth_tokens');
    console.log('Indexes created / verified.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
