/**
 * Check LAT applications table schema and test insert
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  // Get a case ID to test with
  console.log('Fetching a case to test with...')
  const { data: cases, error: casesError } = await supabase
    .from('cases')
    .select('id, title')
    .limit(1)

  if (casesError || !cases?.length) {
    console.error('No cases found:', casesError)
    return
  }

  const testCaseId = cases[0].id
  console.log('Using case:', cases[0].title, '(', testCaseId, ')')

  // Try to insert a LAT application
  console.log('\nTrying to insert LAT application...')
  const testData = {
    case_id: testCaseId,
    denial_date: '2024-12-01',
    denial_type: 'Test Denial',
    limitation_date: '2026-12-01',
    status: 'Pending',
    denied_benefit_value: 1000
  }
  console.log('Insert data:', testData)

  const { data, error } = await supabase
    .from('lat_applications')
    .insert(testData)
    .select()
    .single()

  if (error) {
    console.error('\nInsert failed:', error.message)
    console.error('Error details:', error)

    // Check if it's a column issue
    if (error.message.includes('case_id')) {
      console.log('\nThe table might not have case_id column. Checking schema...')

      // Try with sabs_claim_id instead
      const { data: sabsClaims } = await supabase
        .from('sabs_claims')
        .select('id')
        .eq('case_id', testCaseId)
        .single()

      if (sabsClaims) {
        console.log('Found sabs_claim_id:', sabsClaims.id)
        console.log('\nThe table uses sabs_claim_id, not case_id!')
        console.log('You need to run the migration to add case_id column.')
      }
    }
  } else {
    console.log('\nInsert successful!')
    console.log('Inserted data:', data)

    // Clean up test data
    console.log('\nCleaning up test data...')
    await supabase.from('lat_applications').delete().eq('id', data.id)
    console.log('Cleaned up.')
  }

  // List existing LAT applications
  console.log('\nExisting LAT applications:')
  const { data: latApps, error: latError } = await supabase
    .from('lat_applications')
    .select('*')
    .limit(5)

  if (latError) {
    console.error('Error fetching:', latError)
  } else {
    console.log(latApps)
  }
}

main().catch(console.error)
