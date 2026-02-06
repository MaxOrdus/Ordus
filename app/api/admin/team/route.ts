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

// GET - Fetch team members with emails for a firm
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const firmId = searchParams.get('firmId')

    if (!firmId) {
      return NextResponse.json(
        { error: 'Firm ID is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get users_metadata for the firm
    const { data: metadata, error: metadataError } = await supabase
      .from('users_metadata')
      .select('id, name, role, is_active, last_login_at, firm_id')
      .eq('firm_id', firmId)
      .order('name')

    if (metadataError) {
      return NextResponse.json(
        { error: `Failed to fetch team: ${metadataError.message}` },
        { status: 400 }
      )
    }

    // Get auth users to get emails
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      return NextResponse.json(
        { error: `Failed to fetch auth users: ${authError.message}` },
        { status: 400 }
      )
    }

    // Create a map of user id to email
    const emailMap = new Map(
      authData.users.map(u => [u.id, u.email])
    )

    // Combine metadata with emails
    const teamMembers = (metadata || []).map(m => ({
      id: m.id,
      name: m.name,
      email: emailMap.get(m.id) || null,
      role: m.role,
      isActive: m.is_active,
      lastLoginAt: m.last_login_at,
      firmId: m.firm_id,
    }))

    return NextResponse.json({ data: teamMembers })

  } catch (error) {
    console.error('Team fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
