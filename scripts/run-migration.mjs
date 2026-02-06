/**
 * Run database migration script
 * Usage: node scripts/run-migration.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('Reading migration file...')
  const migrationPath = join(__dirname, '../supabase/migrations/20241204_add_case_detail_tables.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  console.log('Running migration...')
  console.log('Migration SQL length:', sql.length, 'characters')

  // Split by major sections and run each
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    console.error('Migration failed:', error)

    // Try running directly if rpc doesn't exist
    console.log('\nTrying direct query approach...')

    // We can't run raw SQL directly with the JS client
    // Instead, let's check what tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    if (tablesError) {
      console.log('Cannot query information_schema directly.')
      console.log('\nPlease run the migration manually in Supabase SQL Editor.')
      console.log('Migration file:', migrationPath)
    } else {
      console.log('Existing tables:', tables?.map(t => t.table_name))
    }
    return
  }

  console.log('Migration completed successfully!')
  console.log(data)
}

// Check if lat_applications table exists
async function checkTables() {
  console.log('Checking existing tables...\n')

  const tablesToCheck = [
    'lat_applications',
    'ocf18_submissions',
    'communications',
    'disbursements',
    'expert_reports',
    'settlement_offers',
    'medical_providers',
    'defendants'
  ]

  for (const table of tablesToCheck) {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .limit(1)

    if (error) {
      console.log(`❌ ${table}: ${error.message}`)
    } else {
      console.log(`✓ ${table}: exists`)
    }
  }
}

async function main() {
  console.log('='.repeat(50))
  console.log('Database Migration Check')
  console.log('='.repeat(50))
  console.log('')

  await checkTables()

  console.log('\n' + '='.repeat(50))
  console.log('')
}

main().catch(console.error)
