import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function applyDeviceTokensMigration() {
  try {
    console.log('🔄 Applying Device Tokens migration...')

    const migrationPath = path.join(process.cwd(), 'device_tokens_migration.sql')
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found at ${migrationPath}`)
      process.exit(1)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--') && !s.startsWith('/*'))

    console.log(`📝 Found ${statements.length} SQL statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
      console.log(`📄 Statement: ${statement.substring(0, 100)}...`)

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error)
          if (error.message?.includes('already exists')) {
            console.log('⚠️  Object already exists, continuing...')
            continue
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      } catch (e) {
        console.error(`❌ Exception executing statement ${i + 1}:`, e)
      }
    }

    // Verify the migration by checking if the table exists
    console.log('🔍 Verifying migration...')
    try {
      const { data, error } = await supabase.from('device_tokens').select('*').limit(1)
      if (error) {
        console.error('❌ Table device_tokens not accessible:', error)
      } else {
        console.log('✅ Table device_tokens exists and is accessible')
      }
    } catch (e) {
      console.error('❌ Error checking table device_tokens:', e)
    }

    console.log('🎉 Device Tokens migration completed!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyDeviceTokensMigration().catch(console.error)
