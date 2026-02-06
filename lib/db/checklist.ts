/**
 * Database Service: Workflow Checklist
 * CRUD operations for SABS workflow checklist items
 */

import { getSupabase } from '@/lib/supabase/singleton'

// Use singleton to avoid multiple connections
const getClient = () => getSupabase()

export interface ChecklistCompletion {
  id: string
  caseId: string
  itemId: string
  completed: boolean
  completedAt?: string
  completedBy?: string
  notes?: string
}

/**
 * Get all checklist completions for a case
 */
export async function getChecklistCompletions(caseId: string): Promise<Record<string, ChecklistCompletion>> {
  const { data, error } = await getClient()
    .from('workflow_checklist')
    .select('*')
    .eq('case_id', caseId)

  if (error) {
    // Table might not exist yet - return empty object
    console.error('Error fetching checklist:', error)
    return {}
  }

  // Return as a map for easy lookup
  return (data || []).reduce((acc, item) => {
    acc[item.item_id] = {
      id: item.id,
      caseId: item.case_id,
      itemId: item.item_id,
      completed: item.completed,
      completedAt: item.completed_at,
      completedBy: item.completed_by,
      notes: item.notes,
    }
    return acc
  }, {} as Record<string, ChecklistCompletion>)
}

/**
 * Toggle a checklist item completion status
 */
export async function toggleChecklistItem(
  caseId: string,
  itemId: string,
  completed: boolean,
  userId?: string
): Promise<void> {
  // Try to upsert the item
  const { error } = await getClient()
    .from('workflow_checklist')
    .upsert({
      case_id: caseId,
      item_id: itemId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? userId : null,
    }, {
      onConflict: 'case_id,item_id'
    })

  if (error) {
    console.error('Error toggling checklist item:', error)
    throw new Error('Failed to update checklist item')
  }
}

/**
 * Update checklist item notes
 */
export async function updateChecklistNotes(
  caseId: string,
  itemId: string,
  notes: string
): Promise<void> {
  const { error } = await getClient()
    .from('workflow_checklist')
    .upsert({
      case_id: caseId,
      item_id: itemId,
      notes,
    }, {
      onConflict: 'case_id,item_id'
    })

  if (error) {
    console.error('Error updating checklist notes:', error)
    throw new Error('Failed to update checklist notes')
  }
}
