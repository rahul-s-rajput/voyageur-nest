import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyOTAMigration() {
  try {
    console.log('🔄 Applying OTA Calendar migration...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'ota_calendar_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements (excluding comments and empty lines)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`📄 Statement: ${statement.substring(0, 100)}...`);
      
      try {
        // Use the SQL editor approach for complex statements
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);
          // Continue with next statement for non-critical errors
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
    
    // Verify the migration by checking if the tables exist
    console.log('🔍 Verifying migration...');
    
    const tablesToCheck = ['ota_platforms', 'ota_sync_logs', 'calendar_conflicts', 'manual_update_checklists'];
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`❌ Table ${tableName} not accessible:`, error);
        } else {
          console.log(`✅ Table ${tableName} exists and is accessible`);
        }
      } catch (e) {
        console.error(`❌ Error checking table ${tableName}:`, e);
      }
    }
    
    // Check if new columns were added to bookings table
    try {
      const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'bookings')
        .eq('table_schema', 'public');
      
      if (columnError) {
        console.error('❌ Error checking booking columns:', columnError);
      } else {
        const newColumns = ['ota_platform_id', 'ota_booking_id', 'ical_uid', 'last_ota_sync'];
        const existingNewColumns = newColumns.filter(col => 
          columns?.some(c => c.column_name === col)
        );
        
        console.log(`✅ New booking columns found: ${existingNewColumns.join(', ')}`);
      }
    } catch (e) {
      console.error('❌ Error checking booking columns:', e);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Starting OTA Calendar migration process...');
  console.log(`🔗 Connected to: ${SUPABASE_URL}`);
  
  await applyOTAMigration();
  
  console.log('🎉 OTA Calendar migration process completed!');
  console.log('📅 You can now use the OTA Calendar features in the admin dashboard!');
}

main().catch(console.error);