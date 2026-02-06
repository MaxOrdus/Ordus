/**
 * Database Service: Disbursements
 * CRUD operations for case disbursements
 */

import { getSupabase } from '@/lib/supabase/singleton'
import { Disbursement } from '@/types/pi-case'

const getClient = () => getSupabase()

/**
 * Get disbursements for a case
 */
export async function getDisbursements(caseId: string): Promise<Disbursement[]> {
  const { data, error } = await getClient()
    .from('disbursements')
    .select('*')
    .eq('case_id', caseId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching disbursements:', error)
    throw new Error('Failed to fetch disbursements')
  }

  return (data || []).map(transformDisbursement)
}

/**
 * Add disbursement
 */
export async function addDisbursement(
  disbursement: Omit<Disbursement, 'id'>
): Promise<Disbursement> {
  const { data, error } = await getClient()
    .from('disbursements')
    .insert({
      case_id: disbursement.caseId,
      date: disbursement.date,
      description: disbursement.description,
      amount: disbursement.amount,
      category: disbursement.category,
      assessable: disbursement.assessable,
      paid: disbursement.paid,
      invoice_number: disbursement.invoiceNumber,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding disbursement:', error)
    throw new Error('Failed to add disbursement')
  }

  return transformDisbursement(data)
}

/**
 * Update disbursement
 */
export async function updateDisbursement(
  disbursementId: string,
  updates: Partial<Disbursement>
): Promise<Disbursement> {
  const { data, error } = await getClient()
    .from('disbursements')
    .update({
      date: updates.date,
      description: updates.description,
      amount: updates.amount,
      category: updates.category,
      assessable: updates.assessable,
      paid: updates.paid,
      invoice_number: updates.invoiceNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', disbursementId)
    .select()
    .single()

  if (error) {
    console.error('Error updating disbursement:', error)
    throw new Error('Failed to update disbursement')
  }

  return transformDisbursement(data)
}

/**
 * Delete disbursement
 */
export async function deleteDisbursement(disbursementId: string): Promise<void> {
  const { error } = await getClient()
    .from('disbursements')
    .delete()
    .eq('id', disbursementId)

  if (error) {
    console.error('Error deleting disbursement:', error)
    throw new Error('Failed to delete disbursement')
  }
}

/**
 * Get total disbursements for a case
 */
export async function getTotalDisbursements(caseId: string): Promise<number> {
  const { data, error } = await getClient()
    .from('disbursements')
    .select('amount')
    .eq('case_id', caseId)

  if (error) {
    console.error('Error calculating total disbursements:', error)
    throw new Error('Failed to calculate total disbursements')
  }

  return (data || []).reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
}

function transformDisbursement(db: any): Disbursement {
  return {
    id: db.id,
    caseId: db.case_id,
    date: db.date,
    description: db.description,
    amount: parseFloat(db.amount || 0),
    category: db.category as Disbursement['category'],
    assessable: db.assessable || false,
    paid: db.paid || false,
    invoiceNumber: db.invoice_number,
  }
}
