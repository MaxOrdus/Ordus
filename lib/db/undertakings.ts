/**
 * Database Service: Undertakings
 * Handles CRUD operations for undertakings (plaintiff and defense)
 */

import { getSupabase } from '@/lib/supabase/singleton'
import { Undertaking } from '@/types/pi-case'

const getClient = () => getSupabase()

// Transform DB row to Undertaking
function transformUndertaking(row: any): Undertaking {
  return {
    id: row.id,
    caseId: row.case_id,
    type: row.type,
    description: row.description,
    requestedDate: row.requested_date,
    dueDate: row.due_date,
    status: row.status,
    assignedTo: row.assigned_to,
    notes: row.notes,
  }
}

/**
 * Get all undertakings for a case
 */
export async function getUndertakings(caseId: string): Promise<Undertaking[]> {
  const { data, error } = await getClient()
    .from('undertakings')
    .select('*')
    .eq('case_id', caseId)
    .order('requested_date', { ascending: false })

  if (error) {
    console.error('Error fetching undertakings:', error)
    throw new Error('Failed to fetch undertakings')
  }

  return (data || []).map(transformUndertaking)
}

/**
 * Get undertakings by type (Plaintiff or Defense)
 */
export async function getUndertakingsByType(
  caseId: string,
  type: 'Plaintiff' | 'Defense'
): Promise<Undertaking[]> {
  const { data, error } = await getClient()
    .from('undertakings')
    .select('*')
    .eq('case_id', caseId)
    .eq('type', type)
    .order('requested_date', { ascending: false })

  if (error) {
    console.error('Error fetching undertakings by type:', error)
    throw new Error('Failed to fetch undertakings')
  }

  return (data || []).map(transformUndertaking)
}

/**
 * Add a new undertaking
 */
export async function addUndertaking(
  undertaking: Omit<Undertaking, 'id'>
): Promise<Undertaking> {
  const { data, error } = await getClient()
    .from('undertakings')
    .insert({
      case_id: undertaking.caseId,
      type: undertaking.type,
      description: undertaking.description,
      requested_date: undertaking.requestedDate,
      due_date: undertaking.dueDate,
      status: undertaking.status,
      assigned_to: undertaking.assignedTo,
      notes: undertaking.notes,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding undertaking:', error)
    throw new Error('Failed to add undertaking')
  }

  return transformUndertaking(data)
}

/**
 * Update undertaking status
 */
export async function updateUndertakingStatus(
  id: string,
  status: Undertaking['status']
): Promise<Undertaking> {
  const { data, error } = await getClient()
    .from('undertakings')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating undertaking status:', error)
    throw new Error('Failed to update undertaking status')
  }

  return transformUndertaking(data)
}

/**
 * Update undertaking
 */
export async function updateUndertaking(
  id: string,
  updates: Partial<Omit<Undertaking, 'id' | 'caseId'>>
): Promise<Undertaking> {
  const updateData: any = {}

  if (updates.type !== undefined) updateData.type = updates.type
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.requestedDate !== undefined) updateData.requested_date = updates.requestedDate
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo
  if (updates.notes !== undefined) updateData.notes = updates.notes

  const { data, error } = await getClient()
    .from('undertakings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating undertaking:', error)
    throw new Error('Failed to update undertaking')
  }

  return transformUndertaking(data)
}

/**
 * Delete undertaking
 */
export async function deleteUndertaking(id: string): Promise<void> {
  const { error } = await getClient()
    .from('undertakings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting undertaking:', error)
    throw new Error('Failed to delete undertaking')
  }
}
