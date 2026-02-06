/**
 * Database Service: Cases
 * CRUD operations for PI cases
 */

import { getSupabase } from '@/lib/supabase/singleton'
import { PICase } from '@/types/pi-case'

// Use singleton to avoid multiple connections
const getClient = () => getSupabase()

export interface GetCasesOptions {
  firmId?: string
  status?: string
  limit?: number
  page?: number // 1-indexed page number
  pageSize?: number // Items per page (default 20)
  lightweight?: boolean  // If true, skip joins for faster list views
}

export interface PaginatedResult<T> {
  data: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Get all cases for the current user's firm
 * @param options - Optional settings for the query
 */
export async function getCases(options?: GetCasesOptions): Promise<PICase[]> {
  const { firmId, status, limit, lightweight = false } = options || {}
  
  let query = getClient()
    .from('cases')
    .select(lightweight 
      ? 'id, firm_id, title, client_id, date_of_loss, limitation_date, status, stage, estimated_value, created_at, primary_lawyer_id, assigned_paralegal_id'
      : `*, clients (*), sabs_claims (*), tort_claims (*)`
    )
    .order('created_at', { ascending: false })

  if (firmId) {
    query = query.eq('firm_id', firmId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching cases:', error)
    throw new Error('Failed to fetch cases')
  }

  // Transform database records to PICase format
  return (data || []).map(row => lightweight ? transformCaseLightweight(row) : transformCase(row))
}

/**
 * Get cases with pagination - useful for large datasets
 */
export async function getCasesPaginated(options?: GetCasesOptions): Promise<PaginatedResult<PICase>> {
  const { firmId, status, page = 1, pageSize = 20, lightweight = false } = options || {}
  
  // First get total count
  let countQuery = getClient()
    .from('cases')
    .select('id', { count: 'exact', head: true })

  if (firmId) {
    countQuery = countQuery.eq('firm_id', firmId)
  }

  if (status) {
    countQuery = countQuery.eq('status', status)
  }

  const { count, error: countError } = await countQuery

  if (countError) {
    console.error('Error counting cases:', countError)
    throw new Error('Failed to count cases')
  }

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const offset = (page - 1) * pageSize

  // Then get paginated data
  let query = getClient()
    .from('cases')
    .select(lightweight 
      ? 'id, firm_id, title, client_id, date_of_loss, limitation_date, status, stage, estimated_value, created_at, primary_lawyer_id, assigned_paralegal_id'
      : `*, clients (*), sabs_claims (*), tort_claims (*)`
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (firmId) {
    query = query.eq('firm_id', firmId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching cases:', error)
    throw new Error('Failed to fetch cases')
  }

  return {
    data: (data || []).map(row => lightweight ? transformCaseLightweight(row) : transformCase(row)),
    totalCount,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Get cases by IDs - much more efficient than getCases() + filter
 */
export async function getCasesByIds(caseIds: string[], options?: { lightweight?: boolean }): Promise<PICase[]> {
  if (caseIds.length === 0) return []
  
  const { lightweight = false } = options || {}
  
  console.log(`[getCasesByIds] Fetching ${caseIds.length} cases, lightweight: ${lightweight}`)
  
  const { data, error } = await getClient()
    .from('cases')
    .select(lightweight 
      ? 'id, firm_id, title, client_id, date_of_loss, limitation_date, status, stage, estimated_value, created_at, primary_lawyer_id, assigned_paralegal_id'
      : `*, clients (*), sabs_claims (*), tort_claims (*)`
    )
    .in('id', caseIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getCasesByIds] Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      caseIds: caseIds
    })
    throw new Error(`Failed to fetch cases: ${error.message}`)
  }

  console.log(`[getCasesByIds] Successfully fetched ${data?.length || 0} cases`)
  return (data || []).map(row => lightweight ? transformCaseLightweight(row) : transformCase(row))
}

/**
 * Lightweight transform for list views (no joins)
 */
function transformCaseLightweight(dbCase: any): PICase {
  return {
    id: dbCase.id,
    firmId: dbCase.firm_id,
    title: dbCase.title,
    clientId: dbCase.client_id,
    dateOfLoss: dbCase.date_of_loss,
    limitationDate: dbCase.limitation_date,
    status: dbCase.status as PICase['status'],
    stage: dbCase.stage as PICase['stage'],
    estimatedValue: parseFloat(dbCase.estimated_value || 0),
    // Defaults for fields not fetched
    dateOpened: dbCase.date_opened || dbCase.created_at,
    currentOffer: undefined,
    totalDisbursements: 0,
    notes: [],
    tags: [],
    // Lawyer/Paralegal assignments
    primaryLawyerId: dbCase.primary_lawyer_id,
    assignedTeamMembers: [],
    assignedParalegalId: dbCase.assigned_paralegal_id,
    hasSABS: false, // Not available in lightweight mode
    sabs: transformSABSClaim(undefined),
    tort: transformTortClaim(undefined),
    disbursements: [],
    medicalProviders: [],
    expertReports: [],
    criticalDeadlines: [],
    undertakings: [],
  }
}

/**
 * Get a single case by ID
 * @param caseId - The case ID
 * @param lightweight - If true, skip expensive joins
 */
export async function getCaseById(caseId: string, lightweight = false): Promise<PICase | null> {
  const { data, error } = await getClient()
    .from('cases')
    .select(lightweight
      ? 'id, firm_id, title, client_id, date_of_loss, limitation_date, status, stage, estimated_value, created_at, lead_lawyer_id, paralegal_id, primary_lawyer_id, assigned_paralegal_id'
      : `
        *,
        clients (*),
        sabs_claims (*),
        tort_claims (
          *,
          defendants (*)
        )
      `
    )
    .eq('id', caseId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching case:', error)
    throw new Error('Failed to fetch case')
  }

  return lightweight ? transformCaseLightweight(data) : transformCase(data)
}

/**
 * Create a new case
 */
export async function createCase(caseData: Partial<PICase>): Promise<PICase> {
  if (!caseData.firmId) {
    throw new Error('firm_id is required to create a case')
  }
  
  const { data, error } = await getClient()
    .from('cases')
    .insert({
      firm_id: caseData.firmId, // Required for RLS
      title: caseData.title!,
      client_id: caseData.clientId,
      date_of_loss: caseData.dateOfLoss,
      date_opened: caseData.dateOpened || new Date().toISOString().split('T')[0],
      limitation_date: caseData.limitationDate,
      status: caseData.status || 'Active',
      stage: caseData.stage || 'Intake',
      estimated_value: caseData.estimatedValue || 0,
      current_offer: caseData.currentOffer,
      notes: caseData.notes || [],
      tags: caseData.tags || [],
      primary_lawyer_id: caseData.primaryLawyerId,
      assigned_team_members: caseData.assignedTeamMembers || [],
      assigned_paralegal_id: caseData.assignedParalegalId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating case:', error)
    throw new Error('Failed to create case')
  }

  // Create SABS claim if provided
  if (caseData.sabs) {
    await getClient().from('sabs_claims').insert({
      case_id: data.id,
      mig_status: caseData.sabs.migStatus,
      cat_status: caseData.sabs.catStatus || 'Not Assessed',
      medical_rehab_limit: caseData.sabs.medicalRehabLimit || 3500,
    })
  }

  // Create Tort claim if provided
  if (caseData.tort) {
    await getClient().from('tort_claims').insert({
      case_id: data.id,
      limitation_date: caseData.tort.limitationDate,
      limitation_status: caseData.tort.limitationStatus || 'Active',
    })
  }

  // Grant creator access (in case the database trigger doesn't exist)
  // This is idempotent due to ON CONFLICT
  if (caseData.primaryLawyerId) {
    await getClient().from('case_access').upsert({
      case_id: data.id,
      user_id: caseData.primaryLawyerId,
      granted_by: caseData.primaryLawyerId,
      access_level: 'full',
      is_creator: true,
    }, {
      onConflict: 'case_id,user_id'
    }).then(({ error }) => {
      if (error) {
        console.warn('Could not create case_access record (table may not exist yet):', error.message)
      }
    })
  }

  // Auto-add lawyer to case_team_members as lead_lawyer
  // This syncs the case creation form with the Team Assignment page
  if (caseData.primaryLawyerId) {
    await getClient().from('case_team_members').upsert({
      case_id: data.id,
      user_id: caseData.primaryLawyerId,
      team_role: 'lead_lawyer',
      assigned_by: caseData.primaryLawyerId,
    }, {
      onConflict: 'case_id,user_id'
    }).then(({ error }) => {
      if (error) {
        console.warn('Could not create case_team_members record for lawyer:', error.message)
      }
    })
  }

  // Auto-add paralegal to case_team_members as paralegal
  if (caseData.assignedParalegalId) {
    await getClient().from('case_team_members').upsert({
      case_id: data.id,
      user_id: caseData.assignedParalegalId,
      team_role: 'paralegal',
      assigned_by: caseData.primaryLawyerId || caseData.assignedParalegalId,
    }, {
      onConflict: 'case_id,user_id'
    }).then(({ error }) => {
      if (error) {
        console.warn('Could not create case_team_members record for paralegal:', error.message)
      }
    })
  }

  return getCaseById(data.id) as Promise<PICase>
}

/**
 * Update a case
 */
export async function updateCase(caseId: string, updates: Partial<PICase>): Promise<PICase> {
  const { error } = await getClient()
    .from('cases')
    .update({
      title: updates.title,
      client_id: updates.clientId,
      date_of_loss: updates.dateOfLoss,
      limitation_date: updates.limitationDate,
      status: updates.status,
      stage: updates.stage,
      estimated_value: updates.estimatedValue,
      current_offer: updates.currentOffer,
      total_disbursements: updates.totalDisbursements,
      notes: updates.notes,
      tags: updates.tags,
      primary_lawyer_id: updates.primaryLawyerId,
      assigned_team_members: updates.assignedTeamMembers,
      assigned_paralegal_id: updates.assignedParalegalId,
    })
    .eq('id', caseId)

  if (error) {
    console.error('Error updating case:', error)
    throw new Error('Failed to update case')
  }

  const updatedCase = await getCaseById(caseId)
  if (!updatedCase) {
    throw new Error('Case not found after update')
  }

  return updatedCase
}

/**
 * Delete a case
 */
export async function deleteCase(caseId: string): Promise<void> {
  const { error } = await getClient().from('cases').delete().eq('id', caseId)

  if (error) {
    console.error('Error deleting case:', error)
    throw new Error('Failed to delete case')
  }
}

/**
 * Transform database record to PICase format
 */
function transformCase(dbCase: any): PICase {
  // Check if a SABS claim record exists (not just the default empty object)
  const hasSABSClaim = Boolean(dbCase.sabs_claims?.[0])

  return {
    id: dbCase.id,
    firmId: dbCase.firm_id,
    title: dbCase.title,
    clientId: dbCase.client_id,
    dateOfLoss: dbCase.date_of_loss,
    dateOpened: dbCase.date_opened,
    limitationDate: dbCase.limitation_date,
    status: dbCase.status as PICase['status'],
    stage: dbCase.stage as PICase['stage'],
    estimatedValue: parseFloat(dbCase.estimated_value || 0),
    currentOffer: dbCase.current_offer ? parseFloat(dbCase.current_offer) : undefined,
    totalDisbursements: parseFloat(dbCase.total_disbursements || 0),
    notes: dbCase.notes || [],
    tags: dbCase.tags || [],
    primaryLawyerId: dbCase.primary_lawyer_id,
    assignedTeamMembers: dbCase.assigned_team_members || [],
    assignedParalegalId: dbCase.assigned_paralegal_id,
    hasSABS: hasSABSClaim,
    sabs: transformSABSClaim(dbCase.sabs_claims?.[0]),
    tort: transformTortClaim(dbCase.tort_claims?.[0]),
    disbursements: [], // Will be loaded separately if needed
    medicalProviders: [], // Will be loaded separately if needed
    expertReports: [], // Will be loaded separately if needed
    criticalDeadlines: [], // Will be loaded separately if needed
    undertakings: [], // Will be loaded separately if needed
  }
}

function transformSABSClaim(dbSabs: any) {
  if (!dbSabs) {
    return {
      caseId: '',
      migStatus: 'MIG' as const,
      catStatus: 'Not Assessed' as const,
      irbPaid: 0,
      medicalPaid: 0,
      attendantCarePaid: 0,
      totalPaid: 0,
      medicalRehabLimit: 3500,
      attendantCareLimit: 0,
      ocf18Submissions: [],
      latApplications: [],
    }
  }

  return {
    caseId: dbSabs.case_id,
    noticeDate: dbSabs.notice_date,
    ocf1ReceivedDate: dbSabs.ocf1_received_date,
    ocf1SubmittedDate: dbSabs.ocf1_submitted_date,
    ocf3ExpiryDate: dbSabs.ocf3_expiry_date,
    ocf3RenewalAlert: dbSabs.ocf3_renewal_alert || false,
    electedBenefitType: dbSabs.elected_benefit_type,
    benefitElection: dbSabs.benefit_election,
    migStatus: dbSabs.mig_status as 'MIG' | 'Non-MIG' | 'CAT',
    migBustStatus: dbSabs.mig_bust_status,
    catStatus: dbSabs.cat_status as 'Not Assessed' | 'Pending' | 'Approved' | 'Denied',
    catApplicationDate: dbSabs.cat_application_date,
    catAssessmentDate: dbSabs.cat_assessment_date,
    irbPaid: parseFloat(dbSabs.irb_paid || 0),
    medicalPaid: parseFloat(dbSabs.medical_paid || 0),
    attendantCarePaid: parseFloat(dbSabs.attendant_care_paid || 0),
    totalPaid: parseFloat(dbSabs.total_paid || 0),
    medicalRehabLimit: parseFloat(dbSabs.medical_rehab_limit || 3500),
    attendantCareLimit: parseFloat(dbSabs.attendant_care_limit || 0),
    ocf18Submissions: [],
    latApplications: [],
  }
}

function transformTortClaim(dbTort: any) {
  if (!dbTort) {
    return {
      caseId: '',
      limitationDate: '',
      limitationStatus: 'Active' as const,
      defendants: [],
      plaintiffUndertakings: [],
      defenseUndertakings: [],
      scheduleA: [],
      scheduleB: [],
      scheduleC: [],
      offers: [],
      juryNoticeFiled: false,
      discoveryCompleted: false,
      aodDrafted: false,
    }
  }

  return {
    caseId: dbTort.case_id,
    limitationDate: dbTort.limitation_date,
    limitationStatus: dbTort.limitation_status as 'Active' | 'Expired' | 'Extended',
    noticeOfIntentDate: dbTort.notice_of_intent_date,
    statementOfClaimIssued: dbTort.statement_of_claim_issued,
    statementOfClaimServed: dbTort.statement_of_claim_served,
    statementOfDefenseReceived: dbTort.statement_of_defense_received,
    discoveryDate: dbTort.discovery_date,
    discoveryCompleted: dbTort.discovery_completed || false,
    discoveryTranscriptReceived: dbTort.discovery_transcript_received,
    trialRecordServed: dbTort.trial_record_served,
    setDownDate: dbTort.set_down_date,
    rule48DismissalDate: dbTort.rule48_dismissal_date,
    preTrialDate: dbTort.pre_trial_date,
    preTrialBriefFiled: dbTort.pre_trial_brief_filed || false,
    trialDate: dbTort.trial_date,
    juryNoticeFiled: dbTort.jury_notice_filed || false,
    aodDrafted: dbTort.aod_drafted || false,
    aodServed: dbTort.aod_served,
    defendants: (dbTort.defendants || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      role: d.role,
      insuranceCompany: d.insurance_company,
      policyNumber: d.policy_number,
      served: d.served || false,
      servedDate: d.served_date,
    })),
    plaintiffUndertakings: dbTort.plaintiff_undertakings || [],
    defenseUndertakings: dbTort.defense_undertakings || [],
    scheduleA: dbTort.schedule_a || [],
    scheduleB: dbTort.schedule_b || [],
    scheduleC: dbTort.schedule_c || [],
    offers: dbTort.offers || [],
  }
}

