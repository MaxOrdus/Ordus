/**
 * Database Service: Users
 * Operations for managing users and team structure
 */

import { getSupabase } from '@/lib/supabase/singleton'
import { User } from '@/types/auth'

// Use singleton to avoid multiple connections
const getClient = () => getSupabase()

/**
 * Get all users in the current user's firm
 */
export async function getFirmUsers(): Promise<User[]> {
  const { data, error } = await getClient()
    .from('users_metadata')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching users:', error)
    throw new Error('Failed to fetch users')
  }

  return (data || []).map(transformUser)
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: User['role']): Promise<User[]> {
  const { data, error } = await getClient()
    .from('users_metadata')
    .select('*')
    .eq('role', role)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching users by role:', error)
    throw new Error('Failed to fetch users')
  }

  return (data || []).map(transformUser)
}

/**
 * Get a single user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await getClient()
    .from('users_metadata')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching user:', error)
    throw new Error('Failed to fetch user')
  }

  return transformUser(data)
}

/**
 * Get cases assigned to a specific lawyer
 */
export async function getCasesByLawyer(lawyerId: string): Promise<any[]> {
  const { data, error } = await getClient()
    .from('cases')
    .select('*')
    .or(`primary_lawyer_id.eq.${lawyerId},assigned_team_members.cs.{${lawyerId}}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cases by lawyer:', error)
    throw new Error('Failed to fetch cases')
  }

  return data || []
}

/**
 * Get cases assigned to a paralegal
 */
export async function getCasesByParalegal(paralegalId: string): Promise<any[]> {
  const { data, error } = await getClient()
    .from('cases')
    .select('*')
    .eq('assigned_paralegal_id', paralegalId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cases by paralegal:', error)
    throw new Error('Failed to fetch cases')
  }

  return data || []
}

/**
 * Transform database record to User format
 */
function transformUser(dbUser: any): User {
  return {
    id: dbUser.id,
    email: '', // Email is in auth.users, not users_metadata
    name: dbUser.name,
    role: dbUser.role as User['role'],
    avatar: dbUser.avatar,
    firmId: dbUser.firm_id,
    createdAt: dbUser.created_at,
    lastLoginAt: dbUser.last_login_at,
    isActive: dbUser.is_active ?? true,
    preferences: dbUser.preferences || {
      theme: 'system',
      notifications: {
        email: true,
        push: true,
        criticalDeadlines: true,
        treatmentGaps: true,
        taskAssignments: true,
        settlementOffers: true,
      },
      dashboard: {
        showBillableStreak: true,
        showCaseVelocity: true,
        showRedZone: true,
        showStalledCases: true,
      },
    },
  }
}

