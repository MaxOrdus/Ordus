/**
 * Admin Users API Route
 * Create, update, and delete users (requires admin permissions)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, AuthenticatedUser } from '@/lib/supabase/admin'
import { errorToResponse, NotFoundError } from '@/lib/errors'
import { CreateUserSchema, UpdateUserSchema } from '@/lib/validations'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * POST - Create a new user
 */
export const POST = withAdminAuth(async (
  request: NextRequest,
  user: AuthenticatedUser,
  adminClient: SupabaseClient
) => {
  try {
    const body = await request.json()
    
    // Validate input
    const validated = CreateUserSchema.parse(body)
    
    // SuperAdmin can create users in any firm, Admin only in their own firm
    const targetFirmId = validated.firmId || user.firmId
    if (user.role !== 'SuperAdmin' && targetFirmId !== user.firmId) {
      return NextResponse.json(
        { error: 'You can only create users in your own firm' },
        { status: 403 }
      )
    }

    // Create auth user using admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true,
      user_metadata: { name: validated.name, role: validated.role }
    })

    if (authError) {
      console.error('[Admin API] Auth creation error:', authError)
      return NextResponse.json(
        { error: `Failed to create auth user: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User creation returned no user data' },
        { status: 500 }
      )
    }

    // Create users_metadata record
    const { error: metadataError } = await adminClient
      .from('users_metadata')
      .insert({
        id: authData.user.id,
        name: validated.name,
        role: validated.role,
        firm_id: targetFirmId,
        is_active: true
      })

    if (metadataError) {
      console.error('[Admin API] Metadata creation error:', metadataError)
      // Clean up the auth user if metadata fails
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `Failed to create user metadata: ${metadataError.message}` },
        { status: 400 }
      )
    }

    console.log(`[Admin API] User created: ${validated.email} by admin ${user.email}`)

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: validated.name,
        role: validated.role,
        firmId: targetFirmId
      }
    })
  } catch (error) {
    return errorToResponse(error)
  }
})

/**
 * DELETE - Delete a user
 */
export const DELETE = withAdminAuth(async (
  request: NextRequest,
  user: AuthenticatedUser,
  adminClient: SupabaseClient
) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user exists and get their firm
    const { data: targetUser, error: lookupError } = await adminClient
      .from('users_metadata')
      .select('firm_id')
      .eq('id', userId)
      .single()

    if (lookupError || !targetUser) {
      throw new NotFoundError('User')
    }

    // SuperAdmin can delete any user, Admin only users in their own firm
    if (user.role !== 'SuperAdmin' && targetUser.firm_id !== user.firmId) {
      return NextResponse.json(
        { error: 'You can only delete users in your own firm' },
        { status: 403 }
      )
    }

    // Prevent deleting yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete from users_metadata first
    const { error: metadataError } = await adminClient
      .from('users_metadata')
      .delete()
      .eq('id', userId)

    if (metadataError) {
      console.error('[Admin API] Metadata deletion error:', metadataError)
    }

    // Delete auth user
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId)

    if (authError) {
      return NextResponse.json(
        { error: `Failed to delete user: ${authError.message}` },
        { status: 400 }
      )
    }

    console.log(`[Admin API] User deleted: ${userId} by admin ${user.email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorToResponse(error)
  }
})

/**
 * PATCH - Update user (activate/deactivate, change role, etc.)
 */
export const PATCH = withAdminAuth(async (
  request: NextRequest,
  user: AuthenticatedUser,
  adminClient: SupabaseClient
) => {
  try {
    const body = await request.json()
    
    // Validate input
    const validated = UpdateUserSchema.parse(body)

    // Check if user exists and get their firm
    const { data: targetUser, error: lookupError } = await adminClient
      .from('users_metadata')
      .select('firm_id')
      .eq('id', validated.userId)
      .single()

    if (lookupError || !targetUser) {
      throw new NotFoundError('User')
    }

    // SuperAdmin can update any user, Admin only users in their own firm
    if (user.role !== 'SuperAdmin' && targetUser.firm_id !== user.firmId) {
      return NextResponse.json(
        { error: 'You can only update users in your own firm' },
        { status: 403 }
      )
    }

    // Build metadata update object
    const metadataUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }
    
    if (validated.updates.name) metadataUpdates.name = validated.updates.name
    if (validated.updates.role) metadataUpdates.role = validated.updates.role
    if (validated.updates.firmId !== undefined) metadataUpdates.firm_id = validated.updates.firmId
    if (validated.updates.isActive !== undefined) metadataUpdates.is_active = validated.updates.isActive

    // Update users_metadata
    const { error: metadataError } = await adminClient
      .from('users_metadata')
      .update(metadataUpdates)
      .eq('id', validated.userId)

    if (metadataError) {
      return NextResponse.json(
        { error: `Failed to update user: ${metadataError.message}` },
        { status: 400 }
      )
    }

    // If email or password changed, update auth user too
    if (validated.updates.email || validated.updates.password) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(
        validated.userId,
        {
          ...(validated.updates.email && { email: validated.updates.email, email_confirm: true }),
          ...(validated.updates.password && { password: validated.updates.password })
        }
      )

      if (authError) {
        return NextResponse.json(
          { error: `Failed to update auth: ${authError.message}` },
          { status: 400 }
        )
      }
    }

    console.log(`[Admin API] User updated: ${validated.userId} by admin ${user.email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorToResponse(error)
  }
})
