/**
 * Database Service: Case Tracking
 * Handles opening memo and client review tracking
 */

import { getSupabase } from '@/lib/supabase/singleton'

const getClient = () => getSupabase()

// Types
export interface MemoEntry {
  id: string
  completedDate: string
  completedBy: string
  notes?: string
}

export interface ReviewEntry {
  id: string
  reviewDate: string
  conductedBy: string
  notes?: string
}

export interface CaseTracking {
  id: string
  caseId: string
  openingMemoCompleted: boolean
  openingMemoEntries: MemoEntry[]
  lastReviewDate: string | null
  nextReviewDate: string | null
  reviewEntries: ReviewEntry[]
  createdAt: string
  updatedAt: string
}

// Transform DB row to CaseTracking
function transformTracking(row: any): CaseTracking {
  return {
    id: row.id,
    caseId: row.case_id,
    openingMemoCompleted: row.opening_memo_completed || false,
    openingMemoEntries: row.opening_memo_entries || [],
    lastReviewDate: row.last_review_date,
    nextReviewDate: row.next_review_date,
    reviewEntries: row.review_entries || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Get case tracking data, creating if it doesn't exist
 */
export async function getCaseTracking(caseId: string): Promise<CaseTracking> {
  const { data, error } = await getClient()
    .from('case_tracking')
    .select('*')
    .eq('case_id', caseId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - create a new tracking record
      return createCaseTracking(caseId)
    }
    console.error('Error fetching case tracking:', error)
    throw new Error('Failed to fetch case tracking')
  }

  return transformTracking(data)
}

/**
 * Create a new case tracking record
 */
async function createCaseTracking(caseId: string): Promise<CaseTracking> {
  const { data, error } = await getClient()
    .from('case_tracking')
    .insert({
      case_id: caseId,
      opening_memo_completed: false,
      opening_memo_entries: [],
      review_entries: [],
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating case tracking:', error)
    throw new Error('Failed to create case tracking')
  }

  return transformTracking(data)
}

/**
 * Add an opening memo completion entry
 */
export async function addOpeningMemoEntry(
  caseId: string,
  entry: Omit<MemoEntry, 'id'>
): Promise<CaseTracking> {
  // First get current data
  const current = await getCaseTracking(caseId)

  const newEntry: MemoEntry = {
    id: crypto.randomUUID(),
    ...entry,
  }

  const updatedEntries = [...current.openingMemoEntries, newEntry]

  const { data, error } = await getClient()
    .from('case_tracking')
    .update({
      opening_memo_completed: true,
      opening_memo_entries: updatedEntries,
    })
    .eq('case_id', caseId)
    .select()
    .single()

  if (error) {
    console.error('Error adding opening memo entry:', error)
    throw new Error('Failed to add opening memo entry')
  }

  return transformTracking(data)
}

/**
 * Add a client review entry
 */
export async function addReviewEntry(
  caseId: string,
  entry: Omit<ReviewEntry, 'id'>
): Promise<CaseTracking> {
  // First get current data
  const current = await getCaseTracking(caseId)

  const newEntry: ReviewEntry = {
    id: crypto.randomUUID(),
    ...entry,
  }

  const updatedEntries = [...current.reviewEntries, newEntry]

  const { data, error } = await getClient()
    .from('case_tracking')
    .update({
      last_review_date: entry.reviewDate,
      review_entries: updatedEntries,
    })
    .eq('case_id', caseId)
    .select()
    .single()

  if (error) {
    console.error('Error adding review entry:', error)
    throw new Error('Failed to add review entry')
  }

  return transformTracking(data)
}

/**
 * Schedule next client review
 */
export async function scheduleNextReview(
  caseId: string,
  nextReviewDate: string
): Promise<CaseTracking> {
  // First ensure tracking record exists
  await getCaseTracking(caseId)

  const { data, error } = await getClient()
    .from('case_tracking')
    .update({
      next_review_date: nextReviewDate,
    })
    .eq('case_id', caseId)
    .select()
    .single()

  if (error) {
    console.error('Error scheduling next review:', error)
    throw new Error('Failed to schedule next review')
  }

  return transformTracking(data)
}

/**
 * Get all cases with overdue reviews
 */
export async function getOverdueReviews(): Promise<CaseTracking[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await getClient()
    .from('case_tracking')
    .select('*')
    .lt('next_review_date', today)
    .not('next_review_date', 'is', null)

  if (error) {
    console.error('Error fetching overdue reviews:', error)
    throw new Error('Failed to fetch overdue reviews')
  }

  return (data || []).map(transformTracking)
}
