import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMenuMigration() {
  try {
    console.log('🔄 Applying Menu Management migration...');

    const migrationPath = path.join(process.cwd(), 'menu_management_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`📄 Statement: ${statement.substring(0, 120)}...`);

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

    // Quick sanity checks
    console.log('🔍 Verifying migration...');
    for (const tableName of ['menu_categories', 'menu_items']) {
      try {
        const { error } = await supabase.from(tableName).select('*').limit(1);
        if (error) console.error(`❌ Table ${tableName} not accessible:`, error);
        else console.log(`✅ Table ${tableName} exists and is accessible`);
      } catch (e) {
        console.error(`❌ Error checking table ${tableName}:`, e);
      }
    }

    console.log('🎉 Menu Management migration process completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMenuMigration().catch(console.error);

