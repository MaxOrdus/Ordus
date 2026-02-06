/**
 * Database Service: Time Entries
 * CRUD operations for time tracking
 */

import { getSupabase } from '@/lib/supabase/singleton'

// Use singleton to avoid multiple connections
const getClient = () => getSupabase()

export interface TimeEntry {
  id: string
  firmId: string
  caseId: string | null
  userId: string
  description: string
  hours: number
  date: string
  billable: boolean
  rate: number
  createdAt: string
  updatedAt: string
  // Joined fields
  caseName?: string
  userName?: string
}

/**
 * Get all time entries for the current user's firm
 */
export async function getTimeEntries(options?: {
  userId?: string
  caseId?: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<TimeEntry[]> {
  let query = getClient()
    .from('time_entries')
    .select(`
      *,
      cases (title),
      users_metadata (name)
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (options?.userId) {
    query = query.eq('user_id', options.userId)
  }

  if (options?.caseId) {
    query = query.eq('case_id', options.caseId)
  }

  if (options?.startDate) {
    query = query.gte('date', options.startDate)
  }

  if (options?.endDate) {
    query = query.lte('date', options.endDate)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching time entries:', error)
    throw new Error('Failed to fetch time entries')
  }

  return (data || []).map(transformTimeEntry)
}

/**
 * Get time entries for a specific user (current user default)
 */
export async function getUserTimeEntries(userId: string, limit = 20): Promise<TimeEntry[]> {
  return getTimeEntries({ userId, limit })
}

/**
 * Get time entries for a specific case
 */
export async function getCaseTimeEntries(caseId: string): Promise<TimeEntry[]> {
  return getTimeEntries({ caseId })
}

/**
 * Create a new time entry
 */
export async function createTimeEntry(entry: {
  firmId: string
  caseId?: string | null
  userId: string
  description: string
  hours: number
  date: string
  billable?: boolean
  rate?: number
}): Promise<TimeEntry> {
  const { data, error } = await getClient()
    .from('time_entries')
    .insert({
      firm_id: entry.firmId,
      case_id: entry.caseId || null,
      user_id: entry.userId,
      description: entry.description,
      hours: entry.hours,
      date: entry.date,
      billable: entry.billable ?? true,
      rate: entry.rate || 300,
    })
    .select(`
      *,
      cases (title),
      users_metadata (name)
    `)
    .single()

  if (error) {
    console.error('Error creating time entry:', error)
    throw new Error('Failed to create time entry')
  }

  return transformTimeEntry(data)
}

/**
 * Update a time entry
 */
export async function updateTimeEntry(
  entryId: string,
  updates: Partial<{
    caseId: string | null
    description: string
    hours: number
    date: string
    billable: boolean
    rate: number
  }>
): Promise<TimeEntry> {
  const { data, error } = await getClient()
    .from('time_entries')
    .update({
      ...(updates.caseId !== undefined && { case_id: updates.caseId }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.hours !== undefined && { hours: updates.hours }),
      ...(updates.date !== undefined && { date: updates.date }),
      ...(updates.billable !== undefined && { billable: updates.billable }),
      ...(updates.rate !== undefined && { rate: updates.rate }),
    })
    .eq('id', entryId)
    .select(`
      *,
      cases (title),
      users_metadata (name)
    `)
    .single()

  if (error) {
    console.error('Error updating time entry:', error)
    throw new Error('Failed to update time entry')
  }

  return transformTimeEntry(data)
}

/**
 * Delete a time entry
 */
export async function deleteTimeEntry(entryId: string): Promise<void> {
  const { error } = await getClient()
    .from('time_entries')
    .delete()
    .eq('id', entryId)

  if (error) {
    console.error('Error deleting time entry:', error)
    throw new Error('Failed to delete time entry')
  }
}

/**
 * Get weekly time stats for a user
 */
export async function getWeeklyTimeStats(userId: string): Promise<{
  weeklyTotal: number
  dailyBreakdown: { date: string; hours: number }[]
  streakDays: number
}> {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay()) // Sunday
  startOfWeek.setHours(0, 0, 0, 0)

  const { data, error } = await getClient()
    .from('time_entries')
    .select('date, hours')
    .eq('user_id', userId)
    .gte('date', startOfWeek.toISOString().split('T')[0])
    .lte('date', today.toISOString().split('T')[0])

  if (error) {
    console.error('Error fetching weekly stats:', error)
    return { weeklyTotal: 0, dailyBreakdown: [], streakDays: 0 }
  }

  // Aggregate by date
  const byDate: Record<string, number> = {}
  let weeklyTotal = 0

  for (const entry of data || []) {
    byDate[entry.date] = (byDate[entry.date] || 0) + entry.hours
    weeklyTotal += entry.hours
  }

  const dailyBreakdown = Object.entries(byDate)
    .map(([date, hours]) => ({ date, hours }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Calculate streak (consecutive days with entries)
  let streakDays = 0
  const checkDate = new Date(today)
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
    if (byDate[dateStr] && byDate[dateStr] > 0) {
      streakDays++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return { weeklyTotal, dailyBreakdown, streakDays }
}

/**
 * Transform database record to TimeEntry format
 */
function transformTimeEntry(dbEntry: any): TimeEntry {
  return {
    id: dbEntry.id,
    firmId: dbEntry.firm_id,
    caseId: dbEntry.case_id,
    userId: dbEntry.user_id,
    description: dbEntry.description,
    hours: parseFloat(dbEntry.hours || 0),
    date: dbEntry.date,
    billable: dbEntry.billable ?? true,
    rate: parseFloat(dbEntry.rate || 300),
    createdAt: dbEntry.created_at,
    updatedAt: dbEntry.updated_at,
    caseName: dbEntry.cases?.title,
    userName: dbEntry.users_metadata?.name,
  }
}
