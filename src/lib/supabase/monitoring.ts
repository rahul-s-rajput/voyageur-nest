interface ClientMetrics {
  requestCount: number
  averageResponseTime: number
  errorRate: number
  lastError?: string
  lastSuccessfulRequest?: string
}

interface PerformanceEvent {
  clientType: string
  operation: string
  responseTime: number
  success: boolean
  error?: string
  timestamp: string
}

class ClientPerformanceMonitor {
  private metrics: Map<string, ClientMetrics> = new Map()
  private events: PerformanceEvent[] = []
  private maxEvents = 1000 // Keep last 1000 events

  recordRequest(clientType: string, operation: string, responseTime: number, success: boolean, error?: string) {
    const key = `${clientType}:${operation}`
    const current = this.metrics.get(key) || {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0
    }

    current.requestCount++
    current.averageResponseTime = 
      (current.averageResponseTime * (current.requestCount - 1) + responseTime) / current.requestCount

    if (!success) {
      const errorCount = Math.floor(current.errorRate * (current.requestCount - 1)) + 1
      current.errorRate = errorCount / current.requestCount
      current.lastError = error
    } else {
      const errorCount = Math.floor(current.errorRate * (current.requestCount - 1))
      current.errorRate = errorCount / current.requestCount
      current.lastSuccessfulRequest = new Date().toISOString()
    }

    this.metrics.set(key, current)

    // Store event
    const event: PerformanceEvent = {
      clientType,
      operation,
      responseTime,
      success,
      error,
      timestamp: new Date().toISOString()
    }

    this.events.push(event)
    if (this.events.length > this.maxEvents) {
      this.events.shift() // Remove oldest event
    }
  }

  getMetrics(clientType?: string): Record<string, ClientMetrics> {
    if (clientType) {
      const filtered: Record<string, ClientMetrics> = {}
      for (const [key, metrics] of this.metrics) {
        if (key.startsWith(`${clientType}:`)) {
          filtered[key] = metrics
        }
      }
      return filtered
    }
    return Object.fromEntries(this.metrics)
  }

  getEvents(clientType?: string, limit: number = 100): PerformanceEvent[] {
    let events = this.events
    if (clientType) {
      events = events.filter(e => e.clientType === clientType)
    }
    return events.slice(-limit).reverse() // Most recent first
  }

  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy'
    details: {
      totalRequests: number
      averageErrorRate: number
      averageResponseTime: number
    }
  } {
    const allMetrics = Array.from(this.metrics.values())
    
    if (allMetrics.length === 0) {
      return {
        overall: 'healthy',
        details: { totalRequests: 0, averageErrorRate: 0, averageResponseTime: 0 }
      }
    }

    const totalRequests = allMetrics.reduce((sum, m) => sum + m.requestCount, 0)
    const averageErrorRate = allMetrics.reduce((sum, m) => sum + m.errorRate, 0) / allMetrics.length
    const averageResponseTime = allMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / allMetrics.length

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (averageErrorRate > 0.1 || averageResponseTime > 2000) {
      overall = 'unhealthy'
    } else if (averageErrorRate > 0.05 || averageResponseTime > 1000) {
      overall = 'degraded'
    }

    return {
      overall,
      details: {
        totalRequests,
        averageErrorRate: Math.round(averageErrorRate * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime)
      }
    }
  }

  clearMetrics() {
    this.metrics.clear()
    this.events = []
  }
}

export const performanceMonitor = new ClientPerformanceMonitor()

// Wrapper to add performance monitoring to any async function
export function withPerformanceMonitoring<T extends any[], R>(
  clientType: string,
  operation: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    
    try {
      const result = await fn(...args)
      const responseTime = Date.now() - startTime
      
      performanceMonitor.recordRequest(clientType, operation, responseTime, true)
      return result
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      performanceMonitor.recordRequest(clientType, operation, responseTime, false, errorMessage)
      throw error
    }
  }
}

// Enhanced error handling with categorization
export interface ErrorContext {
  operation: string
  clientType: string
  args?: any[]
  userId?: string
  sessionId?: string
}

export class SupabaseError extends Error {
  public readonly code?: string
  public readonly category: 'network' | 'auth' | 'permission' | 'validation' | 'server' | 'client'
  public readonly retryable: boolean
  public readonly context?: ErrorContext

  constructor(
    message: string, 
    code?: string, 
    category: SupabaseError['category'] = 'client',
    retryable: boolean = false,
    context?: ErrorContext
  ) {
    super(message)
    this.name = 'SupabaseError'
    this.code = code
    this.category = category
    this.retryable = retryable
    this.context = context
  }

  static fromSupabaseError(error: any, context?: ErrorContext): SupabaseError {
    const message = error.message || 'Unknown Supabase error'
    const code = error.code || error.status?.toString()
    
    let category: SupabaseError['category'] = 'client'
    let retryable = false

    // Categorize based on error code/message
    if (code === 'PGRST116' || code === '404') {
      category = 'client'
      retryable = false
    } else if (code?.startsWith('23') || message.includes('duplicate') || message.includes('constraint')) {
      category = 'validation'
      retryable = false
    } else if (code === '401' || message.includes('JWT') || message.includes('auth')) {
      category = 'auth'
      retryable = false
    } else if (code === '403' || message.includes('permission') || message.includes('RLS')) {
      category = 'permission'
      retryable = false
    } else if (code?.startsWith('5') || message.includes('network') || message.includes('timeout')) {
      category = 'network'
      retryable = true
    } else if (code?.startsWith('4')) {
      category = 'client'
      retryable = false
    }

    return new SupabaseError(message, code, category, retryable, context)
  }
}

// Enhanced error handling wrapper
export const withEnhancedErrorHandling = <T extends any[], R>(
  operation: string,
  clientType: string = 'unified',
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    const context: ErrorContext = {
      operation,
      clientType,
      args: args.length <= 2 ? args : undefined // Don't log large arg arrays
    }

    try {
      return await fn(...args)
    } catch (error) {
      const supabaseError = SupabaseError.fromSupabaseError(error, context)
      
      // Log error for monitoring
      console.error('Enhanced Supabase Error:', {
        operation,
        clientType,
        category: supabaseError.category,
        code: supabaseError.code,
        retryable: supabaseError.retryable,
        message: supabaseError.message
      })
      
      // Record performance metrics
      performanceMonitor.recordRequest(
        clientType, 
        operation, 
        0, // Error occurred before timing could complete
        false, 
        supabaseError.message
      )
      
      throw supabaseError
    }
  }
}

// Connection health checker
export const healthChecker = {
  async checkConnection(): Promise<{
    isHealthy: boolean
    latency: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      // Simple query to check connection
      const { supabase } = await import('./index')
      await supabase.from('properties').select('id').limit(1)
      
      const latency = Date.now() - startTime
      return { isHealthy: true, latency }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        isHealthy: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  async runHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: {
      connection: { status: string; latency: number; error?: string }
      performance: ReturnType<ClientPerformanceMonitor['getHealthStatus']>
    }
  }> {
    const connectionCheck = await this.checkConnection()
    const performanceCheck = performanceMonitor.getHealthStatus()

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    if (!connectionCheck.isHealthy || performanceCheck.overall === 'unhealthy') {
      overall = 'unhealthy'
    } else if (connectionCheck.latency > 1000 || performanceCheck.overall === 'degraded') {
      overall = 'degraded'
    }

    return {
      status: overall,
      checks: {
        connection: {
          status: connectionCheck.isHealthy ? 'healthy' : 'unhealthy',
          latency: connectionCheck.latency,
          error: connectionCheck.error
        },
        performance: performanceCheck
      }
    }
  }
}
