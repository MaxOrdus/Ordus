/**
 * Admin Supabase Client with Auth Verification
 * Creates a service role client for admin operations, with request authentication
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export type AdminRole = 'SuperAdmin' | 'Admin'

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  firmId: string | null
}

/**
 * Create admin Supabase client with service role key (bypasses RLS)
 * IMPORTANT: Only use this after verifying the calling user has admin permissions
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials. Check SUPABASE_SERVICE_ROLE_KEY env var.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Create server-side Supabase client for auth verification
 */
export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore - might be called from Server Component
          }
        },
      },
    }
  )
}

/**
 * Verify that the request is from an authenticated user
 * Returns the user info if authenticated, null otherwise
 */
export async function verifyAuth(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get user metadata for role and firm
    const { data: metadata, error: metaError } = await supabase
      .from('users_metadata')
      .select('role, firm_id')
      .eq('id', user.id)
      .single()

    if (metaError || !metadata) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      role: metadata.role,
      firmId: metadata.firm_id,
    }
  } catch {
    return null
  }
}

/**
 * Verify that the user is an admin (SuperAdmin or Admin)
 */
export async function verifyAdminAuth(): Promise<AuthenticatedUser | null> {
  const user = await verifyAuth()
  
  if (!user) {
    return null
  }

  if (!['SuperAdmin', 'Admin'].includes(user.role)) {
    return null
  }

  return user
}

/**
 * Higher-order function to wrap API handlers with admin authentication
 * Usage:
 *   export const POST = withAdminAuth(async (req, user, adminClient) => {
 *     // Your handler code here - user is verified admin
 *   })
 */
export function withAdminAuth(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
    adminClient: SupabaseClient
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = await verifyAdminAuth()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()
    return handler(request, user, adminClient)
  }
}

/**
 * Higher-order function to wrap API handlers with basic authentication
 * Usage:
 *   export const GET = withAuth(async (req, user) => {
 *     // Your handler code here - user is verified
 *   })
 */
export function withAuth(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = await verifyAuth()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    return handler(request, user)
  }
}

