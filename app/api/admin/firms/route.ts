import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create admin client with service role key (bypasses RLS)
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// POST - Create a new firm
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, subscription_tier, max_users } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Firm name is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('firms')
      .insert({
        name,
        subscription_tier: subscription_tier || 'Professional',
        max_users: max_users || 10,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Firm creation error:', error)
      return NextResponse.json(
        { error: `Failed to create firm: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, firm: data })

  } catch (error) {
    console.error('Firm creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a firm
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const firmId = searchParams.get('id')

    if (!firmId) {
      return NextResponse.json(
        { error: 'Firm ID is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if firm has users
    const { data: users } = await supabase
      .from('users_metadata')
      .select('id')
      .eq('firm_id', firmId)

    if (users && users.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete firm with ${users.length} active users. Remove users first.` },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('firms')
      .delete()
      .eq('id', firmId)

    if (error) {
      return NextResponse.json(
        { error: `Failed to delete firm: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Firm deletion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PATCH - Update firm
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { firmId, updates } = body

    if (!firmId) {
      return NextResponse.json(
        { error: 'Firm ID is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('firms')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.subscription_tier && { subscription_tier: updates.subscription_tier }),
        ...(updates.max_users && { max_users: updates.max_users }),
        ...(updates.is_active !== undefined && { is_active: updates.is_active }),
        updated_at: new Date().toISOString()
      })
      .eq('id', firmId)

    if (error) {
      return NextResponse.json(
        { error: `Failed to update firm: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Firm update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


