interface AuthMetrics {
  signInTime: number[]
  signOutTime: number[]
  sessionRefreshTime: number[]
  errorCount: number
  lastError?: string
}

class AuthPerformanceMonitor {
  private metrics: AuthMetrics = {
    signInTime: [],
    signOutTime: [],
    sessionRefreshTime: [],
    errorCount: 0
  }

  recordSignIn(duration: number): void {
    this.metrics.signInTime.push(duration)
    // Keep only last 100 measurements
    if (this.metrics.signInTime.length > 100) {
      this.metrics.signInTime.shift()
    }
  }

  recordSignOut(duration: number): void {
    this.metrics.signOutTime.push(duration)
    if (this.metrics.signOutTime.length > 100) {
      this.metrics.signOutTime.shift()
    }
  }

  recordSessionRefresh(duration: number): void {
    this.metrics.sessionRefreshTime.push(duration)
    if (this.metrics.sessionRefreshTime.length > 100) {
      this.metrics.sessionRefreshTime.shift()
    }
  }

  recordError(error: string): void {
    this.metrics.errorCount++
    this.metrics.lastError = error
  }

  getAverageSignInTime(): number {
    const times = this.metrics.signInTime
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  }

  getMetrics(): AuthMetrics & {
    averageSignInTime: number
    averageSignOutTime: number
    averageSessionRefreshTime: number
  } {
    return {
      ...this.metrics,
      averageSignInTime: this.getAverageSignInTime(),
      averageSignOutTime: this.metrics.signOutTime.reduce((a, b) => a + b, 0) / this.metrics.signOutTime.length || 0,
      averageSessionRefreshTime: this.metrics.sessionRefreshTime.reduce((a, b) => a + b, 0) / this.metrics.sessionRefreshTime.length || 0
    }
  }
}

export const authPerformanceMonitor = new AuthPerformanceMonitor()
