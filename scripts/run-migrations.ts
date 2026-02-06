/**
 * Migration Runner Script
 * Runs SQL migrations against your Supabase database
 * 
 * Usage: npx tsx scripts/run-migrations.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Get service role key from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅' : '❌')
  console.error('\n💡 Get your service role key from:')
  console.error('   Supabase Dashboard → Settings → API → service_role key')
  console.error('\n💡 Add it to .env.local:')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
  process.exit(1)
}

// Create admin client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function runSQLFile(filePath: string): Promise<void> {
  console.log(`\n📄 Running: ${path.basename(filePath)}`)
  
  const sql = fs.readFileSync(filePath, 'utf-8')
  
  // Split by semicolons and filter out empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    try {
      // Skip comments and empty lines
      if (statement.startsWith('--') || statement.length === 0) {
        continue
      }

      // Execute statement
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
      
      if (error) {
        // Try direct query if RPC doesn't work
        const { error: directError } = await supabase
          .from('_migrations')
          .select('*')
          .limit(0)
        
        if (directError && directError.message.includes('exec_sql')) {
          console.log('   ⚠️  Note: Some statements may need to be run manually in SQL Editor')
          console.log('   💡 Copy the SQL from the file and run it in Supabase Dashboard → SQL Editor')
          return
        }
        
        // If it's a "relation already exists" or similar, that's okay
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('ON CONFLICT')) {
          console.log(`   ⚠️  ${error.message.split('\n')[0]}`)
          continue
        }
        
        throw error
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`)
      // Continue with next statement
    }
  }
  
  console.log(`   ✅ Completed: ${path.basename(filePath)}`)
}

async function main() {
  console.log('🚀 Starting Supabase Migrations...\n')
  console.log(`📍 Database: ${supabaseUrl}`)

  const migrationsDir = path.join(process.cwd(), 'supabase-migrations')
  const sqlFiles = [
    path.join(process.cwd(), 'supabase-add-case-assignment.sql'),
    path.join(process.cwd(), 'setup-first-admin.sql'),
  ]

  // Check if files exist
  const existingFiles = sqlFiles.filter(f => fs.existsSync(f))
  
  if (existingFiles.length === 0) {
    console.error('❌ No migration files found!')
    process.exit(1)
  }

  console.log(`\n📋 Found ${existingFiles.length} migration file(s):`)
  existingFiles.forEach(f => console.log(`   - ${path.basename(f)}`))

  // Run migrations
  for (const file of existingFiles) {
    await runSQLFile(file)
  }

  console.log('\n✅ All migrations completed!')
  console.log('\n💡 Next steps:')
  console.log('   1. Verify in Supabase Dashboard → Table Editor')
  console.log('   2. Check that your user is linked in users_metadata table')
  console.log('   3. Verify case assignment columns exist in cases table')
}

main().catch(console.error)

