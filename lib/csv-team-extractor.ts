/**
 * CSV Team Member Extractor
 * Extracts unique lawyer/paralegal/clerk names from CSV and determines their roles
 */

import { ParsedCaseData } from './csv-parser-custom'

export interface TeamMemberInfo {
  name: string
  cleanName: string
  role: 'Lawyer' | 'AccidentBenefitsCoordinator' | 'LawClerk' | 'LegalAssistant'
  context: string // Original value from CSV (e.g., "George (AB ONLY)")
  count: number // How many cases they appear in
}

/**
 * Determine role based on name context
 */
function determineRole(name: string, context: string): TeamMemberInfo['role'] {
  const lowerName = name.toLowerCase()
  const lowerContext = context.toLowerCase()

  // "(AB ONLY)" or similar indicates Accident Benefits Coordinator (Paralegal)
  if (lowerContext.includes('ab only') || lowerContext.includes('ab-only') || 
      lowerContext.includes('(ab)') || lowerContext.includes('paralegal')) {
    return 'AccidentBenefitsCoordinator'
  }

  // Common lawyer name patterns (you can expand this)
  // For now, assume most are lawyers unless marked otherwise
  if (lowerContext.includes('clerk') || lowerContext.includes('assistant')) {
    return lowerContext.includes('clerk') ? 'LawClerk' : 'LegalAssistant'
  }

  // Default to Lawyer
  return 'Lawyer'
}

/**
 * Clean name by removing parenthetical notes and extra spaces
 */
function cleanName(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, '') // Remove parenthetical notes
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single space
}

/**
 * Extract unique team members from parsed CSV data
 */
export function extractTeamMembers(cases: ParsedCaseData[]): TeamMemberInfo[] {
  const memberMap = new Map<string, TeamMemberInfo>()

  for (const caseData of cases) {
    if (!caseData.lawyerName) continue

    const originalName = caseData.lawyerName.trim()
    const clean = cleanName(originalName)

    if (!clean) continue

    // Check if we've seen this name before (exact match or fuzzy match)
    let existingMember: TeamMemberInfo | undefined
    for (const [key, member] of memberMap.entries()) {
      // Exact match
      if (member.cleanName.toLowerCase() === clean.toLowerCase()) {
        existingMember = member
        break
      }
      // Fuzzy match (same first name or last name)
      const existingParts = member.cleanName.toLowerCase().split(/\s+/)
      const newParts = clean.toLowerCase().split(/\s+/)
      if (existingParts.some(p => newParts.includes(p)) && 
          existingParts.length > 0 && newParts.length > 0) {
        existingMember = member
        break
      }
    }

    if (existingMember) {
      // Update count
      existingMember.count++
      // Update context if this one has more info
      if (originalName.length > existingMember.context.length) {
        existingMember.context = originalName
      }
    } else {
      // New member
      const role = determineRole(clean, originalName)
      memberMap.set(clean.toLowerCase(), {
        name: clean,
        cleanName: clean,
        role,
        context: originalName,
        count: 1,
      })
    }
  }

  return Array.from(memberMap.values()).sort((a, b) => b.count - a.count)
}

/**
 * Generate SQL to create users from extracted team members
 * This SQL can be run by an admin to create the users
 */
export function generateUserCreationSQL(
  teamMembers: TeamMemberInfo[],
  firmId: string,
  firmName: string = 'G. LALOSHI LEGAL'
): string {
  const sqlLines: string[] = []
  
  sqlLines.push(`-- ============================================`)
  sqlLines.push(`-- CREATE USERS FROM CSV IMPORT`)
  sqlLines.push(`-- Generated from CSV team member extraction`)
  sqlLines.push(`-- ============================================`)
  sqlLines.push(``)
  sqlLines.push(`-- Note: These users need to be created in Supabase Auth Dashboard first`)
  sqlLines.push(`-- Then run this SQL to link them to the firm`)
  sqlLines.push(``)
  sqlLines.push(`-- Firm ID: ${firmId}`)
  sqlLines.push(`-- Firm Name: ${firmName}`)
  sqlLines.push(``)

  for (const member of teamMembers) {
    // Generate a suggested email (admin will need to update)
    const emailSuggestion = member.name
      .toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '') + '@example.com'

    sqlLines.push(`-- ${member.name} (${member.role}) - Appears in ${member.count} case(s)`)
    sqlLines.push(`-- Original CSV value: "${member.context}"`)
    sqlLines.push(`--`)
    sqlLines.push(`-- Step 1: Create user in Supabase Auth Dashboard with email: ${emailSuggestion}`)
    sqlLines.push(`-- Step 2: Run this SQL (replace email with actual email):`)
    sqlLines.push(`INSERT INTO users_metadata (id, name, role, firm_id, is_active)`)
    sqlLines.push(`SELECT`)
    sqlLines.push(`  auth.users.id,`)
    sqlLines.push(`  '${member.name.replace(/'/g, "''")}',`)
    sqlLines.push(`  '${member.role}',`)
    sqlLines.push(`  '${firmId}'::uuid,`)
    sqlLines.push(`  true`)
    sqlLines.push(`FROM auth.users`)
    sqlLines.push(`WHERE auth.users.email = '${emailSuggestion}' -- ⚠️ CHANGE THIS to actual email`)
    sqlLines.push(`ON CONFLICT (id) DO UPDATE`)
    sqlLines.push(`SET`)
    sqlLines.push(`  name = EXCLUDED.name,`)
    sqlLines.push(`  role = EXCLUDED.role,`)
    sqlLines.push(`  firm_id = EXCLUDED.firm_id,`)
    sqlLines.push(`  is_active = true;`)
    sqlLines.push(``)
  }

  return sqlLines.join('\n')
}

