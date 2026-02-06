/**
 * Bulk Import Script: Diamond and Diamond Law Team
 * 
 * This script imports all team members from the CSV into Supabase.
 * Run with: npx ts-node scripts/import-diamond-team.ts
 */

import { createClient } from '@supabase/supabase-js'

// Team data from CSV
const TEAM_MEMBERS = [
  { name: "Tofunmi Adeyeye", role: "Lawyer" },
  { name: "Regeena Alapat", role: "Lawyer" },
  { name: "Nolan Bachmann", role: "Lawyer" },
  { name: "Egi Bano", role: "Lawyer" },
  { name: "Basil Bansal", role: "Lawyer" }, // Partner
  { name: "Shelly Bard", role: "Lawyer" },
  { name: "Harinder S. Bhatti", role: "Lawyer" },
  { name: "Manpreet Bhogal", role: "Lawyer" },
  { name: "Kiran Birk", role: "Lawyer" },
  { name: "Michael Blois", role: "Lawyer" }, // Partner
  { name: "Christian Brown", role: "Lawyer" },
  { name: "Noah Brownstone", role: "Lawyer" },
  { name: "Daly Canie", role: "Lawyer" },
  { name: "Jillian Carrington", role: "Lawyer" }, // Partner
  { name: "Amandeep Chawla", role: "Lawyer" },
  { name: "Allan Cocunato", role: "Lawyer" },
  { name: "Nadia Condotta", role: "Lawyer" }, // Head of Commercial & Civil Litigation
  { name: "Veronica D'Angelo", role: "LegalAssistant" },
  { name: "Annamarie Demaj", role: "LegalAssistant" },
  { name: "Simon Diamond", role: "Lawyer" },
  { name: "Jacob Elyk", role: "Lawyer" },
  { name: "Tania Fleming", role: "LegalAssistant" },
  { name: "Alessia De Gasperis", role: "Lawyer" },
  { name: "Harry Gill", role: "Lawyer" },
  { name: "TJ Gogna", role: "Lawyer" }, // Partner
  { name: "Brandon Greenwood", role: "Lawyer" },
  { name: "Brandon Handelman", role: "Lawyer" },
  { name: "Erika Henderson", role: "Lawyer" },
  { name: "Joshua Himel", role: "Lawyer" }, // Partner
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
  { name: "Cory Rubin", role: "Lawyer" }, // Partner
  { name: "Ishmeet Sandhu", role: "Lawyer" },
  { name: "Corey J. Sax", role: "Lawyer" }, // Partner
  { name: "John Sime", role: "Lawyer" },
  { name: "Gray Sinden", role: "Lawyer" },
  { name: "Darryl Singer", role: "Lawyer" }, // Partner
  { name: "Amit Singh", role: "Lawyer" },
  { name: "Andrei Teju", role: "Lawyer" },
  { name: "Scott Tottle", role: "Lawyer" },
  { name: "Jeremy Tsoi", role: "LegalAssistant" },
  { name: "Steven Wilder", role: "Lawyer" }, // Partner
  { name: "Craig Yargeau", role: "Lawyer" },
  { name: "Maria Zahid", role: "LegalAssistant" },
  { name: "Shir Zisckind", role: "Lawyer" },
  { name: "Isaac Zisckind", role: "Admin" }, // Founding Partner - give Admin role
  { name: "Sandra Zisckind", role: "Admin" }, // Founding & Managing Partner - give Admin role
]

const FIRM_NAME = "Diamond and Diamond Law"

// Generate email from name
function generateEmail(name: string): string {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(' ')
    .join('.')
  return `${cleanName}@diamondlaw.ca`
}

// Generate temporary password
function generatePassword(): string {
  return `Diamond2024!${Math.random().toString(36).slice(-4)}`
}

async function main() {
  // Check for required env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables!')
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
    process.exit(1)
  }

  // Create admin client with service role key
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🏢 Creating firm:', FIRM_NAME)
  
  // Create or get the firm
  let firmId: string
  const { data: existingFirm } = await supabase
    .from('firms')
    .select('id')
    .eq('name', FIRM_NAME)
    .single()

  if (existingFirm) {
    firmId = existingFirm.id
    console.log('✅ Firm already exists:', firmId)
  } else {
    const { data: newFirm, error: firmError } = await supabase
      .from('firms')
      .insert({ name: FIRM_NAME })
      .select()
      .single()

    if (firmError) {
      console.error('❌ Failed to create firm:', firmError.message)
      process.exit(1)
    }
    firmId = newFirm.id
    console.log('✅ Firm created:', firmId)
  }

  console.log('\n👥 Importing team members...\n')

  const results = {
    created: [] as string[],
    skipped: [] as string[],
    failed: [] as { name: string; error: string }[]
  }

  for (const member of TEAM_MEMBERS) {
    const email = generateEmail(member.name)
    const password = generatePassword()

    process.stdout.write(`  ${member.name}... `)

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users_metadata')
        .select('id')
        .eq('name', member.name)
        .single()

      if (existingUser) {
        results.skipped.push(member.name)
        console.log('⏭️  Already exists')
        continue
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('No user returned')
      }

      // Create user metadata
      const { error: metadataError } = await supabase
        .from('users_metadata')
        .insert({
          id: authData.user.id,
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

      if (metadataError) {
        throw new Error(metadataError.message)
      }

      results.created.push(member.name)
      console.log(`✅ Created (${email})`)

    } catch (error: any) {
      results.failed.push({ name: member.name, error: error.message })
      console.log(`❌ Failed: ${error.message}`)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Created: ${results.created.length}`)
  console.log(`⏭️  Skipped: ${results.skipped.length}`)
  console.log(`❌ Failed:  ${results.failed.length}`)

  if (results.failed.length > 0) {
    console.log('\n❌ Failed imports:')
    results.failed.forEach(f => console.log(`   - ${f.name}: ${f.error}`))
  }

  console.log('\n🎉 Done!')
  console.log('\nNote: All users have temporary passwords.')
  console.log('They should use "Forgot Password" to set their own password.')
}

main().catch(console.error)

