#!/usr/bin/env node

/**
 * Migration Helper Script
 * Provides easy way to run SQL migrations
 */

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

console.log('\n🚀 Supabase Migration Helper\n')

const migrations = [
  {
    name: 'Add Case Assignment Fields',
    file: 'supabase-add-case-assignment.sql',
    description: 'Adds primary_lawyer_id, assigned_team_members, assigned_paralegal_id to cases table',
  },
  {
    name: 'Setup First Admin User',
    file: 'setup-first-admin.sql',
    description: 'Links your first user to the firm (⚠️ Edit email/name first!)',
  },
]

console.log('📋 Available Migrations:\n')
migrations.forEach((m, i) => {
  const exists = fs.existsSync(path.join(process.cwd(), m.file))
  console.log(`${i + 1}. ${m.name}`)
  console.log(`   File: ${m.file} ${exists ? '✅' : '❌'}`)
  console.log(`   ${m.description}\n`)
})

console.log('\n💡 How to Run:\n')
console.log('Option 1: Supabase Dashboard (Easiest)')
console.log('   1. Go to: https://supabase.com/dashboard/project/oddudqpfsnhpsfylyhvf/sql/new')
console.log('   2. Open each SQL file in your editor')
console.log('   3. Copy/paste the SQL into the editor')
console.log('   4. Click "Run"\n')

console.log('Option 2: Supabase CLI')
console.log('   1. Install: npm install -g supabase')
console.log('   2. Login: supabase login')
console.log('   3. Link: supabase link --project-ref oddudqpfsnhpsfylyhvf')
console.log('   4. Create migrations folder: mkdir -p supabase/migrations')
console.log('   5. Copy SQL files to supabase/migrations/')
console.log('   6. Run: supabase db push\n')

console.log('⚠️  Important for setup-first-admin.sql:')
console.log('   - Edit the file first!')
console.log('   - Replace "your-email@example.com" with your actual email')
console.log('   - Replace "Your Name" with your actual name\n')

// Check if files exist and offer to open them
const existingFiles = migrations.filter(m => fs.existsSync(path.join(process.cwd(), m.file)))

if (existingFiles.length > 0) {
  console.log('📂 Migration files found in project root\n')
  
  // Try to open files (Mac/Linux)
  if (process.platform === 'darwin' || process.platform === 'linux') {
    console.log('Opening files in your default editor...\n')
    existingFiles.forEach(m => {
      exec(`open "${path.join(process.cwd(), m.file)}"`, () => {})
    })
  }
}

