import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError, AuthTokenResponse } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { authPerformanceMonitor } from '../lib/monitoring/authPerformance'

// Performance monitoring
const startTimer = () => performance.now()
const endTimer = (start: number) => performance.now() - start

// Feature flags
const ENABLE_DEVICE_TOKEN_AUTH: boolean = ((): boolean => {
  try {
    // Vite exposes env via import.meta.env
    // Use a safe cast for TypeScript to avoid relying on vite/client types here
    const v = (import.meta as any)?.env?.VITE_ENABLE_DEVICE_TOKEN_AUTH
    return String(v).toLowerCase() === 'true'
  } catch {
    return false
  }
})()

// Types
interface AuthUser extends User {
  isAdmin: boolean
  userRole: string
  adminProfile?: {
    id: string
    full_name: string
    avatar_url?: string
    preferences?: Record<string, any>
  }
}

interface AuthState {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  initialized: boolean
  error: string | null
}

interface AuthResult {
  data: AuthTokenResponse['data']
  error: AuthError | null
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<AuthResult>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  clearError: () => void
  isAuthenticated: boolean
  isAdmin: boolean
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper function to check admin role
const checkAdminRole = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()
    
    return !error && !!data
  } catch (error) {
    console.warn('Could not verify admin role:', error)
    return false
  }
}

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
    error: null
  })

  // Helper to extract user info from Supabase user
  const extractUserInfo = async (user: User): Promise<AuthUser> => {
    const isAdmin = await checkAdminRole(user.id)
    const userRole = user.app_metadata?.user_role || user.user_metadata?.user_role || 'user'

    // Fetch admin profile if user is admin
    let adminProfile = undefined
    if (isAdmin) {
      try {
        const { data: profile } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        adminProfile = profile || undefined
      } catch (error) {
        console.warn('Could not fetch admin profile:', error)
      }
    }

    return {
      ...user,
      isAdmin,
      userRole,
      adminProfile
    }
  }

  // Sign in function
  const signIn = async (email: string, password: string, _rememberMe = false): Promise<AuthResult> => {
    const startTime = startTimer()
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        throw error
      }
      
      if (!data.session) {
        throw new Error('No session returned from sign in')
      }
      
      // Extract user info and update state
      const authUser = await extractUserInfo(data.session.user)
      setState(prev => ({
        ...prev,
        user: authUser,
        session: data.session,
        loading: false,
        initialized: true,
        error: null
      }))
      
      // Log successful authentication
      authPerformanceMonitor.recordSignIn(endTimer(startTime))
      console.log('User signed in successfully:', data.user?.email, `(${endTimer(startTime)}ms)`)
      
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      authPerformanceMonitor.recordError(errorMessage)
      console.error('Sign in error:', error, `(${endTimer(startTime)}ms)`)
      throw error
    }
  }

  // Sign out function
  const signOut = async (): Promise<void> => {
    const startTime = startTimer()
    try {
      setState(prev => ({ ...prev, loading: true }))
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        setState(prev => ({ ...prev, error: error.message, loading: false }))
        authPerformanceMonitor.recordError(error.message)
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          session: null,
          loading: false,
          error: null
        }))
        // Clear device token as well
        localStorage.removeItem('admin_device_token')
        authPerformanceMonitor.recordSignOut(endTimer(startTime))
        console.log('User signed out successfully', `(${endTimer(startTime)}ms)`)
      }
    } catch (err) {
      authPerformanceMonitor.recordError(err instanceof Error ? err.message : 'Sign out error')
      console.error('Sign out error:', err, `(${endTimer(startTime)}ms)`)
      setState(prev => ({ ...prev, error: 'Failed to sign out', loading: false }))
    }
  }

  // Refresh session function
  const refreshSession = async (): Promise<void> => {
    const startTime = startTimer()
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        throw error
      }
      
      if (data.session) {
        const authUser = await extractUserInfo(data.session.user)
        setState(prev => ({
          ...prev,
          user: authUser,
          session: data.session,
          loading: false,
          error: null
        }))
      }
      
      authPerformanceMonitor.recordSessionRefresh(endTimer(startTime))
      console.log('Session refreshed successfully', `(${endTimer(startTime)}ms)`)
    } catch (error) {
      authPerformanceMonitor.recordError(error instanceof Error ? error.message : 'Session refresh failed')
      console.error('Session refresh failed:', error, `(${endTimer(startTime)}ms)`)
      // Don't update error state for refresh failures
      // Just log and let the session expire naturally
    }
  }

  // Clear error function
  const clearError = (): void => {
    setState(prev => ({ ...prev, error: null }))
  }

  // Initialize authentication state - simplified version
  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      console.log('[AuthContext] Starting initialization...')
      
      try {
        // Get current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[AuthContext] Error getting session:', error)
          // Even with error, mark as initialized
          if (mounted) {
            setState({
              user: null,
              session: null,
              loading: false,
              initialized: true,
              error: null
            })
          }
          return
        }
        
        if (!mounted) return
        
        if (session?.user) {
          console.log('[AuthContext] Found existing session for:', session.user.email)
          
          // Extract user info
          try {
            const authUser = await extractUserInfo(session.user)
            if (mounted) {
              setState({
                user: authUser,
                session,
                loading: false,
                initialized: true,
                error: null
              })
              console.log('[AuthContext] Initialization complete with user')
            }
          } catch (err) {
            console.error('[AuthContext] Error extracting user info:', err)
            // Fallback to basic user info
            if (mounted) {
              setState({
                user: {
                  ...session.user,
                  isAdmin: false,
                  userRole: 'user'
                } as AuthUser,
                session,
                loading: false,
                initialized: true,
                error: null
              })
            }
          }
        } else {
          console.log('[AuthContext] No existing session')
          if (mounted) {
            setState({
              user: null,
              session: null,
              loading: false,
              initialized: true,
              error: null
            })
          }
        }
      } catch (error) {
        console.error('[AuthContext] Fatal initialization error:', error)
        if (mounted) {
          setState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
            error: null
          })
        }
      }
    }
    
    // Run initialization
    initializeAuth()
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', event, session?.user?.email)
      
      // Wait for initialization to complete before handling auth changes
      if (!state.initialized && event !== 'INITIAL_SESSION') {
        console.log('[AuthContext] Ignoring auth event during initialization:', event)
        return
      }
      
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          if (session?.user && mounted) {
            try {
              const authUser = await extractUserInfo(session.user)
              setState(prev => ({
                ...prev,
                user: authUser,
                session,
                loading: false,
                initialized: true,
                error: null
              }))
            } catch (err) {
              console.error('[AuthContext] Error handling auth change:', err)
            }
          }
          break
          
        case 'SIGNED_OUT':
          if (mounted) {
            setState(prev => ({
              ...prev,
              user: null,
              session: null,
              loading: false,
              initialized: true,
              error: null
            }))
            localStorage.removeItem('admin_device_token')
          }
          break
      }
    })
    
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // Run once on mount

  // Auto-refresh session
  useEffect(() => {
    if (!state.session) return
    
    const refreshInterval = setInterval(() => {
      refreshSession()
    }, 50 * 60 * 1000) // Refresh every 50 minutes
    
    return () => clearInterval(refreshInterval)
  }, [state.session])

  // Handle page visibility change for session validation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.session) {
        // Validate session when page becomes visible
        refreshSession()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [state.session])

  // Context value
  const contextValue: AuthContextType = {
    ...state,
    signIn,
    signOut,
    refreshSession,
    clearError,
    isAuthenticated: !!state.user && !!state.session,
    isAdmin: state.user?.isAdmin || false
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requireAdmin = false
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isAdmin, loading } = useAuth()
    
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      )
    }
    
    if (!isAuthenticated) {
      return <div>Please sign in to access this page.</div>
    }
    
    if (requireAdmin && !isAdmin) {
      return <div>Admin access required.</div>
    }
    
    return <Component {...props} />
  }
}

// Hook for admin-only functionality
export function useAdminAuth() {
  const auth = useAuth()
  
  if (!auth.isAdmin) {
    throw new Error('Admin access required')
  }
  
  return auth
}

// Hook for checking authentication status
export const useAuthStatus = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  
  return {
    isAuthenticated,
    isAdmin,
    loading,
    // Helper functions
    requireAuth: () => {
      if (!isAuthenticated) {
        throw new Error('Authentication required')
      }
    },
    requireAdmin: () => {
      if (!isAuthenticated || !isAdmin) {
        throw new Error('Admin privileges required')
      }
    }
  }
}

// Device token authentication integration
export function useDeviceTokenAuth() {
  const [deviceToken, setDeviceToken] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const { signOut } = useAuth()

  const validateDeviceToken = async (token: string): Promise<boolean> => {
    if (!ENABLE_DEVICE_TOKEN_AUTH) {
      return false
    }
    try {
      const { data, error } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('device_token', token)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        return false
      }

      // Update last_used_at
      await supabase
        .from('device_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('device_token', token)

      return true
    } catch (error) {
      console.error('Error validating device token:', error)
      return false
    }
  }

  const authenticateWithDeviceToken = async (token: string) => {
    setIsValidating(true)
    try {
      if (!ENABLE_DEVICE_TOKEN_AUTH) {
        throw new Error('Device token authentication is disabled')
      }
      const isValid = await validateDeviceToken(token)
      
      if (isValid) {
        localStorage.setItem('admin_device_token', token)
        return true
      } else {
        throw new Error('Invalid or expired device token')
      }
    } finally {
      setIsValidating(false)
    }
  }

  const checkStoredToken = async () => {
    const storedToken = localStorage.getItem('admin_device_token')
    if (storedToken) {
      if (!ENABLE_DEVICE_TOKEN_AUTH) {
        localStorage.removeItem('admin_device_token')
        await signOut()
        return false
      }
      const isValid = await validateDeviceToken(storedToken)
      if (!isValid) {
        localStorage.removeItem('admin_device_token')
        await signOut()
      }
      return isValid
    }
    return false
  }

  return {
    deviceToken,
    setDeviceToken,
    isValidating,
    authenticateWithDeviceToken,
    validateDeviceToken,
    checkStoredToken
  }
}
