import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null
let initError: Error | null = null

/**
 * Get a SINGLETON Supabase client - prevents multiple WebSocket connections
 */
export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  if (initError) {
    throw initError
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    initError = new Error('Missing Supabase environment variables')
    throw initError
  }

  try {
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
    return supabaseInstance
  } catch (err) {
    initError = err instanceof Error ? err : new Error('Failed to initialize Supabase')
    throw initError
  }
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project'))
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetSupabase(): void {
  supabaseInstance = null
  initError = null
}

// For server-side, we still need to create per-request clients
// but for client-side, ALWAYS use getSupabase()


