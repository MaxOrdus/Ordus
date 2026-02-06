'use client'

import * as React from 'react'
import { User, AuthSession } from '@/types/auth'
import { getSupabase } from '@/lib/supabase/singleton'

interface AuthContextType {
  user: User | null
  session: AuthSession | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string, role: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [session, setSession] = React.useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  
  // Use ref for cache to avoid stale closure issues
  const metadataCacheRef = React.useRef<Record<string, any>>({})

  // Use singleton Supabase client
  const supabase = React.useMemo(() => getSupabase(), [])

  // Transform Supabase session to our format
  const transformSession = React.useCallback(async (supabaseSession: any): Promise<AuthSession | null> => {
    if (!supabaseSession?.user) {
      console.log('[Auth] transformSession: No user in session')
      return null
    }

    const userId = supabaseSession.user.id
    const userEmail = supabaseSession.user.email!
    console.log('[Auth] transformSession: Processing user', userId, userEmail)

    // Check cache first
    let userMetadata = metadataCacheRef.current[userId]

    if (!userMetadata) {
      try {
        console.log('[Auth] Fetching metadata for user:', userId)

        // Add timeout to metadata query - increased to 15s
        const metadataPromise = supabase
          .from('users_metadata')
          .select('*')
          .eq('id', userId)
          .single()

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Metadata query timeout after 15s')), 15000)
        })

        const { data, error } = await Promise.race([metadataPromise, timeoutPromise]) as any

        if (error) {
          console.error('[Auth] Metadata query error:', error.message, error.code, error.details)
          // DON'T return null - use fallback user data to keep session alive
          userMetadata = null
        } else if (!data) {
          console.error('[Auth] No metadata found for user:', userId)
          userMetadata = null
        } else {
          console.log('[Auth] Metadata fetched successfully:', data.name, data.role)
          // Cache it
          metadataCacheRef.current[userId] = data
          userMetadata = data
        }
      } catch (err: any) {
        console.error('[Auth] Exception fetching metadata:', err?.message || err)
        // DON'T return null - use fallback user data to keep session alive
        userMetadata = null
      }
    } else {
      console.log('[Auth] Using cached metadata for:', userMetadata.name)
    }

    // Create user object - use fallback values if metadata failed
    const transformedUser: User = {
      id: userId,
      email: userEmail,
      name: userMetadata?.name || userEmail.split('@')[0],
      role: userMetadata?.role || 'Lawyer',
      firmId: userMetadata?.firm_id || undefined,
      createdAt: userMetadata?.created_at || new Date().toISOString(),
      lastLoginAt: userMetadata?.last_login_at,
      isActive: userMetadata?.is_active ?? true,
      preferences: userMetadata?.preferences || {
        theme: 'system',
        notifications: { email: true, push: true, criticalDeadlines: true, treatmentGaps: true, taskAssignments: true, settlementOffers: true },
        dashboard: { showBillableStreak: true, showCaseVelocity: true, showRedZone: true, showStalledCases: true },
      },
    }

    return {
      user: transformedUser,
      token: supabaseSession.access_token,
      expiresAt: new Date(supabaseSession.expires_at! * 1000).toISOString(),
    }
  }, [supabase])

  // Handle session update - centralized logic
  const handleSessionUpdate = React.useCallback(async (supabaseSession: any | null, clearCache: boolean = false) => {
    if (clearCache) {
      metadataCacheRef.current = {}
    }

    if (!supabaseSession) {
      setSession(null)
      setUser(null)
      setIsLoading(false)
      return
    }

    const authSession = await transformSession(supabaseSession)
    if (authSession) {
      setSession(authSession)
      setUser(authSession.user)
    }
    // Note: transformSession now always returns a session if supabaseSession has a user
    // It uses fallback values if metadata fetch fails, so user stays logged in
    setIsLoading(false)
  }, [transformSession])

  // Single auth state listener - NO separate initAuth to avoid race conditions
  React.useEffect(() => {
    let mounted = true
    let initialSessionReceived = false
    
    // Use a ref to track loading state for the timeout
    const loadingRef = { current: true }

    // Safety timeout - ensure we don't get stuck loading forever
    const timeoutId = setTimeout(() => {
      if (mounted && loadingRef.current) {
        console.warn('[Auth] Timeout reached - stopping loading state')
        setIsLoading(false)
        loadingRef.current = false
      }
    }, 10000)

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      if (!mounted) return
      
      console.log('[Auth] State change:', event, supabaseSession ? 'has session' : 'no session')

      switch (event) {
        case 'INITIAL_SESSION':
          // Page load with existing session OR no session - THIS is the authoritative event
          initialSessionReceived = true
          await handleSessionUpdate(supabaseSession)
          loadingRef.current = false
          break
          
        case 'SIGNED_IN':
          // IMPORTANT: Ignore SIGNED_IN if it fires before INITIAL_SESSION
          // This happens due to a Supabase SDK race condition where SIGNED_IN fires
          // from cached session before the HTTP client is ready
          if (!initialSessionReceived) {
            console.log('[Auth] Ignoring early SIGNED_IN, waiting for INITIAL_SESSION')
            return
          }
          // User explicitly signed in via login form
          await handleSessionUpdate(supabaseSession, true) // Clear cache for fresh data
          loadingRef.current = false
          break
          
        case 'SIGNED_OUT':
          // User signed out
          initialSessionReceived = true // Reset for next session
          await handleSessionUpdate(null, true) // Clear cache
          loadingRef.current = false
          break
          
        case 'TOKEN_REFRESHED':
          // Token was refreshed - update session but keep user data
          if (supabaseSession) {
            setSession(prev => prev ? {
              ...prev,
              token: supabaseSession.access_token,
              expiresAt: new Date(supabaseSession.expires_at! * 1000).toISOString(),
            } : null)
          }
          break
          
        case 'USER_UPDATED':
          // User data changed - refresh everything
          if (supabaseSession) {
            // Clear cache to get fresh metadata
            delete metadataCacheRef.current[supabaseSession.user.id]
            await handleSessionUpdate(supabaseSession)
          }
          break
          
        default:
          console.log('[Auth] Unhandled event:', event)
      }
    })

    // Cleanup
    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [supabase, handleSessionUpdate])

  const handleLogin = React.useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    console.log('[Auth] Login attempt for:', email)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        console.error('[Auth] Login error:', error.message)
        throw new Error(error.message)
      }
      
      if (!data.session) {
        throw new Error('Login failed - no session returned')
      }

      console.log('[Auth] Login successful, session received')
      
      // Clear cache for this user to ensure fresh data
      if (data.user) {
        delete metadataCacheRef.current[data.user.id]
      }

      // The onAuthStateChange listener will handle updating the state
      // But we also do it here for immediate feedback
      const authSession = await transformSession(data.session)
      if (!authSession) {
        throw new Error('Failed to load user profile. Please contact support.')
      }

      setSession(authSession)
      setUser(authSession.user)

      // Update last login in background
      supabase.from('users_metadata')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id)
        .then(({ error }) => {
          if (error) console.warn('[Auth] Failed to update last_login_at:', error)
        })
        
    } catch (err) {
      setIsLoading(false)
      throw err
    }
    // Note: setIsLoading(false) will be called by onAuthStateChange SIGNED_IN handler
  }, [supabase, transformSession])

  const handleSignup = React.useCallback(async (email: string, password: string, name: string, role: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      
      if (error) throw new Error(error.message)
      if (!data.user) throw new Error('Signup failed')

      // Create user metadata
      const { error: metadataError } = await supabase.from('users_metadata').insert({
        id: data.user.id,
        name,
        role,
        is_active: true,
        preferences: {
          theme: 'system',
          notifications: { email: true, push: true, criticalDeadlines: true, treatmentGaps: true, taskAssignments: true, settlementOffers: true },
          dashboard: { showBillableStreak: true, showCaseVelocity: true, showRedZone: true, showStalledCases: true },
        },
      })

      if (metadataError) {
        console.error('[Auth] Failed to create user metadata:', metadataError)
        throw new Error('Failed to create user profile')
      }

      if (data.session) {
        const authSession = await transformSession(data.session)
        if (authSession) {
          setSession(authSession)
          setUser(authSession.user)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [supabase, transformSession])

  const handleLogout = React.useCallback(async () => {
    setIsLoading(true)
    try {
      metadataCacheRef.current = {}
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[Auth] Logout error:', error)
      }
      // State will be cleared by onAuthStateChange SIGNED_OUT handler
    } catch (err) {
      console.error('[Auth] Logout exception:', err)
      // Force clear state even if signOut fails
      setSession(null)
      setUser(null)
      setIsLoading(false)
    }
  }, [supabase])

  const value = React.useMemo(() => ({
    user,
    session,
    isLoading,
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout,
  }), [user, session, isLoading, handleLogin, handleSignup, handleLogout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
