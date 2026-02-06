/**
 * Database Service: Tort Claims
 * CRUD operations for tort claim details
 */

import { getSupabase } from '@/lib/supabase/singleton'
import { TortClaim, SettlementOffer, Defendant, TrialOutcome } from '@/types/pi-case'

const getClient = () => getSupabase()

/**
 * Get tort claim for a case
 */
export async function getTortClaim(caseId: string): Promise<TortClaim | null> {
  const { data, error } = await getClient()
    .from('tort_claims')
    .select(`
      *,
      defendants (*)
    `)
    .eq('case_id', caseId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching tort claim:', error)
    throw new Error('Failed to fetch tort claim')
  }

  return transformTortClaim(data)
}

/**
 * Update tort claim
 */
export async function updateTortClaim(
  caseId: string,
  updates: Partial<TortClaim>
): Promise<TortClaim> {
  const { data, error } = await getClient()
    .from('tort_claims')
    .update({
      limitation_date: updates.limitationDate,
      limitation_status: updates.limitationStatus,
      notice_of_intent_date: updates.noticeOfIntentDate,
      statement_of_claim_issued: updates.statementOfClaimIssued,
      statement_of_claim_served: updates.statementOfClaimServed,
      statement_of_defense_received: updates.statementOfDefenseReceived,
      discovery_date: updates.discoveryDate,
      discovery_completed: updates.discoveryCompleted,
      discovery_transcript_received: updates.discoveryTranscriptReceived,
      aod_drafted: updates.aodDrafted,
      aod_served: updates.aodServed,
      trial_record_served: updates.trialRecordServed,
      set_down_date: updates.setDownDate,
      rule48_dismissal_date: updates.rule48DismissalDate,
      pre_trial_date: updates.preTrialDate,
      pre_trial_brief_filed: updates.preTrialBriefFiled,
      trial_date: updates.trialDate,
      jury_notice_filed: updates.juryNoticeFiled,
      jury_notice_date: updates.juryNoticeDate,
      trial_outcome: updates.trialOutcome,
      pretrial_checklist_progress: updates.preTrialChecklistProgress,
      updated_at: new Date().toISOString(),
    })
    .eq('case_id', caseId)
    .select(`
      *,
      defendants (*)
    `)
    .single()

  if (error) {
    console.error('Error updating tort claim:', error)
    throw new Error('Failed to update tort claim')
  }

  return transformTortClaim(data)
}

// ============================================
// Settlement Offers
// ============================================

/**
 * Get settlement offers for a case
 */
export async function getSettlementOffers(caseId: string): Promise<SettlementOffer[]> {
  const { data, error } = await getClient()
    .from('settlement_offers')
    .select('*')
    .eq('case_id', caseId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching settlement offers:', error)
    throw new Error('Failed to fetch settlement offers')
  }

  return (data || []).map(transformSettlementOffer)
}

/**
 * Add settlement offer
 */
export async function addSettlementOffer(
  offer: Omit<SettlementOffer, 'id'>
): Promise<SettlementOffer> {
  const { data, error } = await getClient()
    .from('settlement_offers')
    .insert({
      case_id: offer.caseId,
      date: offer.date,
      amount: offer.amount,
      type: offer.type,
      gross_amount: offer.grossAmount,
      net_amount: offer.netAmount,
      status: offer.status,
      expires_date: offer.expiresDate,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding settlement offer:', error)
    throw new Error('Failed to add settlement offer')
  }

  return transformSettlementOffer(data)
}

/**
 * Update settlement offer
 */
export async function updateSettlementOffer(
  offerId: string,
  updates: Partial<SettlementOffer>
): Promise<SettlementOffer> {
  const { data, error } = await getClient()
    .from('settlement_offers')
    .update({
      date: updates.date,
      amount: updates.amount,
      type: updates.type,
      gross_amount: updates.grossAmount,
      net_amount: updates.netAmount,
      status: updates.status,
      expires_date: updates.expiresDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', offerId)
    .select()
    .single()

  if (error) {
    console.error('Error updating settlement offer:', error)
    throw new Error('Failed to update settlement offer')
  }

  return transformSettlementOffer(data)
}

// ============================================
// Defendants
// ============================================

/**
 * Get defendants for a case
 */
export async function getDefendants(caseId: string): Promise<Defendant[]> {
  const { data, error } = await getClient()
    .from('defendants')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching defendants:', error)
    throw new Error('Failed to fetch defendants')
  }

  return (data || []).map(transformDefendant)
}

/**
 * Add defendant
 */
export async function addDefendant(
  caseId: string,
  defendant: Omit<Defendant, 'id'>
): Promise<Defendant> {
  const { data, error } = await getClient()
    .from('defendants')
    .insert({
      case_id: caseId,
      name: defendant.name,
      role: defendant.role,
      insurance_company: defendant.insuranceCompany,
      policy_number: defendant.policyNumber,
      served: defendant.served,
      served_date: defendant.servedDate,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding defendant:', error)
    throw new Error('Failed to add defendant')
  }

  return transformDefendant(data)
}

/**
 * Update defendant
 */
export async function updateDefendant(
  defendantId: string,
  updates: Partial<Defendant>
): Promise<Defendant> {
  const { data, error } = await getClient()
    .from('defendants')
    .update({
      name: updates.name,
      role: updates.role,
      insurance_company: updates.insuranceCompany,
      policy_number: updates.policyNumber,
      served: updates.served,
      served_date: updates.servedDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', defendantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating defendant:', error)
    throw new Error('Failed to update defendant')
  }

  return transformDefendant(data)
}

/**
 * Delete defendant
 */
export async function deleteDefendant(defendantId: string): Promise<void> {
  const { error } = await getClient()
    .from('defendants')
    .delete()
    .eq('id', defendantId)

  if (error) {
    console.error('Error deleting defendant:', error)
    throw new Error('Failed to delete defendant')
  }
}

// ============================================
// Transformers
// ============================================

function transformTortClaim(db: any): TortClaim {
  return {
    caseId: db.case_id,
    limitationDate: db.limitation_date,
    limitationStatus: db.limitation_status as 'Active' | 'Expired' | 'Extended',
    noticeOfIntentDate: db.notice_of_intent_date,
    statementOfClaimIssued: db.statement_of_claim_issued,
    statementOfClaimServed: db.statement_of_claim_served,
    statementOfDefenseReceived: db.statement_of_defense_received,
    defendants: (db.defendants || []).map(transformDefendant),
    juryNoticeFiled: db.jury_notice_filed || false,
    juryNoticeDate: db.jury_notice_date,
    discoveryDate: db.discovery_date,
    discoveryCompleted: db.discovery_completed || false,
    discoveryTranscriptReceived: db.discovery_transcript_received,
    plaintiffUndertakings: [],
    defenseUndertakings: [],
    aodDrafted: db.aod_drafted || false,
    aodServed: db.aod_served,
    scheduleA: [],
    scheduleB: [],
    scheduleC: [],
    trialRecordServed: db.trial_record_served,
    setDownDate: db.set_down_date,
    rule48DismissalDate: db.rule48_dismissal_date,
    preTrialDate: db.pre_trial_date,
    preTrialBriefFiled: db.pre_trial_brief_filed,
    trialDate: db.trial_date,
    trialOutcome: db.trial_outcome as TrialOutcome | undefined,
    preTrialChecklistProgress: db.pretrial_checklist_progress || {},
    offers: [],
    currentOffer: undefined,
  }
}

function transformSettlementOffer(db: any): SettlementOffer {
  return {
    id: db.id,
    caseId: db.case_id,
    date: db.date,
    amount: parseFloat(db.amount || 0),
    type: db.type as 'Plaintiff' | 'Defendant',
    grossAmount: parseFloat(db.gross_amount || 0),
    netAmount: db.net_amount ? parseFloat(db.net_amount) : undefined,
    status: db.status as 'Open' | 'Accepted' | 'Rejected' | 'Countered',
    expiresDate: db.expires_date,
  }
}

function transformDefendant(db: any): Defendant {
  return {
    id: db.id,
    name: db.name,
    role: db.role as 'Driver' | 'Owner' | 'Lessee',
    insuranceCompany: db.insurance_company,
    policyNumber: db.policy_number,
    served: db.served || false,
    servedDate: db.served_date,
  }
}
