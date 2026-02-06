/**
 * Database Service: Expert Reports
 * CRUD operations for expert reports and medical providers
 */

import { getSupabase } from '@/lib/supabase/singleton'
import { ExpertReport, MedicalProvider } from '@/types/pi-case'

const getClient = () => getSupabase()

// ============================================
// Expert Reports
// ============================================

/**
 * Get expert reports for a case
 */
export async function getExpertReports(caseId: string): Promise<ExpertReport[]> {
  const { data, error } = await getClient()
    .from('expert_reports')
    .select('*')
    .eq('case_id', caseId)
    .order('retained_date', { ascending: false })

  if (error) {
    console.error('Error fetching expert reports:', error)
    throw new Error('Failed to fetch expert reports')
  }

  return (data || []).map(transformExpertReport)
}

/**
 * Add expert report
 * preTrialDeadline is optional - will be calculated from pre-trial date if available
 */
export async function addExpertReport(
  expert: Omit<ExpertReport, 'id' | 'preTrialDeadline'> & { preTrialDeadline?: string }
): Promise<ExpertReport> {
  const { data, error } = await getClient()
    .from('expert_reports')
    .insert({
      case_id: expert.caseId,
      expert_name: expert.expertName,
      expert_type: expert.expertType,
      retained_date: expert.retainedDate,
      records_sent_date: expert.recordsSentDate,
      assessment_date: expert.assessmentDate,
      draft_received_date: expert.draftReceivedDate,
      final_served_date: expert.finalServedDate,
      status: expert.status,
      rule53_compliant: expert.rule53Compliant,
      pre_trial_deadline: expert.preTrialDeadline || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding expert report:', error)
    throw new Error('Failed to add expert report')
  }

  return transformExpertReport(data)
}

/**
 * Update expert report
 */
export async function updateExpertReport(
  expertId: string,
  updates: Partial<ExpertReport>
): Promise<ExpertReport> {
  const { data, error } = await getClient()
    .from('expert_reports')
    .update({
      expert_name: updates.expertName,
      expert_type: updates.expertType,
      retained_date: updates.retainedDate,
      records_sent_date: updates.recordsSentDate,
      assessment_date: updates.assessmentDate,
      draft_received_date: updates.draftReceivedDate,
      final_served_date: updates.finalServedDate,
      status: updates.status,
      rule53_compliant: updates.rule53Compliant,
      pre_trial_deadline: updates.preTrialDeadline,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expertId)
    .select()
    .single()

  if (error) {
    console.error('Error updating expert report:', error)
    throw new Error('Failed to update expert report')
  }

  return transformExpertReport(data)
}

/**
 * Delete expert report
 */
export async function deleteExpertReport(expertId: string): Promise<void> {
  const { error } = await getClient()
    .from('expert_reports')
    .delete()
    .eq('id', expertId)

  if (error) {
    console.error('Error deleting expert report:', error)
    throw new Error('Failed to delete expert report')
  }
}

// ============================================
// Medical Providers
// ============================================

/**
 * Get medical providers for a case
 */
export async function getMedicalProviders(caseId: string): Promise<MedicalProvider[]> {
  const { data, error } = await getClient()
    .from('medical_providers')
    .select('*')
    .eq('case_id', caseId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching medical providers:', error)
    throw new Error('Failed to fetch medical providers')
  }

  return (data || []).map(transformMedicalProvider)
}

/**
 * Add medical provider
 */
export async function addMedicalProvider(
  caseId: string,
  provider: Omit<MedicalProvider, 'id'>
): Promise<MedicalProvider> {
  const { data, error } = await getClient()
    .from('medical_providers')
    .insert({
      case_id: caseId,
      name: provider.name,
      type: provider.type,
      records_obtained: provider.recordsObtained,
      last_record_date: provider.lastRecordDate,
      records_requested: provider.recordsRequested,
      gap_detected: provider.gapDetected,
      gap_start_date: provider.gapStartDate,
      gap_end_date: provider.gapEndDate,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding medical provider:', error)
    throw new Error('Failed to add medical provider')
  }

  return transformMedicalProvider(data)
}

/**
 * Update medical provider
 */
export async function updateMedicalProvider(
  providerId: string,
  updates: Partial<MedicalProvider>
): Promise<MedicalProvider> {
  const { data, error } = await getClient()
    .from('medical_providers')
    .update({
      name: updates.name,
      type: updates.type,
      records_obtained: updates.recordsObtained,
      last_record_date: updates.lastRecordDate,
      records_requested: updates.recordsRequested,
      gap_detected: updates.gapDetected,
      gap_start_date: updates.gapStartDate,
      gap_end_date: updates.gapEndDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId)
    .select()
    .single()

  if (error) {
    console.error('Error updating medical provider:', error)
    throw new Error('Failed to update medical provider')
  }

  return transformMedicalProvider(data)
}

/**
 * Delete medical provider
 */
export async function deleteMedicalProvider(providerId: string): Promise<void> {
  const { error } = await getClient()
    .from('medical_providers')
    .delete()
    .eq('id', providerId)

  if (error) {
    console.error('Error deleting medical provider:', error)
    throw new Error('Failed to delete medical provider')
  }
}

/**
 * Mark records as requested
 */
export async function requestRecords(providerId: string): Promise<void> {
  const { error } = await getClient()
    .from('medical_providers')
    .update({
      records_requested: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId)

  if (error) {
    console.error('Error requesting records:', error)
    throw new Error('Failed to request records')
  }
}

// ============================================
// Transformers
// ============================================

function transformExpertReport(db: any): ExpertReport {
  return {
    id: db.id,
    caseId: db.case_id,
    expertName: db.expert_name,
    expertType: db.expert_type as ExpertReport['expertType'],
    retainedDate: db.retained_date,
    recordsSentDate: db.records_sent_date,
    assessmentDate: db.assessment_date,
    draftReceivedDate: db.draft_received_date,
    finalServedDate: db.final_served_date,
    status: db.status as ExpertReport['status'],
    rule53Compliant: db.rule53_compliant || false,
    preTrialDeadline: db.pre_trial_deadline,
  }
}

function transformMedicalProvider(db: any): MedicalProvider {
  return {
    id: db.id,
    name: db.name,
    type: db.type as MedicalProvider['type'],
    recordsObtained: db.records_obtained || false,
    lastRecordDate: db.last_record_date,
    recordsRequested: db.records_requested,
    gapDetected: db.gap_detected || false,
    gapStartDate: db.gap_start_date,
    gapEndDate: db.gap_end_date,
  }
}
