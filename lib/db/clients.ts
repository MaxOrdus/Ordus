/**
 * Database Service: Clients
 * CRUD operations for clients
 */

import { getSupabase } from '@/lib/supabase/singleton'

// Use singleton to avoid multiple connections
const getClient = () => getSupabase()

export interface ClientRecord {
  id: string
  firmId: string
  name: string
  email?: string
  phone?: string
  dateOfBirth?: string
  address?: string
  notes?: string
  createdAt: string
  updatedAt: string
  // Computed fields
  caseCount?: number
  totalValue?: number
}

/**
 * Get all clients for the current user's firm
 */
export async function getClients(): Promise<ClientRecord[]> {
  const { data, error } = await getClient()
    .from('clients')
    .select(`
      *,
      cases (id, estimated_value)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching clients:', error)
    throw new Error('Failed to fetch clients')
  }

  return (data || []).map(transformClient)
}

/**
 * Get a single client by ID
 */
export async function getClientById(clientId: string): Promise<ClientRecord | null> {
  const { data, error } = await getClient()
    .from('clients')
    .select(`
      *,
      cases (id, estimated_value)
    `)
    .eq('id', clientId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching client:', error)
    throw new Error('Failed to fetch client')
  }

  return transformClient(data)
}

/**
 * Create a new client
 */
export async function createClient(clientData: {
  firmId: string
  name: string
  email?: string
  phone?: string
  dateOfBirth?: string
  address?: string
  notes?: string
}): Promise<ClientRecord> {
  const { data, error } = await getClient()
    .from('clients')
    .insert({
      firm_id: clientData.firmId,
      name: clientData.name,
      email: clientData.email,
      phone: clientData.phone,
      date_of_birth: clientData.dateOfBirth,
      address: clientData.address,
      notes: clientData.notes,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating client:', error)
    throw new Error('Failed to create client')
  }

  return transformClient(data)
}

/**
 * Update a client
 */
export async function updateClient(clientId: string, updates: Partial<{
  name: string
  email: string
  phone: string
  dateOfBirth: string
  address: string
  notes: string
}>): Promise<ClientRecord> {
  const updateData: any = {}

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.email !== undefined) updateData.email = updates.email
  if (updates.phone !== undefined) updateData.phone = updates.phone
  if (updates.dateOfBirth !== undefined) updateData.date_of_birth = updates.dateOfBirth
  if (updates.address !== undefined) updateData.address = updates.address
  if (updates.notes !== undefined) updateData.notes = updates.notes

  const { error } = await getClient()
    .from('clients')
    .update(updateData)
    .eq('id', clientId)

  if (error) {
    console.error('Error updating client:', error)
    throw new Error('Failed to update client')
  }

  const updatedClient = await getClientById(clientId)
  if (!updatedClient) {
    throw new Error('Client not found after update')
  }

  return updatedClient
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: string): Promise<void> {
  const { error } = await getClient().from('clients').delete().eq('id', clientId)

  if (error) {
    console.error('Error deleting client:', error)
    throw new Error('Failed to delete client')
  }
}

/**
 * Transform database record to ClientRecord format
 */
function transformClient(dbClient: any): ClientRecord {
  const cases = dbClient.cases || []
  const totalValue = cases.reduce((sum: number, c: any) => sum + (parseFloat(c.estimated_value) || 0), 0)

  return {
    id: dbClient.id,
    firmId: dbClient.firm_id,
    name: dbClient.name,
    email: dbClient.email,
    phone: dbClient.phone,
    dateOfBirth: dbClient.date_of_birth,
    address: dbClient.address,
    notes: dbClient.notes,
    createdAt: dbClient.created_at,
    updatedAt: dbClient.updated_at,
    caseCount: cases.length,
    totalValue,
  }
}
