import { getSupabase } from '@/lib/supabase/singleton'

export type TeamRole = 'lead_lawyer' | 'paralegal' | 'team_member' | 'ab_assistant'

// Use singleton to avoid multiple connections

export interface CaseTeamMember {
  id: string
  caseId: string
  userId: string
  teamRole: TeamRole
  assignedBy: string | null
  assignedAt: string
  // Joined user data
  userName?: string
  userEmail?: string
  userRole?: string
}

/**
 * Get all team members for a case
 */
export async function getCaseTeamMembers(caseId: string): Promise<CaseTeamMember[]> {
  const supabase = getSupabase()

  // First get the team members
  const { data: members, error } = await supabase
    .from('case_team_members')
    .select('id, case_id, user_id, team_role, assigned_by, assigned_at')
    .eq('case_id', caseId)
    .order('assigned_at', { ascending: true })

  if (error) {
    console.error('Error fetching case team members:', error)
    throw error
  }

  if (!members || members.length === 0) {
    return []
  }

  // Then get user metadata for all members
  const userIds = members.map(m => m.user_id)
  const { data: users } = await supabase
    .from('users_metadata')
    .select('id, name, email, role')
    .in('id', userIds)

  const userMap = new Map((users || []).map(u => [u.id, u]))

  return members.map((row: any) => {
    const user = userMap.get(row.user_id)
    return {
      id: row.id,
      caseId: row.case_id,
      userId: row.user_id,
      teamRole: row.team_role,
      assignedBy: row.assigned_by,
      assignedAt: row.assigned_at,
      userName: user?.name,
      userEmail: user?.email,
      userRole: user?.role,
    }
  })
}

/**
 * Add a team member to a case
 */
export async function addCaseTeamMember(
  caseId: string,
  userId: string,
  teamRole: TeamRole,
  assignedBy: string
): Promise<CaseTeamMember> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('case_team_members')
    .insert({
      case_id: caseId,
      user_id: userId,
      team_role: teamRole,
      assigned_by: assignedBy,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding case team member:', error)
    throw error
  }

  // If adding as lead_lawyer or paralegal, also update the cases table
  if (teamRole === 'lead_lawyer') {
    await supabase
      .from('cases')
      .update({ lead_lawyer_id: userId })
      .eq('id', caseId)
  } else if (teamRole === 'paralegal') {
    await supabase
      .from('cases')
      .update({ paralegal_id: userId })
      .eq('id', caseId)
  }

  return {
    id: data.id,
    caseId: data.case_id,
    userId: data.user_id,
    teamRole: data.team_role,
    assignedBy: data.assigned_by,
    assignedAt: data.assigned_at,
  }
}

/**
 * Remove a team member from a case
 */
export async function removeCaseTeamMember(caseId: string, userId: string): Promise<void> {
  const supabase = getSupabase()
  // First get the team member to check their role
  const { data: member } = await supabase
    .from('case_team_members')
    .select('team_role')
    .eq('case_id', caseId)
    .eq('user_id', userId)
    .single()

  const { error } = await supabase
    .from('case_team_members')
    .delete()
    .eq('case_id', caseId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error removing case team member:', error)
    throw error
  }

  // If removing lead_lawyer or paralegal, also update the cases table
  if (member?.team_role === 'lead_lawyer') {
    await supabase
      .from('cases')
      .update({ lead_lawyer_id: null })
      .eq('id', caseId)
  } else if (member?.team_role === 'paralegal') {
    await supabase
      .from('cases')
      .update({ paralegal_id: null })
      .eq('id', caseId)
  }
}

/**
 * Update a team member's role on a case
 */
export async function updateCaseTeamMemberRole(
  caseId: string,
  userId: string,
  newRole: TeamRole
): Promise<void> {
  const supabase = getSupabase()
  // Get current role
  const { data: member } = await supabase
    .from('case_team_members')
    .select('team_role')
    .eq('case_id', caseId)
    .eq('user_id', userId)
    .single()

  const oldRole = member?.team_role

  const { error } = await supabase
    .from('case_team_members')
    .update({ team_role: newRole })
    .eq('case_id', caseId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating case team member role:', error)
    throw error
  }

  // Update cases table if lead/paralegal changed
  if (oldRole === 'lead_lawyer' && newRole !== 'lead_lawyer') {
    await supabase.from('cases').update({ lead_lawyer_id: null }).eq('id', caseId)
  }
  if (oldRole === 'paralegal' && newRole !== 'paralegal') {
    await supabase.from('cases').update({ paralegal_id: null }).eq('id', caseId)
  }
  if (newRole === 'lead_lawyer') {
    await supabase.from('cases').update({ lead_lawyer_id: userId }).eq('id', caseId)
  }
  if (newRole === 'paralegal') {
    await supabase.from('cases').update({ paralegal_id: userId }).eq('id', caseId)
  }
}

/**
 * Check if a user is a lead (lead_lawyer or paralegal) on any case
 * Used to determine which dashboard to show
 */
export async function isUserLeadOnAnyCases(userId: string): Promise<boolean> {
  const supabase = getSupabase()
  
  // Check if user is primary_lawyer or assigned_paralegal
  const [primaryLawyerResult, assignedParalegalResult] = await Promise.all([
    supabase.from('cases').select('id').eq('primary_lawyer_id', userId).limit(1),
    supabase.from('cases').select('id').eq('assigned_paralegal_id', userId).limit(1)
  ])

  if (primaryLawyerResult.error || assignedParalegalResult.error) {
    console.error('Error checking if user is lead:', primaryLawyerResult.error || assignedParalegalResult.error)
    return false
  }

  return (primaryLawyerResult.data?.length || 0) > 0 || (assignedParalegalResult.data?.length || 0) > 0
}

/**
 * Get all cases where user is a team member (for case visibility)
 * Checks both case_team_members table AND cases table for lead/paralegal assignments
 */
export async function getCasesForTeamMember(userId: string): Promise<string[]> {
  const supabase = getSupabase()
  
  // Get cases from case_team_members table
  const { data: teamMemberCases, error: teamError } = await supabase
    .from('case_team_members')
    .select('case_id')
    .eq('user_id', userId)

  if (teamError) {
    console.error('[getCasesForTeamMember] Error fetching cases from case_team_members:', teamError)
  } else {
    console.log(`[getCasesForTeamMember] Found ${teamMemberCases?.length || 0} cases in case_team_members for user ${userId}`)
  }

  // Also get cases where user is primary_lawyer or assigned_paralegal directly on cases table
  // Note: lead_lawyer_id and paralegal_id columns don't exist - use primary_lawyer_id and assigned_paralegal_id
  const [primaryLawyerResult, assignedParalegalResult] = await Promise.all([
    supabase.from('cases').select('id').eq('primary_lawyer_id', userId),
    supabase.from('cases').select('id').eq('assigned_paralegal_id', userId)
  ])

  const leadError = primaryLawyerResult.error || assignedParalegalResult.error
  const leadCases = [
    ...(primaryLawyerResult.data || []),
    ...(assignedParalegalResult.data || [])
  ]

  if (leadError) {
    console.error('[getCasesForTeamMember] Error fetching cases where user is primary lawyer/paralegal:', leadError)
  } else {
    console.log(`[getCasesForTeamMember] Found ${leadCases.length} cases where user is primary lawyer/paralegal for user ${userId}`)
  }

  // Combine and deduplicate case IDs
  const teamMemberIds = (teamMemberCases || []).map(row => row.case_id)
  const leadCaseIds = (leadCases || []).map(row => row.id)
  
  const allCaseIds = [...new Set([...teamMemberIds, ...leadCaseIds])]
  console.log(`[getCasesForTeamMember] Total unique cases found: ${allCaseIds.length}`)
  
  return allCaseIds
}

/**
 * Get cases where user is the lead (primary_lawyer or assigned_paralegal)
 */
export async function getCasesWhereUserIsLead(userId: string): Promise<string[]> {
  const supabase = getSupabase()
  
  // Use separate queries - check primary_lawyer_id and assigned_paralegal_id
  const [primaryLawyerResult, assignedParalegalResult] = await Promise.all([
    supabase.from('cases').select('id').eq('primary_lawyer_id', userId),
    supabase.from('cases').select('id').eq('assigned_paralegal_id', userId)
  ])

  const error = primaryLawyerResult.error || assignedParalegalResult.error
  if (error) {
    console.error('Error fetching cases where user is lead:', error)
    return []
  }

  const allCases = [
    ...(primaryLawyerResult.data || []),
    ...(assignedParalegalResult.data || [])
  ]

  return [...new Set(allCases.map(row => row.id))]
}

/**
 * Get team members working under a lead (for Team Lead Dashboard)
 */
export async function getTeamMembersUnderLead(leadUserId: string): Promise<{
  userId: string
  userName: string
  userRole: string
  caseCount: number
}[]> {
  // Get all cases where this user is lead
  const leadCaseIds = await getCasesWhereUserIsLead(leadUserId)

  if (leadCaseIds.length === 0) {
    return []
  }

  // Get all team members on those cases (excluding the lead themselves)
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('case_team_members')
    .select('user_id')
    .in('case_id', leadCaseIds)
    .neq('user_id', leadUserId)

  if (error) {
    console.error('Error fetching team members under lead:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  // Get unique user IDs and count occurrences
  const userCounts = new Map<string, number>()
  for (const row of data) {
    userCounts.set(row.user_id, (userCounts.get(row.user_id) || 0) + 1)
  }

  // Fetch user metadata
  const userIds = Array.from(userCounts.keys())
  const { data: users } = await supabase
    .from('users_metadata')
    .select('id, name, role')
    .in('id', userIds)

  const userMap = new Map((users || []).map(u => [u.id, u]))

  return userIds.map(userId => {
    const user = userMap.get(userId)
    return {
      userId,
      userName: user?.name || 'Unknown',
      userRole: user?.role || 'Unknown',
      caseCount: userCounts.get(userId) || 0,
    }
  })
}

/**
 * Get colleagues (other team members on the same cases as the user)
 */
export async function getColleaguesOnSameCases(userId: string): Promise<{
  userId: string
  userName: string
  userRole: string
  teamRole: TeamRole
  sharedCaseCount: number
}[]> {
  // First get the user's cases
  const userCaseIds = await getCasesForTeamMember(userId)

  if (userCaseIds.length === 0) {
    return []
  }

  // Get all team members on those cases (excluding the user themselves)
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('case_team_members')
    .select('user_id, team_role')
    .in('case_id', userCaseIds)
    .neq('user_id', userId)

  if (error) {
    console.error('Error fetching colleagues:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  const roleHierarchy: Record<TeamRole, number> = {
    'lead_lawyer': 3,
    'paralegal': 2,
    'team_member': 1,
    'ab_assistant': 1,
  }

  // Aggregate by user, keeping track of their highest team role
  const userAggregates = new Map<string, { teamRole: TeamRole; sharedCaseCount: number }>()

  for (const row of data) {
    const existing = userAggregates.get(row.user_id)
    const teamRole = row.team_role as TeamRole
    if (existing) {
      existing.sharedCaseCount++
      if (roleHierarchy[teamRole] > roleHierarchy[existing.teamRole]) {
        existing.teamRole = teamRole
      }
    } else {
      userAggregates.set(row.user_id, { teamRole, sharedCaseCount: 1 })
    }
  }

  // Fetch user metadata
  const userIds = Array.from(userAggregates.keys())
  const { data: users } = await supabase
    .from('users_metadata')
    .select('id, name, role')
    .in('id', userIds)

  const userMap = new Map((users || []).map(u => [u.id, u]))

  // Build result
  const result = userIds.map(uId => {
    const user = userMap.get(uId)
    const agg = userAggregates.get(uId)!
    return {
      userId: uId,
      userName: user?.name || 'Unknown',
      userRole: user?.role || 'Unknown',
      teamRole: agg.teamRole,
      sharedCaseCount: agg.sharedCaseCount,
    }
  })

  // Sort by role hierarchy (leads first) then by name
  return result.sort((a, b) => {
    const roleCompare = roleHierarchy[b.teamRole] - roleHierarchy[a.teamRole]
    if (roleCompare !== 0) return roleCompare
    return a.userName.localeCompare(b.userName)
  })
}
