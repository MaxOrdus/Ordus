/**
 * Supabase Client for Browser Components
 *
 * IMPORTANT: Use getSupabase() from singleton.ts for all client-side code.
 * This ensures a single client instance with proper auth configuration.
 */

import { getSupabase } from './singleton'

/**
 * @deprecated Use getSupabase() from '@/lib/supabase/singleton' instead.
 * This function is kept for backwards compatibility but just re-exports the singleton.
 */
export function createClient() {
  return getSupabase()
}

// Re-export getSupabase as the preferred method
export { getSupabase }
