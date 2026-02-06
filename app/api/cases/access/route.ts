/**
 * Case Access API Route
 * Manage who can view/edit cases within a firm
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createAdminClient, AuthenticatedUser } from '@/lib/supabase/admin'
import { errorToResponse, NotFoundError, ForbiddenError } from '@/lib/errors'
import { GrantCaseAccessSchema, UpdateCaseAccessSchema, AccessLevelSchema } from '@/lib/validations'
import { z } from 'zod'

/**
 * Helper to check if user has full access or is admin
 */
async function checkAccessPermission(
  adminClient: ReturnType<typeof createAdminClient>,
  caseId: string,
  userId: string,
  userRole: string
): Promise<boolean> {
  // Admins always have access
  if (['SuperAdmin', 'Admin'].includes(userRole)) {
    return true
  }

  // Check if user has full access to the case
  const { data: access } = await adminClient
    .from('case_access')
    .select('access_level')
    .eq('case_id', caseId)
    .eq('user_id', userId)
    .single()

  return access?.access_level === 'full'
}

/**
 * GET - Fetch access list for a case
 */
export const GET = withAuth(async (
  request: NextRequest,
  user: AuthenticatedUser
) => {
  try {
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Verify case exists and user has access
    const { data: caseData, error: caseError } = await adminClient
      .from('cases')
      .select('firm_id')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      throw new NotFoundError('Case')
    }

    // Must be in the same firm
    if (caseData.firm_id !== user.firmId && user.role !== 'SuperAdmin') {
      throw new ForbiddenError('You do not have access to this case')
    }

    // Get all access records for this case with user details
    const { data: accessList, error } = await adminClient
      .from('case_access')
      .select(`
        id,
        case_id,
        user_id,
        granted_by,
        access_level,
        is_creator,
        created_at,
        updated_at,
        user:users_metadata!case_access_user_id_fkey(id, name, role),
        granted_by_user:users_metadata!case_access_granted_by_fkey(id, name)
      `)
      .eq('case_id', caseId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[API] Error fetching case access:', error)
      return NextResponse.json(
        { error: `Failed to fetch access list: ${error.message}` },
        { status: 400 }
      )
    }

    // Transform to camelCase for frontend
    const transformed = (accessList || []).map(a => ({
      id: a.id,
      caseId: a.case_id,
      userId: a.user_id,
      grantedBy: a.granted_by,
      accessLevel: a.access_level,
      isCreator: a.is_creator,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      user: a.user,
      grantedByUser: a.granted_by_user
    }))

    return NextResponse.json({ data: transformed })
  } catch (error) {
    return errorToResponse(error)
  }
})

/**
 * POST - Grant access to a user
 */
export const POST = withAuth(async (
  request: NextRequest,
  user: AuthenticatedUser
) => {
  try {
    const body = await request.json()
    
    // Validate input
    const validated = GrantCaseAccessSchema.parse(body)

    const adminClient = createAdminClient()

    // Verify granter has permission
    const hasPermission = await checkAccessPermission(
      adminClient,
      validated.caseId,
      user.id,
      user.role
    )

    if (!hasPermission) {
      throw new ForbiddenError('You do not have permission to grant access to this case')
    }

    // Check that the target user is in the same firm
    const { data: targetUser } = await adminClient
      .from('users_metadata')
      .select('firm_id, name')
      .eq('id', validated.userId)
      .single()

    if (!targetUser) {
      throw new NotFoundError('Target user')
    }

    if (targetUser.firm_id !== user.firmId && user.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Can only grant access to users in the same firm' },
        { status: 400 }
      )
    }

    // Insert or update access
    const { data, error } = await adminClient
      .from('case_access')
      .upsert({
        case_id: validated.caseId,
        user_id: validated.userId,
        granted_by: user.id,
        access_level: validated.accessLevel,
        is_creator: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'case_id,user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('[API] Error granting access:', error)
      return NextResponse.json(
        { error: `Failed to grant access: ${error.message}` },
        { status: 400 }
      )
    }

    console.log(`[API] Access granted to ${targetUser.name} by ${user.email}`)

    return NextResponse.json({
      success: true,
      message: `Access granted to ${targetUser.name}`,
      data
    })
  } catch (error) {
    return errorToResponse(error)
  }
})

/**
 * PATCH - Update access level
 */
export const PATCH = withAuth(async (
  request: NextRequest,
  user: AuthenticatedUser
) => {
  try {
    const body = await request.json()
    
    // Validate input (use a simpler schema for PATCH)
    const PatchSchema = z.object({
      accessId: z.string().uuid('Invalid access ID'),
      accessLevel: AccessLevelSchema,
    })
    const validated = PatchSchema.parse(body)

    const adminClient = createAdminClient()

    // Get the access record to find the case
    const { data: accessRecord } = await adminClient
      .from('case_access')
      .select('case_id, is_creator')
      .eq('id', validated.accessId)
      .single()

    if (!accessRecord) {
      throw new NotFoundError('Access record')
    }

    // Check if requester has permission
    const hasPermission = await checkAccessPermission(
      adminClient,
      accessRecord.case_id,
      user.id,
      user.role
    )

    if (!hasPermission) {
      throw new ForbiddenError('You do not have permission to modify access')
    }

    // Update the access level
    const { error } = await adminClient
      .from('case_access')
      .update({
        access_level: validated.accessLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', validated.accessId)

    if (error) {
      return NextResponse.json(
        { error: `Failed to update access: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorToResponse(error)
  }
})

/**
 * DELETE - Revoke access
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  user: AuthenticatedUser
) => {
  try {
    const { searchParams } = new URL(request.url)
    const accessId = searchParams.get('accessId')

    if (!accessId) {
      return NextResponse.json(
        { error: 'Access ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Get the access record
    const { data: accessRecord } = await adminClient
      .from('case_access')
      .select('case_id, user_id, is_creator')
      .eq('id', accessId)
      .single()

    if (!accessRecord) {
      throw new NotFoundError('Access record')
    }

    // Cannot revoke creator's access
    if (accessRecord.is_creator) {
      return NextResponse.json(
        { error: 'Cannot revoke access from the case creator' },
        { status: 400 }
      )
    }

    // Check if requester has permission
    const hasPermission = await checkAccessPermission(
      adminClient,
      accessRecord.case_id,
      user.id,
      user.role
    )

    if (!hasPermission) {
      throw new ForbiddenError('You do not have permission to revoke access')
    }

    // Delete the access record
    const { error } = await adminClient
      .from('case_access')
      .delete()
      .eq('id', accessId)

    if (error) {
      return NextResponse.json(
        { error: `Failed to revoke access: ${error.message}` },
        { status: 400 }
      )
    }

    console.log(`[API] Access revoked for record ${accessId} by ${user.email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorToResponse(error)
  }
})
