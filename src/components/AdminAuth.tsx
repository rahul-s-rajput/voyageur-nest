import React, { useState, useEffect } from 'react'
import { useAuth, useDeviceTokenAuth } from '../contexts/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface AdminAuthProps {
  children?: React.ReactNode
  onSuccess?: () => void
  onAuthenticated?: () => void
}

const AdminAuth: React.FC<AdminAuthProps> = ({ 
  children, 
  onSuccess, 
  onAuthenticated 
}) => {
  const ENABLE_DEVICE_TOKEN_AUTH: boolean = ((): boolean => {
    try {
      const v = (import.meta as any)?.env?.VITE_ENABLE_DEVICE_TOKEN_AUTH
      return String(v).toLowerCase() === 'true'
    } catch {
      return false
    }
  })()
  const { 
    signIn, 
    isAuthenticated: authContextAuthenticated, 
    isAdmin, 
    loading: authLoading, 
    error: authError, 
    clearError 
  } = useAuth()
  const {
    deviceToken,
    setDeviceToken,
    isValidating,
    authenticateWithDeviceToken,
    checkStoredToken
  } = useDeviceTokenAuth()
  
  const [error, setError] = useState('')
  const [isCheckingExisting, setIsCheckingExisting] = useState(true)
  const [isDeviceAuthenticated, setIsDeviceAuthenticated] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  // Email/password authentication form state
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [authMethod, setAuthMethod] = useState<'device' | 'email'>('email')

  useEffect(() => {
    // Check if device is already authenticated
    checkExistingAuth()
  }, [])

  // Combined authentication status
  const isAuthenticated = authContextAuthenticated || isDeviceAuthenticated
  const hasAdminAccess = isAdmin || isDeviceAuthenticated

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading && !isCheckingExisting) {
      const params = new URLSearchParams(location.search)
      const redirectTo = params.get('redirectTo') || '/admin'

      // Prefer callbacks if provided, then navigate
      if (onSuccess) {
        onSuccess()
      } else if (onAuthenticated) {
        onAuthenticated()
      }
      // Always navigate to target when rendering on /admin/auth
      // or when no children are provided
      if (!children) {
        navigate(redirectTo, { replace: true })
      }
    }
  }, [isAuthenticated, authLoading, isCheckingExisting, onSuccess, onAuthenticated, location.search, navigate, children])

  // Clear errors when form data changes
  useEffect(() => {
    if (authError) {
      clearError()
    }
    setFormErrors({})
    setError('')
  }, [formData, authError, clearError])

  const checkExistingAuth = async () => {
    try {
      const hasValidToken = await checkStoredToken()
      if (hasValidToken) {
        setIsDeviceAuthenticated(true)
        setIsCheckingExisting(false)
        if (onAuthenticated) {
          onAuthenticated()
        }
        return
      }
    } catch (error) {
      console.error('Error checking existing auth:', error)
    } finally {
      setIsCheckingExisting(false)
    }
  }

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (authMethod === 'email') {
      if (!formData.email) {
        errors.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Please enter a valid email address'
      }
      
      if (!formData.password) {
        errors.password = 'Password is required'
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters'
      }
    } else {
      if (!deviceToken.trim()) {
        errors.deviceToken = 'Device token is required'
      }
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle email/password authentication
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      await signIn(formData.email, formData.password, rememberMe)
      // Success handling is done in useEffect above
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed')
      console.error('Email sign in error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle device token authentication
  const handleDeviceAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setError('')

    try {
      await authenticateWithDeviceToken(deviceToken)
      setIsDeviceAuthenticated(true)
      if (onAuthenticated) {
        onAuthenticated()
      }
    } catch (error) {
      console.error('Device authentication error:', error)
      setError(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
    }
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting && !isValidating) {
      if (authMethod === 'email') {
        handleEmailAuth(e as any)
      } else {
        handleDeviceAuth(e as any)
      }
    }
  }

  // Show loading state during initial auth check
  if (isCheckingExisting || (authLoading && !isSubmitting && !isValidating)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  if (hasAdminAccess) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access the admin dashboard
          </p>
        </div>

        {/* Authentication Method Toggle */}
        {ENABLE_DEVICE_TOKEN_AUTH ? (
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setAuthMethod('email')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                authMethod === 'email'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={isSubmitting || isValidating}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('device')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                authMethod === 'device'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={isSubmitting || isValidating}
            >
              Device Token
            </button>
          </div>
        ) : null}
        
        {(authMethod === 'email' || !ENABLE_DEVICE_TOKEN_AUTH) ? (
          <form className="mt-8 space-y-6" onSubmit={handleEmailAuth}>
            <input type="hidden" name="remember" value={rememberMe.toString()} />
            
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    formErrors.email ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                  aria-describedby={formErrors.email ? 'email-error' : undefined}
                />
                {formErrors.email && (
                  <p id="email-error" className="mt-1 text-sm text-red-600">
                    {formErrors.email}
                  </p>
                )}
              </div>
              
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border ${
                    formErrors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                  aria-describedby={formErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {formErrors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-600">
                    {formErrors.password}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            {(error || authError) && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Authentication Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error || authError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <svg className="h-5 w-5 text-blue-500 group-hover:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDeviceAuth} className="mt-8 space-y-6">
            <div>
              <label htmlFor="deviceToken" className="block text-sm font-medium text-gray-700 mb-1">
                Device Token
              </label>
              <input
                type="text"
                id="deviceToken"
                value={deviceToken}
                onChange={(e) => setDeviceToken(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your device token"
                className={`w-full px-3 py-2 border ${
                  formErrors.deviceToken ? 'border-red-300' : 'border-gray-300'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                required
                disabled={isValidating}
                aria-describedby={formErrors.deviceToken ? 'device-token-error' : undefined}
              />
              {formErrors.deviceToken && (
                <p id="device-token-error" className="mt-1 text-sm text-red-600">
                  {formErrors.deviceToken}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isValidating || !deviceToken.trim()}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isValidating ? 'Authenticating...' : 'Access Admin Panel'}
            </button>

            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Device Information</h3>
              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Platform:</strong> {navigator.platform}</p>
                <p><strong>Language:</strong> {navigator.language}</p>
                <p><strong>Screen:</strong> {screen.width}x{screen.height}</p>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                This device will be remembered for 90 days after successful authentication.
              </p>
            </div>
          </form>
        )}
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            This is a secure admin area. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminAuth