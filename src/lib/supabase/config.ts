interface SupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey?: string
  environment: 'development' | 'staging' | 'production'
}

function getSupabaseConfig(): SupabaseConfig {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  const environment = (import.meta.env.MODE as any) || 'development'

  if (!url || !anonKey) {
    throw new Error(
      'Missing required Supabase environment variables. ' +
      'Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    )
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
    environment
  }
}

export const supabaseConfig = getSupabaseConfig()

// Validation function
export function validateSupabaseConfig(): void {
  const config = supabaseConfig
  
  // Validate URL format
  try {
    new URL(config.url)
  } catch {
    throw new Error('Invalid Supabase URL format')
  }
  
  // Validate key format (basic check)
  if (!config.anonKey.startsWith('eyJ')) {
    throw new Error('Invalid Supabase anon key format')
  }
  
  // Environment-specific validations
  if (config.environment === 'production') {
    if (config.url.includes('localhost') || config.url.includes('127.0.0.1')) {
      throw new Error('Production environment cannot use localhost URLs')
    }
  }
}

// Initialize validation
try {
  validateSupabaseConfig()
} catch (error) {
  console.error('Supabase configuration validation failed:', error)
  throw error
}

// Security headers configuration
export const getSecurityHeaders = () => ({
  'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
  'X-Environment': supabaseConfig.environment,
  'X-Client-Info': 'unified-client'
})

// Rate limiting configuration
export const rateLimitConfig = {
  development: {
    requestsPerSecond: 10,
    burstLimit: 50
  },
  staging: {
    requestsPerSecond: 8,
    burstLimit: 30
  },
  production: {
    requestsPerSecond: 5,
    burstLimit: 20
  }
}

export const getRateLimitConfig = () => rateLimitConfig[supabaseConfig.environment]
