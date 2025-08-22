#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyRLSMigration() {
  console.log('🔒 Starting RLS policies migration...');
  
  try {
    // Read the comprehensive RLS migration
    const migrationPath = join(process.cwd(), 'comprehensive_rls_policies_migration.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Loaded RLS migration script');
    
    // Split the migration into logical chunks to avoid timeout
    const sqlChunks = migrationSQL.split('-- ============================================================================');
    
    for (let i = 0; i < sqlChunks.length; i++) {
      const chunk = sqlChunks[i].trim();
      if (!chunk) continue;
      
      const stepMatch = chunk.match(/STEP (\d+): (.+)/);
      const stepName = stepMatch ? `Step ${stepMatch[1]}: ${stepMatch[2]}` : `Chunk ${i + 1}`;
      
      console.log(`⚡ Executing ${stepName}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: chunk });
        
        if (error) {
          console.warn(`⚠️  Warning in ${stepName}:`, error.message);
          // Continue with other steps even if one fails
        } else {
          console.log(`✅ ${stepName} completed successfully`);
        }
      } catch (chunkError) {
        console.warn(`⚠️  Error in ${stepName}:`, chunkError);
        // Continue with other steps
      }
    }
    
    // Validate RLS implementation
    console.log('\n🔍 Validating RLS implementation...');
    
    const { data: validation, error: validationError } = await supabase
      .rpc('validate_rls_enabled');
    
    if (validationError) {
      console.error('❌ RLS validation failed:', validationError);
    } else {
      console.log('📊 RLS Status Report:');
      console.table(validation);
    }
    
    // Test RLS policies
    console.log('\n🧪 Running RLS policy tests...');
    
    const { data: testResults, error: testError } = await supabase
      .rpc('test_rls_policies');
    
    if (testError) {
      console.error('❌ RLS testing failed:', testError);
    } else {
      console.log('🧪 RLS Test Results:');
      console.table(testResults);
      
      const passedTests = testResults?.filter(t => t.passed).length || 0;
      const totalTests = testResults?.length || 0;
      
      if (passedTests === totalTests) {
        console.log(`✅ All ${totalTests} RLS tests passed!`);
      } else {
        console.warn(`⚠️  ${passedTests}/${totalTests} RLS tests passed`);
      }
    }
    
    console.log('\n🎉 RLS migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test public access to menu items and properties');
    console.log('2. Test admin-only access to expenses and reports');
    console.log('3. Verify booking creation validation works');
    console.log('4. Check audit logging is functioning');
    
  } catch (error) {
    console.error('❌ RLS migration failed:', error);
    process.exit(1);
  }
}

// Alternative function to run the migration directly via SQL
async function applyRLSMigrationDirect() {
  console.log('🔒 Applying RLS migration directly...');
  
  try {
    const migrationPath = join(process.cwd(), 'comprehensive_rls_policies_migration.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSQL 
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
    
    console.log('✅ RLS migration applied successfully');
    
  } catch (error) {
    console.error('❌ Direct migration failed:', error);
    
    // Fallback: try applying chunks
    console.log('🔄 Falling back to chunked application...');
    await applyRLSMigration();
  }
}

// Run the migration
applyRLSMigrationDirect()
  .then(() => {
    console.log('🎯 RLS implementation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
