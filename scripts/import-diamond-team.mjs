/**
 * Bulk Import Script: Diamond and Diamond Law Team
 * Run with: node scripts/import-diamond-team.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load env vars
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env.local') })

// Team data from CSV
const TEAM_MEMBERS = [
  { name: "Tofunmi Adeyeye", role: "Lawyer" },
  { name: "Regeena Alapat", role: "Lawyer" },
  { name: "Nolan Bachmann", role: "Lawyer" },
  { name: "Egi Bano", role: "Lawyer" },
  { name: "Basil Bansal", role: "Lawyer" },
  { name: "Shelly Bard", role: "Lawyer" },
  { name: "Harinder S. Bhatti", role: "Lawyer" },
  { name: "Manpreet Bhogal", role: "Lawyer" },
  { name: "Kiran Birk", role: "Lawyer" },
  { name: "Michael Blois", role: "Lawyer" },
  { name: "Christian Brown", role: "Lawyer" },
  { name: "Noah Brownstone", role: "Lawyer" },
  { name: "Daly Canie", role: "Lawyer" },
  { name: "Jillian Carrington", role: "Lawyer" },
  { name: "Amandeep Chawla", role: "Lawyer" },
  { name: "Allan Cocunato", role: "Lawyer" },
  { name: "Nadia Condotta", role: "Lawyer" },
  { name: "Veronica D'Angelo", role: "LegalAssistant" },
  { name: "Annamarie Demaj", role: "LegalAssistant" },
  { name: "Simon Diamond", role: "Lawyer" },
  { name: "Jacob Elyk", role: "Lawyer" },
  { name: "Tania Fleming", role: "LegalAssistant" },
  { name: "Alessia De Gasperis", role: "Lawyer" },
  { name: "Harry Gill", role: "Lawyer" },
  { name: "TJ Gogna", role: "Lawyer" },
  { name: "Brandon Greenwood", role: "Lawyer" },
  { name: "Brandon Handelman", role: "Lawyer" },
  { name: "Erika Henderson", role: "Lawyer" },
  { name: "Joshua Himel", role: "Lawyer" },
  { name: "Jeffrey Hum", role: "Lawyer" },
  { name: "Nastassia Ivanova", role: "LegalAssistant" },
  { name: "Justin Kaminker", role: "Lawyer" },
  { name: "Ryna Kim", role: "LegalAssistant" },
  { name: "Marina Korshunova", role: "LegalAssistant" },
  { name: "George Laloshi", role: "LegalAssistant" },
  { name: "Tinashe Madzingo", role: "Lawyer" },
  { name: "Patrycja Majchrowicz", role: "LegalAssistant" },
  { name: "Simon Mariani", role: "Lawyer" },
  { name: "Alexandra McCallum", role: "Lawyer" },
  { name: "Nikolai Singh", role: "LegalAssistant" },
  { name: "Kristina Olivo", role: "Lawyer" },
  { name: "Patrick Poupore", role: "Lawyer" },
  { name: "Kimiya Razin", role: "Lawyer" },
  { name: "Cory Rubin", role: "Lawyer" },
  { name: "Ishmeet Sandhu", role: "Lawyer" },
  { name: "Corey J. Sax", role: "Lawyer" },
  { name: "John Sime", role: "Lawyer" },
  { name: "Gray Sinden", role: "Lawyer" },
  { name: "Darryl Singer", role: "Lawyer" },
  { name: "Amit Singh", role: "Lawyer" },
  { name: "Andrei Teju", role: "Lawyer" },
  { name: "Scott Tottle", role: "Lawyer" },
  { name: "Jeremy Tsoi", role: "LegalAssistant" },
  { name: "Steven Wilder", role: "Lawyer" },
  { name: "Craig Yargeau", role: "Lawyer" },
  { name: "Maria Zahid", role: "LegalAssistant" },
  { name: "Shir Zisckind", role: "Lawyer" },
  { name: "Isaac Zisckind", role: "Admin" },
  { name: "Sandra Zisckind", role: "Admin" },
]

const FIRM_NAME = "Diamond & Diamond Lawyers LLP"

// Generate email from name
function generateEmail(name) {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(' ')
    .join('.')
  return `${cleanName}@diamondlaw.ca`
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables!')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
    console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅' : '❌')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('🏢 Finding firm:', FIRM_NAME)
  
  // Get existing firm
  const { data: existingFirm, error: firmError } = await supabase
    .from('firms')
    .select('id')
    .eq('name', FIRM_NAME)
    .single()

  if (firmError || !existingFirm) {
    console.error('❌ Firm not found! Create it first in the Super Admin dashboard.')
    process.exit(1)
  }

  const firmId = existingFirm.id
  console.log('✅ Found firm:', firmId)

  console.log('\n👥 Importing', TEAM_MEMBERS.length, 'team members...\n')

  const results = { created: [], skipped: [], failed: [] }

  for (const member of TEAM_MEMBERS) {
    const email = generateEmail(member.name)
    process.stdout.write(`  ${member.name.padEnd(25)}`)

    try {
      // Check if user already exists by email
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(u => u.email === email)

      if (existingUser) {
        // Check if metadata exists
        const { data: existingMeta } = await supabase
          .from('users_metadata')
          .select('id')
          .eq('id', existingUser.id)
          .single()

        if (existingMeta) {
          results.skipped.push(member.name)
          console.log('⏭️  Already exists')
          continue
        }
      }

      let userId

      if (existingUser) {
        userId = existingUser.id
      } else {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: 'TempPass2024!',
          email_confirm: true,
        })

        if (authError) throw new Error(authError.message)
        userId = authData.user.id
      }

      // Create user metadata
      const { error: metaError } = await supabase
        .from('users_metadata')
        .insert({
          id: userId,
          name: member.name,
          role: member.role,
          firm_id: firmId,
          is_active: true,
          preferences: {
            theme: 'system',
            notifications: { email: true, push: true, criticalDeadlines: true, treatmentGaps: true, taskAssignments: true, settlementOffers: true },
            dashboard: { showBillableStreak: true, showCaseVelocity: true, showRedZone: true, showStalledCases: true },
          }
        })

      if (metaError) throw new Error(metaError.message)

      results.created.push(member.name)
      console.log(`✅ ${email}`)

    } catch (error) {
      results.failed.push({ name: member.name, error: error.message })
      console.log(`❌ ${error.message}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Created: ${results.created.length}`)
  console.log(`⏭️  Skipped: ${results.skipped.length}`)
  console.log(`❌ Failed:  ${results.failed.length}`)

  if (results.failed.length > 0) {
    console.log('\n❌ Failed:')
    results.failed.forEach(f => console.log(`   - ${f.name}: ${f.error}`))
  }

  console.log('\n🎉 Done! Users can login with their email and use "Forgot Password".')
}

main().catch(console.error)

