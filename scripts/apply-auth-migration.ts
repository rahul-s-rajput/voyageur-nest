import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from current process (ensure they're set before running)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyAuthMigration() {
  try {
    console.log('🔄 Applying Supabase Auth schema migration...');

    const migrationPath = path.join(process.cwd(), 'supabase_auth_schema_migration.sql');
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found at ${migrationPath}`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);
          if (error.message?.includes('already exists')) {
            console.log('⚠️  Object already exists, continuing...');
            continue;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (e) {
        console.error(`❌ Exception executing statement ${i + 1}:`, e);
      }
    }

    // Verify tables exist
    console.log('🔍 Verifying auth objects...');
    const tables = ['user_roles', 'admin_profiles'];
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.error(`❌ Table ${table} not accessible:`, error);
        } else {
          console.log(`✅ Table ${table} exists and is accessible`);
        }
      } catch (e) {
        console.error(`❌ Error checking table ${table}:`, e);
      }
    }

    console.log('🎉 Supabase Auth schema migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyAuthMigration().catch(console.error);
