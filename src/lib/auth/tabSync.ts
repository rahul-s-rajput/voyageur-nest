interface AuthEvent {
  type: 'SIGN_IN' | 'SIGN_OUT' | 'SESSION_REFRESH'
  timestamp: number
  userId?: string
}

export class TabSynchronizer {
  private static instance: TabSynchronizer
  private channel: BroadcastChannel | null = null
  private listeners: Set<(event: AuthEvent) => void> = new Set()

  static getInstance(): TabSynchronizer {
    if (!TabSynchronizer.instance) {
      TabSynchronizer.instance = new TabSynchronizer()
    }
    return TabSynchronizer.instance
  }

  initialize(): void {
    if (typeof window === 'undefined') return
    
    try {
      this.channel = new BroadcastChannel('auth-sync')
      
      this.channel.addEventListener('message', (event) => {
        const authEvent = event.data as AuthEvent
        this.listeners.forEach(listener => listener(authEvent))
      })
    } catch (error) {
      console.warn('BroadcastChannel not supported, falling back to localStorage')
      this.setupLocalStorageSync()
    }
  }

  private setupLocalStorageSync(): void {
    if (typeof window === 'undefined') return
    
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth-sync' && event.newValue) {
        try {
          const authEvent = JSON.parse(event.newValue) as AuthEvent
          this.listeners.forEach(listener => listener(authEvent))
        } catch (error) {
          console.error('Error parsing auth sync event:', error)
        }
      }
    })
  }

  broadcastEvent(event: AuthEvent): void {
    if (this.channel) {
      this.channel.postMessage(event)
    } else {
      // Fallback to localStorage
      localStorage.setItem('auth-sync', JSON.stringify(event))
      // Clear after a short delay to trigger storage event
      setTimeout(() => {
        localStorage.removeItem('auth-sync')
      }, 100)
    }
  }

  addListener(listener: (event: AuthEvent) => void): () => void {
    this.listeners.add(listener)
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  cleanup(): void {
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
    this.listeners.clear()
  }
}

export const tabSynchronizer = TabSynchronizer.getInstance()
