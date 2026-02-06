#!/usr/bin/env node

/**
 * Execute SQL Migrations via Supabase REST API
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

require('dotenv').config({ path: '.env.local' })

const https = require('https')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('\n❌ Missing environment variables!')
  console.error('\n📝 Add to .env.local:')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
  console.error('\n💡 Get it from: Supabase Dashboard → Settings → API → service_role key')
  console.error('   ⚠️  Keep this secret! Never commit it to git.\n')
  process.exit(1)
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

if (!projectRef) {
  console.error('❌ Invalid Supabase URL format')
  process.exit(1)
}

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const sqlEncoded = encodeURIComponent(sql)
    const url = `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql?sql=${sqlEncoded}`
    
    const options = {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    }

    https.get(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    }).on('error', reject)
  })
}

async function runMigration(filePath) {
  console.log(`\n📄 Running: ${path.basename(filePath)}`)
  
  const sql = fs.readFileSync(filePath, 'utf-8')
  
  // Remove comments and split by semicolons
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      s = s.replace(/--.*$/gm, '').trim() // Remove inline comments
      return s.length > 0 && !s.startsWith('--')
    })

  for (const statement of statements) {
    if (!statement || statement.length < 10) continue
    
    try {
      await executeSQL(statement)
      console.log(`   ✅ Executed statement`)
    } catch (error) {
      // Some errors are okay (like "already exists")
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate') ||
          error.message.includes('ON CONFLICT')) {
        console.log(`   ⚠️  ${error.message.split('\n')[0]}`)
      } else {
        console.error(`   ❌ Error: ${error.message}`)
        // Continue with next statement
      }
    }
  }
  
  console.log(`   ✅ Completed: ${path.basename(filePath)}`)
}

async function main() {
  console.log('\n🚀 Executing Supabase Migrations...\n')
  console.log(`📍 Project: ${projectRef}`)

  const migrations = [
    'supabase-add-case-assignment.sql',
    'setup-first-admin.sql',
  ]

  for (const file of migrations) {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      // Skip setup-first-admin.sql if it hasn't been edited
      if (file === 'setup-first-admin.sql') {
        const content = fs.readFileSync(filePath, 'utf-8')
        if (content.includes('your-email@example.com')) {
          console.log(`\n⚠️  Skipping ${file} - please edit it first!`)
          console.log('   Replace "your-email@example.com" with your actual email')
          console.log('   Replace "Your Name" with your actual name\n')
          continue
        }
      }
      
      await runMigration(filePath)
    } else {
      console.log(`\n⚠️  File not found: ${file}`)
    }
  }

  console.log('\n✅ Migrations completed!')
  console.log('\n💡 Verify in Supabase Dashboard → Table Editor\n')
}

main().catch((error) => {
  console.error('\n❌ Migration failed:', error.message)
  console.error('\n💡 Alternative: Run SQL manually in Supabase Dashboard')
  console.error('   https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n')
  process.exit(1)
})

