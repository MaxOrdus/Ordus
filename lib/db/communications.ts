/**
 * Database Service: Client Communications
 * CRUD operations for client communication logs
 */

import { getSupabase } from '@/lib/supabase/singleton'

const getClient = () => getSupabase()

export interface Communication {
  id: string
  caseId: string
  type: 'Phone' | 'Email' | 'Meeting' | 'Letter'
  date: string
  subject: string
  notes: string
  initiatedBy: 'Client' | 'Firm'
  followUpRequired: boolean
  followUpDate?: string
}

/**
 * Get communications for a case
 */
export async function getCommunications(caseId: string): Promise<Communication[]> {
  const { data, error } = await getClient()
    .from('communications')
    .select('*')
    .eq('case_id', caseId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching communications:', error)
    throw new Error('Failed to fetch communications')
  }

  return (data || []).map(transformCommunication)
}

/**
 * Add communication
 */
export async function addCommunication(
  communication: Omit<Communication, 'id'>
): Promise<Communication> {
  const { data, error } = await getClient()
    .from('communications')
    .insert({
      case_id: communication.caseId,
      type: communication.type,
      date: communication.date,
      subject: communication.subject,
      notes: communication.notes,
      initiated_by: communication.initiatedBy,
      follow_up_required: communication.followUpRequired,
      follow_up_date: communication.followUpDate,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding communication:', error)
    throw new Error('Failed to add communication')
  }

  return transformCommunication(data)
}

/**
 * Update communication
 */
export async function updateCommunication(
  communicationId: string,
  updates: Partial<Communication>
): Promise<Communication> {
  const { data, error } = await getClient()
    .from('communications')
    .update({
      type: updates.type,
      date: updates.date,
      subject: updates.subject,
      notes: updates.notes,
      initiated_by: updates.initiatedBy,
      follow_up_required: updates.followUpRequired,
      follow_up_date: updates.followUpDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', communicationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating communication:', error)
    throw new Error('Failed to update communication')
  }

  return transformCommunication(data)
}

/**
 * Delete communication
 */
export async function deleteCommunication(communicationId: string): Promise<void> {
  const { error } = await getClient()
    .from('communications')
    .delete()
    .eq('id', communicationId)

  if (error) {
    console.error('Error deleting communication:', error)
    throw new Error('Failed to delete communication')
  }
}

/**
 * Get pending follow-ups
 */
export async function getPendingFollowUps(caseId?: string): Promise<Communication[]> {
  let query = getClient()
    .from('communications')
    .select('*')
    .eq('follow_up_required', true)
    .not('follow_up_date', 'is', null)
    .order('follow_up_date', { ascending: true })

  if (caseId) {
    query = query.eq('case_id', caseId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching pending follow-ups:', error)
    throw new Error('Failed to fetch pending follow-ups')
  }

  return (data || []).map(transformCommunication)
}

function transformCommunication(db: any): Communication {
  return {
    id: db.id,
    caseId: db.case_id,
    type: db.type as Communication['type'],
    date: db.date,
    subject: db.subject,
    notes: db.notes || '',
    initiatedBy: db.initiated_by as Communication['initiatedBy'],
    followUpRequired: db.follow_up_required || false,
    followUpDate: db.follow_up_date,
  }
}
