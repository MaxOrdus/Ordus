/**
 * Supabase Authentication Service
 * Handles user authentication using Supabase Auth
 */

import { getSupabase } from '@/lib/supabase/singleton'
import { User, LoginCredentials, SignupData, AuthSession } from '@/types/auth'

// Use singleton to avoid multiple connections
const getClient = () => getSupabase()

/**
 * Login user with email and password
 */
export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const { data, error } = await getClient().auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  })

  if (error) {
    throw new Error(error.message || 'Invalid email or password')
  }

  if (!data.user || !data.session) {
    throw new Error('Login failed - no user or session returned')
  }

  // Fetch user metadata from users_metadata table
  const { data: userMetadata, error: metadataError } = await getClient()
    .from('users_metadata')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (metadataError || !userMetadata) {
    throw new Error('User profile not found. Please contact administrator.')
  }

  // Map Supabase user to our User type
  const user: User = {
    id: data.user.id,
    email: data.user.email!,
    name: userMetadata.name,
    role: userMetadata.role as User['role'],
    firmId: userMetadata.firm_id || undefined,
    createdAt: userMetadata.created_at,
    lastLoginAt: userMetadata.last_login_at || new Date().toISOString(),
    isActive: userMetadata.is_active ?? true,
    preferences: userMetadata.preferences || {
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

  // Update last login time
  await getClient()
    .from('users_metadata')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id)

  // Log activity
  await logActivity({
    userId: user.id,
    userName: user.name,
    action: 'Viewed',
    entityType: 'User',
    entityId: user.id,
    entityTitle: 'Login',
  })

  return {
    user,
    token: data.session.access_token,
    expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
  }
}

/**
 * Signup new user
 */
export async function signup(data: SignupData): Promise<AuthSession> {
  // First, create the auth user
  const { data: authData, error: authError } = await getClient().auth.signUp({
    email: data.email,
    password: data.password,
  })

  if (authError) {
    throw new Error(authError.message || 'Failed to create account')
  }

  if (!authData.user) {
    throw new Error('Account creation failed - no user returned')
  }

  // Create a firm if one doesn't exist (for first user)
  // In production, you might want to handle firm creation separately
  let firmId: string | null = null
  
  // Check if user provided a firm_id, otherwise create a new firm
  if (!data.firmId) {
    const { data: firmData, error: firmError } = await getClient()
      .from('firms')
      .insert({ name: `${data.name}'s Firm` })
      .select()
      .single()

    if (firmError) {
      // If firm creation fails, try to get existing firm or handle error
      throw new Error('Failed to create firm. Please contact administrator.')
    }

    firmId = firmData.id
  } else {
    firmId = data.firmId
  }

  // Create user metadata record
  const { error: metadataError } = await getClient().from('users_metadata').insert({
    id: authData.user.id,
    name: data.name,
    role: data.role,
    firm_id: firmId,
    preferences: {
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
    is_active: true,
  })

  if (metadataError) {
    // Note: Cannot delete auth user from client side
    // Admin would need to clean up via Supabase dashboard if needed
    throw new Error('Failed to create user profile. Please contact administrator.')
  }

  // Fetch the created user metadata
  const { data: userMetadata } = await getClient()
    .from('users_metadata')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  if (!userMetadata) {
    throw new Error('Failed to retrieve user profile')
  }

  const user: User = {
    id: authData.user.id,
    email: authData.user.email!,
    name: userMetadata.name,
    role: userMetadata.role as User['role'],
    firmId: userMetadata.firm_id || undefined,
    createdAt: userMetadata.created_at,
    lastLoginAt: new Date().toISOString(),
    isActive: userMetadata.is_active ?? true,
    preferences: userMetadata.preferences || {
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

  // Log activity
  await logActivity({
    userId: user.id,
    userName: user.name,
    action: 'Created',
    entityType: 'User',
    entityId: user.id,
    entityTitle: 'Account Created',
  })

  // Get session (might be null if email confirmation is required)
  const { data: sessionData } = await getClient().auth.getSession()

  return {
    user,
    token: sessionData.session?.access_token || '',
    expiresAt: sessionData.session
      ? new Date(sessionData.session.expires_at! * 1000).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  const { data: { user } } = await getClient().auth.getUser()

  if (user) {
    await logActivity({
      userId: user.id,
      userName: 'User',
      action: 'Viewed',
      entityType: 'User',
      entityId: user.id,
      entityTitle: 'Logout',
    })
  }

  const { error } = await getClient().auth.signOut()
  if (error) {
    throw new Error(error.message || 'Failed to logout')
  }
}

/**
 * Get current session from Supabase
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const { data: { session }, error } = await getClient().auth.getSession()

  if (error || !session || !session.user) {
    return null
  }

  // Fetch user metadata
  const { data: userMetadata, error: metadataError } = await getClient()
    .from('users_metadata')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (metadataError || !userMetadata) {
    return null
  }

  const user: User = {
    id: session.user.id,
    email: session.user.email!,
    name: userMetadata.name,
    role: userMetadata.role as User['role'],
    firmId: userMetadata.firm_id || undefined,
    createdAt: userMetadata.created_at,
    lastLoginAt: userMetadata.last_login_at || new Date().toISOString(),
    isActive: userMetadata.is_active ?? true,
    preferences: userMetadata.preferences || {
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

  return {
    user,
    token: session.access_token,
    expiresAt: new Date(session.expires_at! * 1000).toISOString(),
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await getClient().auth.getSession()
  return !!session
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getCurrentSession()
  return session?.user || null
}

/**
 * Log user activity
 */
export async function logActivity(log: {
  userId: string
  userName: string
  action: string
  entityType: string
  entityId: string
  entityTitle: string
}): Promise<void> {
  // Get user's firm_id
  const { data: userMetadata } = await getClient()
    .from('users_metadata')
    .select('firm_id')
    .eq('id', log.userId)
    .single()

  if (!userMetadata?.firm_id) {
    console.warn('Cannot log activity: user has no firm_id')
    return
  }

  await getClient().from('activity_logs').insert({
    firm_id: userMetadata.firm_id,
    user_id: log.userId,
    user_name: log.userName,
    action: log.action,
    entity_type: log.entityType,
    entity_id: log.entityId,
    entity_title: log.entityTitle,
  })
}

/**
 * Get activity logs
 */
export async function getActivityLogs(
  userId?: string,
  entityType?: string,
  entityId?: string
): Promise<any[]> {
  let query = getClient().from('activity_logs').select('*').order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  if (entityId) {
    query = query.eq('entity_id', entityId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching activity logs:', error)
    return []
  }

  return data || []
}

