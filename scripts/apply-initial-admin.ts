import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment or .env file.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function applyInitialAdmin() {
  try {
    console.log('🔄 Applying initial admin setup...')

    const sqlPath = path.join(process.cwd(), 'initial_admin_setup.sql')
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ SQL file not found at ${sqlPath}`)
      process.exit(1)
    }

    const sql = fs.readFileSync(sqlPath, 'utf8')

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'))

    console.log(`📝 Found ${statements.length} SQL statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error)
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      } catch (e) {
        console.error(`❌ Exception executing statement ${i + 1}:`, e)
      }
    }

    console.log('🎉 Initial admin setup completed.')
    console.log('ℹ️  Reminder: Ensure the email in initial_admin_setup.sql matches an existing user in Supabase Auth.')
  } catch (error) {
    console.error('❌ Initial admin setup failed:', error)
    process.exit(1)
  }
}

applyInitialAdmin().catch(console.error)
