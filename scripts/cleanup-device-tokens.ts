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

async function cleanupDeviceTokens() {
  try {
    console.log('🧹 Starting Device Tokens cleanup...')

    const cleanupPath = path.join(process.cwd(), 'device_tokens_cleanup.sql')
    if (!fs.existsSync(cleanupPath)) {
      console.error(`❌ Cleanup file not found at ${cleanupPath}`)
      process.exit(1)
    }

    const cleanupSQL = fs.readFileSync(cleanupPath, 'utf8')

    const statements = cleanupSQL
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

    // Verification: check that tokens are deactivated
    try {
      const { data, error } = await supabase.from('device_tokens').select('count').eq('is_active', true)
      if (error) {
        console.error('❌ Error verifying device tokens active state:', error)
      } else {
        console.log('🔎 Active tokens count:', data)
      }
    } catch (e) {
      console.error('❌ Error running verification query:', e)
    }

    console.log('🎉 Device Tokens cleanup completed!')
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

cleanupDeviceTokens().catch(console.error)
