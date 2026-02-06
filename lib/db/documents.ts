/**
 * Database Service: Documents
 * CRUD operations for documents
 */

import { getSupabase } from '@/lib/supabase/singleton'

// Use singleton to avoid multiple connections
const getClient = () => getSupabase()

export interface DocumentRecord {
  id: string
  firmId: string
  caseId?: string
  title: string
  type: string
  filePath: string
  fileSize?: number
  mimeType?: string
  schedule?: 'A' | 'B' | 'C'
  uploadedByUserId?: string
  createdAt: string
  updatedAt: string
  // Joined fields
  case?: {
    id: string
    title: string
  }
  uploadedBy?: {
    id: string
    name: string
  }
}

/**
 * Get all documents for the current user's firm
 */
export async function getDocuments(filters?: {
  caseId?: string
  type?: string
  schedule?: 'A' | 'B' | 'C'
}): Promise<DocumentRecord[]> {
  let query = getClient()
    .from('documents')
    .select(`
      *,
      cases (id, title),
      users_metadata!documents_uploaded_by_user_id_fkey (id, name)
    `)
    .order('created_at', { ascending: false })

  if (filters?.caseId) {
    query = query.eq('case_id', filters.caseId)
  }

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.schedule) {
    query = query.eq('schedule', filters.schedule)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching documents:', error)
    throw new Error('Failed to fetch documents')
  }

  return (data || []).map(transformDocument)
}

/**
 * Get a single document by ID
 */
export async function getDocumentById(documentId: string): Promise<DocumentRecord | null> {
  const { data, error } = await getClient()
    .from('documents')
    .select(`
      *,
      cases (id, title),
      users_metadata!documents_uploaded_by_user_id_fkey (id, name)
    `)
    .eq('id', documentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching document:', error)
    throw new Error('Failed to fetch document')
  }

  return transformDocument(data)
}

/**
 * Create a new document record
 */
export async function createDocument(documentData: {
  firmId: string
  caseId?: string
  title: string
  type: string
  filePath: string
  fileSize?: number
  mimeType?: string
  schedule?: 'A' | 'B' | 'C'
  uploadedByUserId?: string
}): Promise<DocumentRecord> {
  const { data, error } = await getClient()
    .from('documents')
    .insert({
      firm_id: documentData.firmId,
      case_id: documentData.caseId,
      title: documentData.title,
      type: documentData.type,
      file_path: documentData.filePath,
      file_size: documentData.fileSize,
      mime_type: documentData.mimeType,
      schedule: documentData.schedule,
      uploaded_by_user_id: documentData.uploadedByUserId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating document:', error)
    throw new Error('Failed to create document')
  }

  return transformDocument(data)
}

/**
 * Update a document
 */
export async function updateDocument(documentId: string, updates: Partial<{
  title: string
  type: string
  schedule: 'A' | 'B' | 'C'
}>): Promise<DocumentRecord> {
  const updateData: any = {}

  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.type !== undefined) updateData.type = updates.type
  if (updates.schedule !== undefined) updateData.schedule = updates.schedule

  const { error } = await getClient()
    .from('documents')
    .update(updateData)
    .eq('id', documentId)

  if (error) {
    console.error('Error updating document:', error)
    throw new Error('Failed to update document')
  }

  const updatedDoc = await getDocumentById(documentId)
  if (!updatedDoc) {
    throw new Error('Document not found after update')
  }

  return updatedDoc
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const { error } = await getClient().from('documents').delete().eq('id', documentId)

  if (error) {
    console.error('Error deleting document:', error)
    throw new Error('Failed to delete document')
  }
}

/**
 * Transform database record to DocumentRecord format
 */
function transformDocument(dbDoc: any): DocumentRecord {
  return {
    id: dbDoc.id,
    firmId: dbDoc.firm_id,
    caseId: dbDoc.case_id,
    title: dbDoc.title,
    type: dbDoc.type,
    filePath: dbDoc.file_path,
    fileSize: dbDoc.file_size,
    mimeType: dbDoc.mime_type,
    schedule: dbDoc.schedule,
    uploadedByUserId: dbDoc.uploaded_by_user_id,
    createdAt: dbDoc.created_at,
    updatedAt: dbDoc.updated_at,
    case: dbDoc.cases ? {
      id: dbDoc.cases.id,
      title: dbDoc.cases.title,
    } : undefined,
    uploadedBy: dbDoc.users_metadata ? {
      id: dbDoc.users_metadata.id,
      name: dbDoc.users_metadata.name,
    } : undefined,
  }
}
