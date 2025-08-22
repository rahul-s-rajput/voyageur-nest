import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  fallback?: React.ReactNode
  redirectTo?: string
  onUnauthorized?: () => void
}

export default function ProtectedRoute({
  children,
  requireAdmin = true,
  fallback,
  redirectTo = '/admin/auth',
  onUnauthorized
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, loading, initialized } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    // Wait for initialization to complete
    if (!initialized || loading) return

    const checkAccess = () => {
      // Not authenticated
      if (!isAuthenticated) {
        if (onUnauthorized) {
          onUnauthorized()
        } else {
          const redirectUrl = new URL(redirectTo, window.location.origin)
          redirectUrl.searchParams.set('redirectTo', location.pathname + location.search)
          navigate(redirectUrl.pathname + redirectUrl.search, { replace: true })
        }
        return false
      }

      // Requires admin but user is not admin
      if (requireAdmin && !isAdmin) {
        if (onUnauthorized) {
          onUnauthorized()
        } else {
          navigate('/unauthorized', { replace: true })
        }
        return false
      }

      return true
    }

    const hasAccess = checkAccess()
    setShouldRender(hasAccess)
  }, [isAuthenticated, isAdmin, initialized, loading, requireAdmin, navigate, redirectTo, onUnauthorized, location])

  // Debug logging for loading states
  console.log('[ProtectedRoute] State:', { 
    loading, 
    initialized,
    isAuthenticated, 
    isAdmin, 
    shouldRender,
    location: location.pathname 
  })

  // Show loading state
  if (loading || !initialized) {
    console.log('[ProtectedRoute] Showing loading spinner - loading:', loading, 'initialized:', initialized)
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render children if access check failed
  if (!shouldRender) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Higher-order component version
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Hook for programmatic access control
export function useRouteProtection(requireAdmin = true) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const checkAccess = () => {
    if (loading) return { hasAccess: false, loading: true }
    
    if (!isAuthenticated) {
      return { hasAccess: false, loading: false, reason: 'not_authenticated' }
    }
    
    if (requireAdmin && !isAdmin) {
      return { hasAccess: false, loading: false, reason: 'insufficient_permissions' }
    }
    
    return { hasAccess: true, loading: false }
  }

  const redirectToAuth = (redirectTo?: string) => {
    const authUrl = new URL('/admin/auth', window.location.origin)
    authUrl.searchParams.set('redirectTo', redirectTo || location.pathname + location.search)
    navigate(authUrl.pathname + authUrl.search, { replace: true })
  }

  return {
    ...checkAccess(),
    redirectToAuth
  }
}
