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

async function applyMigration() {
  try {
    console.log('🔄 Applying database migration...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'fix_checkin_issues_migration.sql');
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
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      });
      
      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error);
        // Try direct execution for some statements
        try {
          const { data: directData, error: directError } = await supabase
            .from('checkin_data')
            .select('*')
            .limit(1);
          
          if (directError) {
            console.error('❌ Direct query also failed:', directError);
          } else {
            console.log('✅ Direct query succeeded, continuing...');
          }
        } catch (e) {
          console.error('❌ Exception during direct query:', e);
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    // Verify the migration by checking if the column exists
    console.log('🔍 Verifying migration...');
    
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'checkin_data')
      .eq('table_schema', 'public');
    
    if (columnError) {
      console.error('❌ Error checking columns:', columnError);
    } else {
      const hasIdPhotoUrls = columns?.some(col => col.column_name === 'id_photo_urls');
      if (hasIdPhotoUrls) {
        console.log('✅ Migration successful! id_photo_urls column exists.');
      } else {
        console.log('⚠️  id_photo_urls column not found. Migration may need manual execution.');
        console.log('Available columns:', columns?.map(c => c.column_name).join(', '));
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function createStorageBucket() {
  try {
    console.log('🪣 Creating storage bucket...');
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'id-documents');
    
    if (bucketExists) {
      console.log('✅ Storage bucket "id-documents" already exists');
      return;
    }
    
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('id-documents', {
      public: false,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      fileSizeLimit: 10485760 // 10MB
    });
    
    if (error) {
      console.error('❌ Error creating bucket:', error);
      console.log('📝 Please create the "id-documents" bucket manually in Supabase dashboard');
    } else {
      console.log('✅ Storage bucket "id-documents" created successfully');
    }
    
  } catch (error) {
    console.error('❌ Error with storage bucket:', error);
  }
}

async function main() {
  console.log('🚀 Starting migration process...');
  console.log(`🔗 Connected to: ${SUPABASE_URL}`);
  
  await applyMigration();
  await createStorageBucket();
  
  console.log('🎉 Migration process completed!');
}

main().catch(console.error);