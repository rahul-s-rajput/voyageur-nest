import { supabase } from '../supabase'

interface SessionInfo {
  isValid: boolean
  expiresAt: number | null
  timeUntilExpiry: number | null
  needsRefresh: boolean
}

export class SessionManager {
  private static instance: SessionManager
  private refreshTimer: NodeJS.Timeout | null = null
  private listeners: Set<(sessionInfo: SessionInfo) => void> = new Set()

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  async getSessionInfo(): Promise<SessionInfo> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        return {
          isValid: false,
          expiresAt: null,
          timeUntilExpiry: null,
          needsRefresh: false
        }
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : null
      const now = Date.now()
      const timeUntilExpiry = expiresAt ? expiresAt - now : null
      const needsRefresh = timeUntilExpiry ? timeUntilExpiry < 5 * 60 * 1000 : false // 5 minutes

      return {
        isValid: true,
        expiresAt,
        timeUntilExpiry,
        needsRefresh
      }
    } catch (error) {
      console.error('Error getting session info:', error)
      return {
        isValid: false,
        expiresAt: null,
        timeUntilExpiry: null,
        needsRefresh: false
      }
    }
  }

  async startSessionMonitoring(): Promise<void> {
    this.stopSessionMonitoring()
    
    const checkSession = async () => {
      const sessionInfo = await this.getSessionInfo()
      
      // Notify listeners
      this.listeners.forEach(listener => listener(sessionInfo))
      
      if (sessionInfo.needsRefresh) {
        try {
          await supabase.auth.refreshSession()
        } catch (error) {
          console.error('Failed to refresh session:', error)
        }
      }
    }
    
    // Check immediately
    await checkSession()
    
    // Set up periodic checks
    this.refreshTimer = setInterval(checkSession, 60 * 1000) // Check every minute
  }

  stopSessionMonitoring(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  addSessionListener(listener: (sessionInfo: SessionInfo) => void): () => void {
    this.listeners.add(listener)
    
    // Return cleanup function
    return () => {
      this.listeners.delete(listener)
    }
  }

  async validateSession(): Promise<boolean> {
    const sessionInfo = await this.getSessionInfo()
    return sessionInfo.isValid
  }

  async forceRefresh(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      return !error && !!data.session
    } catch (error) {
      console.error('Force refresh failed:', error)
      return false
    }
  }
}

export const sessionManager = SessionManager.getInstance()
