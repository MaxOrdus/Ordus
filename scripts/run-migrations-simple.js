/**
 * Simple Migration Runner
 * Uses Supabase REST API to execute SQL
 * 
 * This is a simpler approach - it will guide you to run SQL manually
 * OR you can use the Supabase Dashboard SQL Editor
 */

const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

console.log('\n📋 Supabase Migration Files:\n')
console.log('1. supabase-add-case-assignment.sql')
console.log('   → Adds case assignment fields (primary_lawyer_id, etc.)')
console.log('\n2. setup-first-admin.sql')
console.log('   → Links your first user to the firm')
console.log('\n💡 To run these migrations:\n')
console.log('   Option A: Use Supabase Dashboard (Recommended)')
console.log('   1. Go to: https://supabase.com/dashboard/project/oddudqpfsnhpsfylyhvf/sql/new')
console.log('   2. Copy/paste the SQL from each file')
console.log('   3. Click "Run"\n')
console.log('   Option B: Use Supabase CLI')
console.log('   1. Install: npm install -g supabase')
console.log('   2. Login: supabase login')
console.log('   3. Link: supabase link --project-ref oddudqpfsnhpsfylyhvf')
console.log('   4. Run: supabase db push\n')

rl.question('Would you like me to open the SQL files for you? (y/n): ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    console.log('\n📄 Opening migration files...\n')
    const { exec } = require('child_process')
    exec('open supabase-add-case-assignment.sql setup-first-admin.sql', (error) => {
      if (error) {
        console.log('Files are in your project root directory')
      }
    })
  }
  rl.close()
})

