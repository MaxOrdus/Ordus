/**
 * CSV Import Service
 * Handles importing parsed CSV data into the database
 */

import { getSupabase } from '@/lib/supabase/singleton'
import { ParsedCaseData } from './csv-parser-custom'
import { createCase } from './db/cases'
import { extractTeamMembers, TeamMemberInfo } from './csv-team-extractor'

// Use singleton to avoid multiple connections
const getClient = () => getSupabase()

export interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
  teamMembers: TeamMemberInfo[] // Extracted team members from CSV
  unmatchedLawyers: string[] // Lawyer names that couldn't be matched to users
}

export type ImportProgressCallback = (progress: {
  current: number
  total: number
  percentage: number
  currentCase: string
}) => void

/**
 * Import cases from parsed CSV data
 */
export async function importCasesFromCSV(
  cases: ParsedCaseData[],
  firmId: string,
  onProgress?: ImportProgressCallback
): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    teamMembers: [],
    unmatchedLawyers: [],
  }

  console.log(`[CSV Import] Starting import of ${cases.length} cases...`)
  
  // Step 1: Extract team members from CSV
  const extractedTeamMembers = extractTeamMembers(cases)
  result.teamMembers = extractedTeamMembers
  console.log(`[CSV Import] Extracted ${extractedTeamMembers.length} team members from CSV`)

  // Step 2: Get all existing users in the firm for name matching
  const { data: existingUsers } = await getClient()
    .from('users_metadata')
    .select('id, name, role')
    .eq('firm_id', firmId)
    .eq('is_active', true)
  
  console.log(`[CSV Import] Found ${existingUsers?.length || 0} existing users in firm`)

  // Step 3: Create a name-to-user mapping (fuzzy matching)
  const nameToUserIdMap = new Map<string, string>()
  
  if (existingUsers) {
    for (const user of existingUsers) {
      const cleanName = user.name.toLowerCase().trim()
      nameToUserIdMap.set(cleanName, user.id)
      
      // Also add first name and last name variations
      const nameParts = cleanName.split(/\s+/)
      if (nameParts.length > 1) {
        nameToUserIdMap.set(nameParts[0], user.id) // First name
        nameToUserIdMap.set(nameParts[nameParts.length - 1], user.id) // Last name
      }
    }
  }

  // Step 4: Create a mapping of CSV names to user IDs (or null if not found)
  const csvNameToUserId = new Map<string, string | null>()
  
  for (const teamMember of extractedTeamMembers) {
    const cleanCSVName = teamMember.cleanName.toLowerCase().trim()
    let matchedUserId: string | null = null

    // Try exact match first
    if (nameToUserIdMap.has(cleanCSVName)) {
      matchedUserId = nameToUserIdMap.get(cleanCSVName)!
    } else {
      // Try fuzzy matching with existing users
      for (const [existingName, userId] of nameToUserIdMap.entries()) {
        const existingParts = existingName.split(/\s+/)
        const csvParts = cleanCSVName.split(/\s+/)
        
        // Check if any part matches
        if (existingParts.some(p => csvParts.includes(p)) && 
            existingParts.length > 0 && csvParts.length > 0) {
          matchedUserId = userId
          break
        }
      }
    }

    csvNameToUserId.set(teamMember.cleanName, matchedUserId)
    
    if (!matchedUserId) {
      result.unmatchedLawyers.push(teamMember.name)
    }
  }

  // Report initial progress
  if (onProgress) {
    onProgress({
      current: 0,
      total: cases.length,
      percentage: 0,
      currentCase: 'Starting import...',
    })
  }

  for (let i = 0; i < cases.length; i++) {
    const caseData = cases[i]
    
    // Report progress every case (React will batch updates, but this ensures we see progress)
    if (onProgress && (i === 0 || i % 5 === 0 || i === cases.length - 1)) {
      onProgress({
        current: i + 1,
        total: cases.length,
        percentage: Math.round(((i + 1) / cases.length) * 100),
        currentCase: caseData.clientName,
      })
    }
    
    try {
      // Step 1: Find or create client
      let clientId: string

      // Check if client exists (match by name, case-insensitive)
      const { data: existingClients } = await getClient()
        .from('clients')
        .select('id')
        .eq('firm_id', firmId)
        .ilike('name', caseData.clientName.trim())

      if (existingClients && existingClients.length > 0) {
        clientId = existingClients[0].id
      } else {
        // Create new client
        const { data: newClient, error: clientError } = await getClient()
          .from('clients')
          .insert({
            firm_id: firmId,
            name: caseData.clientName.trim(),
            email: undefined, // Your CSV doesn't have email
            phone: undefined, // Your CSV doesn't have phone
            date_of_birth: caseData.clientDob || null,
            notes: caseData.notes || null,
          })
          .select('id')
          .single()

        if (clientError || !newClient) {
          throw new Error(`Failed to create client: ${clientError?.message || 'Unknown error'}`)
        }

        clientId = newClient.id
      }

      // Step 5: Find lawyer by name using our pre-built mapping
      let primaryLawyerId: string | undefined
      const caseNotes: string[] = []
      
      if (caseData.lawyerName) {
        const originalLawyerName = caseData.lawyerName.trim()
        // Clean name (remove parenthetical notes)
        const cleanLawyerName = originalLawyerName
          .replace(/\s*\(.*?\)\s*/g, '')
          .trim()
        
        // Look up in our mapping
        const matchedUserId = csvNameToUserId.get(cleanLawyerName)
        
        if (matchedUserId) {
          primaryLawyerId = matchedUserId
        } else {
          // Lawyer not found - preserve name in notes
          caseNotes.push(`Assigned Lawyer (from import): ${originalLawyerName}`)
          // Track unmatched lawyers
          if (!result.unmatchedLawyers.includes(cleanLawyerName)) {
            result.unmatchedLawyers.push(cleanLawyerName)
          }
        }
      }

      // Step 4: Create case title from client name and file number
      const caseTitle = caseData.fileNumber 
        ? `${caseData.clientName} - ${caseData.fileNumber}`
        : caseData.clientName

      // Use date of loss as date opened if not provided (your CSV doesn't have date opened)
      const dateOpened = caseData.dateOfLoss // Use DOL as opened date

      if (i % 100 === 0) {
        console.log(`[CSV Import] Processing case ${i + 1}/${cases.length}: ${caseTitle}`)
      }

      await createCase({
        firmId: firmId, // Required for RLS
        title: caseTitle,
        clientId,
        dateOfLoss: caseData.dateOfLoss,
        dateOpened: dateOpened,
        estimatedValue: undefined, // Your CSV doesn't have this
        status: 'Active' as any, // Default status
        stage: 'Intake' as any, // Default stage
        primaryLawyerId,
        assignedParalegalId: undefined, // Your CSV doesn't have paralegal field
        notes: [
          ...(caseData.notes ? [caseData.notes] : []),
          ...caseNotes, // Add lawyer name if not matched
          ...(caseData.insuranceCompany ? [`Insurance: ${caseData.insuranceCompany}`] : []),
          ...(caseData.policyNumber ? [`Policy: ${caseData.policyNumber}`] : []),
          ...(caseData.claimNumber ? [`Claim: ${caseData.claimNumber}`] : []),
          ...(caseData.adjuster ? [`Adjuster: ${caseData.adjuster}`] : []),
        ].filter(Boolean),
        tags: caseData.fileNumber ? [caseData.fileNumber] : [],
        sabs: {
          caseId: '',
          migStatus: (caseData.migStatus as any) || 'MIG',
          catStatus: 'Not Assessed',
          irbPaid: 0,
          medicalPaid: 0,
          attendantCarePaid: 0,
          totalPaid: 0,
          medicalRehabLimit: caseData.migStatus === 'CAT' ? 1000000 : 3500,
          attendantCareLimit: 0,
          ocf18Submissions: [],
          latApplications: [],
        },
        tort: {
          caseId: '',
          limitationDate: calculateLimitationDate(caseData.dateOfLoss, caseData.clientDob),
          limitationStatus: 'Active',
          noticeOfIntentDate: undefined,
          statementOfClaimIssued: undefined,
          statementOfClaimServed: undefined,
          statementOfDefenseReceived: undefined,
          discoveryDate: undefined,
          discoveryCompleted: false,
          discoveryTranscriptReceived: undefined,
          trialRecordServed: undefined,
          setDownDate: undefined,
          rule48DismissalDate: undefined,
          preTrialDate: undefined,
          preTrialBriefFiled: false,
          trialDate: undefined,
          juryNoticeFiled: false,
          aodDrafted: false,
          aodServed: undefined,
          defendants: [],
          plaintiffUndertakings: [],
          defenseUndertakings: [],
          scheduleA: [],
          scheduleB: [],
          scheduleC: [],
          offers: [],
        },
      })

      result.success++
    } catch (error: any) {
      console.error(`[CSV Import] Error importing case ${i + 1} (${caseData.clientName}):`, error.message)
      result.failed++
      result.errors.push({
        row: i + 2, // +2 for header and 0-based index
        error: error.message || 'Unknown error',
      })
    }
  }

  console.log(`[CSV Import] Import complete: ${result.success} succeeded, ${result.failed} failed`)
  console.log(`[CSV Import] Unmatched lawyers: ${result.unmatchedLawyers.length}`)
  
  return result
}

/**
 * Calculate limitation date (DOL + 2 years, adjusted for minors)
 */
function calculateLimitationDate(dateOfLoss: string, dateOfBirth?: string): string {
  const dol = new Date(dateOfLoss)
  const limitationDate = new Date(dol)
  limitationDate.setFullYear(limitationDate.getFullYear() + 2)

  // If client is a minor, adjust to their 20th birthday
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth)
    const ageAtLoss = dol.getFullYear() - dob.getFullYear()
    
    if (ageAtLoss < 18) {
      const twentiethBirthday = new Date(dob)
      twentiethBirthday.setFullYear(twentiethBirthday.getFullYear() + 20)
      return twentiethBirthday.toISOString().split('T')[0]
    }
  }

  return limitationDate.toISOString().split('T')[0]
}

