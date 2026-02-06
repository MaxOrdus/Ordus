/**
 * Database Service: SABS Claims
 * CRUD operations for SABS (Statutory Accident Benefits Schedule) claims
 */

import { getSupabase } from '@/lib/supabase/singleton'
import { SABSClaim, OCF18Submission, LATApplication } from '@/types/pi-case'

const getClient = () => getSupabase()

/**
 * Get SABS claim for a case
 */
export async function getSABSClaim(caseId: string): Promise<SABSClaim | null> {
  const { data, error } = await getClient()
    .from('sabs_claims')
    .select('*')
    .eq('case_id', caseId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching SABS claim:', error)
    throw new Error('Failed to fetch SABS claim')
  }

  return transformSABSClaim(data)
}

/**
 * Update SABS claim
 */
export async function updateSABSClaim(
  caseId: string,
  updates: Partial<SABSClaim>
): Promise<SABSClaim> {
  const { data, error } = await getClient()
    .from('sabs_claims')
    .update({
      notice_date: updates.noticeDate,
      ocf1_received_date: updates.ocf1ReceivedDate,
      ocf1_submitted_date: updates.ocf1SubmittedDate,
      ocf3_expiry_date: updates.ocf3ExpiryDate,
      ocf3_renewal_alert: updates.ocf3RenewalAlert,
      elected_benefit_type: updates.electedBenefitType,
      mig_status: updates.migStatus,
      mig_bust_status: updates.migBustStatus,
      cat_status: updates.catStatus,
      cat_application_date: updates.catApplicationDate,
      cat_assessment_date: updates.catAssessmentDate,
      irb_paid: updates.irbPaid,
      medical_paid: updates.medicalPaid,
      attendant_care_paid: updates.attendantCarePaid,
      total_paid: updates.totalPaid,
      medical_rehab_limit: updates.medicalRehabLimit,
      attendant_care_limit: updates.attendantCareLimit,
      updated_at: new Date().toISOString(),
    })
    .eq('case_id', caseId)
    .select()
    .single()

  if (error) {
    console.error('Error updating SABS claim:', error)
    throw new Error('Failed to update SABS claim')
  }

  return transformSABSClaim(data)
}

/**
 * Create or update OCF-1 received date
 */
export async function updateOCF1ReceivedDate(
  caseId: string,
  receivedDate: string
): Promise<void> {
  const { error } = await getClient()
    .from('sabs_claims')
    .update({
      ocf1_received_date: receivedDate,
      updated_at: new Date().toISOString(),
    })
    .eq('case_id', caseId)

  if (error) {
    console.error('Error updating OCF-1 received date:', error)
    throw new Error('Failed to update OCF-1 received date')
  }
}

/**
 * Update OCF-3 expiry date
 */
export async function updateOCF3ExpiryDate(
  caseId: string,
  expiryDate: string
): Promise<void> {
  const { error } = await getClient()
    .from('sabs_claims')
    .update({
      ocf3_expiry_date: expiryDate,
      updated_at: new Date().toISOString(),
    })
    .eq('case_id', caseId)

  if (error) {
    console.error('Error updating OCF-3 expiry date:', error)
    throw new Error('Failed to update OCF-3 expiry date')
  }
}

/**
 * Update MIG/CAT category
 */
export async function updateSABSCategory(
  caseId: string,
  category: 'MIG' | 'Non-MIG' | 'CAT'
): Promise<void> {
  const { error } = await getClient()
    .from('sabs_claims')
    .update({
      mig_status: category,
      updated_at: new Date().toISOString(),
    })
    .eq('case_id', caseId)

  if (error) {
    console.error('Error updating SABS category:', error)
    throw new Error('Failed to update SABS category')
  }
}

// ============================================
// OCF-18 Submissions
// ============================================

/**
 * Get OCF-18 submissions for a case
 */
export async function getOCF18Submissions(caseId: string): Promise<OCF18Submission[]> {
  const { data, error } = await getClient()
    .from('ocf18_submissions')
    .select('*')
    .eq('case_id', caseId)
    .order('submission_date', { ascending: false })

  if (error) {
    console.error('Error fetching OCF-18 submissions:', error)
    throw new Error('Failed to fetch OCF-18 submissions')
  }

  return (data || []).map(transformOCF18Submission)
}

/**
 * Add OCF-18 submission
 */
export async function addOCF18Submission(
  submission: Omit<OCF18Submission, 'id'>
): Promise<OCF18Submission> {
  const { data, error } = await getClient()
    .from('ocf18_submissions')
    .insert({
      case_id: submission.caseId,
      submission_date: submission.submissionDate,
      treatment_type: submission.treatmentType,
      amount: submission.amount,
      status: submission.status,
      response_deadline: submission.responseDeadline,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding OCF-18 submission:', error)
    throw new Error('Failed to add OCF-18 submission')
  }

  return transformOCF18Submission(data)
}

/**
 * Update OCF-18 submission status
 */
export async function updateOCF18Status(
  submissionId: string,
  status: OCF18Submission['status'],
  responseDate?: string
): Promise<void> {
  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (responseDate) {
    updates.response_date = responseDate
  }

  // Handle deemed approval
  if (status === 'Deemed Approved') {
    updates.deemed_approval_date = new Date().toISOString().split('T')[0]
  }

  const { error } = await getClient()
    .from('ocf18_submissions')
    .update(updates)
    .eq('id', submissionId)

  if (error) {
    console.error('Error updating OCF-18 status:', error)
    throw new Error('Failed to update OCF-18 status')
  }
}

// ============================================
// LAT Applications
// ============================================

/**
 * Get LAT applications for a case
 */
export async function getLATApplications(caseId: string): Promise<LATApplication[]> {
  const { data, error } = await getClient()
    .from('lat_applications')
    .select('*')
    .eq('case_id', caseId)
    .order('denial_date', { ascending: false })

  if (error) {
    console.error('Error fetching LAT applications:', error)
    throw new Error('Failed to fetch LAT applications')
  }

  return (data || []).map(transformLATApplication)
}

/**
 * Add LAT application
 * Automatically calculates limitation date as denial date + 2 years
 */
export async function addLATApplication(
  application: Omit<LATApplication, 'id' | 'limitationDate'>
): Promise<LATApplication> {
  // Calculate limitation date: denial date + 2 years
  const denialDate = new Date(application.denialDate)
  denialDate.setFullYear(denialDate.getFullYear() + 2)
  const limitationDate = denialDate.toISOString().split('T')[0]

  const { data, error } = await getClient()
    .from('lat_applications')
    .insert({
      case_id: application.caseId,
      denial_date: application.denialDate,
      denial_type: application.denialType,
      application_filed: application.applicationFiled,
      limitation_date: limitationDate,
      case_conference_date: application.caseConferenceDate,
      hearing_date: application.hearingDate,
      status: application.status,
      denied_benefit_value: application.deniedBenefitValue,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding LAT application:', error)
    throw new Error('Failed to add LAT application')
  }

  return transformLATApplication(data)
}

/**
 * Update LAT application
 */
export async function updateLATApplication(
  applicationId: string,
  updates: Partial<LATApplication>
): Promise<LATApplication> {
  const { data, error } = await getClient()
    .from('lat_applications')
    .update({
      denial_date: updates.denialDate,
      denial_type: updates.denialType,
      application_filed: updates.applicationFiled,
      limitation_date: updates.limitationDate,
      case_conference_date: updates.caseConferenceDate,
      hearing_date: updates.hearingDate,
      status: updates.status,
      denied_benefit_value: updates.deniedBenefitValue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating LAT application:', error)
    throw new Error('Failed to update LAT application')
  }

  return transformLATApplication(data)
}

// ============================================
// Transformers
// ============================================

function transformSABSClaim(db: any): SABSClaim {
  return {
    caseId: db.case_id,
    noticeDate: db.notice_date,
    ocf1ReceivedDate: db.ocf1_received_date,
    ocf1Deadline: db.ocf1_deadline,
    ocf1SubmittedDate: db.ocf1_submitted_date,
    ocf3ExpiryDate: db.ocf3_expiry_date,
    ocf3RenewalAlert: db.ocf3_renewal_alert || false,
    benefitElection: db.benefit_election,
    electedBenefitType: db.elected_benefit_type,
    migStatus: db.mig_status as 'MIG' | 'Non-MIG' | 'CAT',
    migBustStatus: db.mig_bust_status,
    ocf18Submissions: [],
    catStatus: db.cat_status as 'Not Assessed' | 'Pending' | 'Approved' | 'Denied',
    catApplicationDate: db.cat_application_date,
    catAssessmentDate: db.cat_assessment_date,
    irbPaid: parseFloat(db.irb_paid || 0),
    medicalPaid: parseFloat(db.medical_paid || 0),
    attendantCarePaid: parseFloat(db.attendant_care_paid || 0),
    totalPaid: parseFloat(db.total_paid || 0),
    latApplications: [],
    medicalRehabLimit: parseFloat(db.medical_rehab_limit || 3500),
    attendantCareLimit: parseFloat(db.attendant_care_limit || 0),
  }
}

function transformOCF18Submission(db: any): OCF18Submission {
  return {
    id: db.id,
    caseId: db.case_id,
    submissionDate: db.submission_date,
    treatmentType: db.treatment_type,
    amount: parseFloat(db.amount || 0),
    status: db.status as OCF18Submission['status'],
    responseDate: db.response_date,
    responseDeadline: db.response_deadline,
    deemedApprovalDate: db.deemed_approval_date,
  }
}

function transformLATApplication(db: any): LATApplication {
  return {
    id: db.id,
    caseId: db.case_id,
    denialDate: db.denial_date,
    denialType: db.denial_type,
    applicationFiled: db.application_filed,
    limitationDate: db.limitation_date,
    caseConferenceDate: db.case_conference_date,
    hearingDate: db.hearing_date,
    status: db.status as LATApplication['status'],
    deniedBenefitValue: parseFloat(db.denied_benefit_value || 0),
  }
}
