/**
 * Client-side rate limiting utility using localStorage
 * Provides protection against form submission abuse with user feedback
 */

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  progressiveDelay?: boolean;
  blockDuration?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  resetTime?: number;
  retryAfter?: number;
  message?: string;
}

export interface AttemptRecord {
  timestamp: number;
  count: number;
}

export class RateLimiter {
  private action: string;
  private identifier: string;

  constructor(action: string, identifier: string = 'default') {
    this.action = action;
    this.identifier = identifier;
  }

  /**
   * Instance method to check rate limit
   */
  checkLimit(): RateLimitResult {
    return RateLimiter.checkRateLimit(this.action, this.identifier);
  }

  /**
   * Instance method to record attempt
   */
  recordAttempt(success: boolean = true): void {
    RateLimiter.recordAttempt(this.action, this.identifier, success);
  }

  private static readonly DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
    'checkin-submission': {
      maxAttempts: 3,
      windowMs: 5 * 60 * 1000, // 5 minutes
      progressiveDelay: true,
      blockDuration: 15 * 60 * 1000, // 15 minutes
    },
    'file-upload': {
      maxAttempts: 10,
      windowMs: 60 * 1000, // 1 minute
      progressiveDelay: false,
    },
    'form-validation': {
      maxAttempts: 50,
      windowMs: 60 * 1000, // 1 minute
      progressiveDelay: false,
    },
  };

  /**
   * Check if an action is rate limited
   */
  static checkRateLimit(
    action: string,
    identifier: string = 'default',
    config?: Partial<RateLimitConfig>
  ): RateLimitResult {
    const finalConfig = {
      ...this.DEFAULT_CONFIGS[action],
      ...config,
    };

    if (!finalConfig.maxAttempts || !finalConfig.windowMs) {
      throw new Error(`Invalid rate limit configuration for action: ${action}`);
    }

    const key = this.getStorageKey(action, identifier);
    const now = Date.now();

    try {
      // Get existing attempts
      const attempts = this.getAttempts(key);
      
      // Clean old attempts outside the window
      const validAttempts = attempts.filter(
        attempt => now - attempt.timestamp < finalConfig.windowMs
      );

      // Check if blocked due to previous violations
      if (finalConfig.blockDuration) {
        const blockKey = `${key}_blocked`;
        const blockTime = localStorage.getItem(blockKey);
        if (blockTime && now - parseInt(blockTime) < finalConfig.blockDuration) {
          const retryAfter = finalConfig.blockDuration - (now - parseInt(blockTime));
          return {
            allowed: false,
            retryAfter: Math.ceil(retryAfter / 1000),
            message: `Too many attempts. Please try again in ${this.formatDuration(retryAfter)}.`
          };
        }
      }

      // Check current rate limit
      if (validAttempts.length >= finalConfig.maxAttempts) {
        // Apply block if configured
        if (finalConfig.blockDuration) {
          localStorage.setItem(`${key}_blocked`, now.toString());
        }

        const oldestAttempt = Math.min(...validAttempts.map(a => a.timestamp));
        const resetTime = oldestAttempt + finalConfig.windowMs;
        const retryAfter = Math.ceil((resetTime - now) / 1000);

        return {
          allowed: false,
          resetTime,
          retryAfter,
          message: `Rate limit exceeded. Please try again in ${this.formatDuration(resetTime - now)}.`
        };
      }

      // Calculate progressive delay if enabled
      if (finalConfig.progressiveDelay && validAttempts.length > 0) {
        const delay = this.calculateProgressiveDelay(validAttempts.length);
        const lastAttempt = Math.max(...validAttempts.map(a => a.timestamp));
        
        if (now - lastAttempt < delay) {
          const retryAfter = Math.ceil((delay - (now - lastAttempt)) / 1000);
          return {
            allowed: false,
            retryAfter,
            message: `Please wait ${retryAfter} seconds before trying again.`
          };
        }
      }

      return {
        allowed: true,
        remainingAttempts: finalConfig.maxAttempts - validAttempts.length,
        resetTime: now + finalConfig.windowMs
      };

    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow the request if there's an error
      return { allowed: true };
    }
  }

  /**
   * Record an attempt
   */
  static recordAttempt(
    action: string,
    identifier: string = 'default',
    success: boolean = false
  ): void {
    const key = this.getStorageKey(action, identifier);
    const now = Date.now();

    try {
      const attempts = this.getAttempts(key);
      
      // Add new attempt
      attempts.push({
        timestamp: now,
        count: 1
      });

      // Clean old attempts (keep only last 100 to prevent storage bloat)
      const recentAttempts = attempts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);

      this.saveAttempts(key, recentAttempts);

      // Clear block if attempt was successful
      if (success) {
        localStorage.removeItem(`${key}_blocked`);
      }

    } catch (error) {
      console.error('Error recording attempt:', error);
    }
  }

  /**
   * Clear rate limit data for an action
   */
  static clearRateLimit(action: string, identifier: string = 'default'): void {
    const key = this.getStorageKey(action, identifier);
    try {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_blocked`);
    } catch (error) {
      console.error('Error clearing rate limit:', error);
    }
  }

  /**
   * Get rate limit status without checking
   */
  static getRateLimitStatus(
    action: string,
    identifier: string = 'default'
  ): {
    attempts: number;
    blocked: boolean;
    blockExpiry?: number;
  } {
    const key = this.getStorageKey(action, identifier);
    const config = this.DEFAULT_CONFIGS[action];
    const now = Date.now();

    try {
      const attempts = this.getAttempts(key);
      const validAttempts = attempts.filter(
        attempt => now - attempt.timestamp < (config?.windowMs || 60000)
      );

      const blockKey = `${key}_blocked`;
      const blockTime = localStorage.getItem(blockKey);
      const blocked = blockTime && 
        config?.blockDuration && 
        now - parseInt(blockTime) < config.blockDuration;

      return {
        attempts: validAttempts.length,
        blocked: !!blocked,
        blockExpiry: blocked ? parseInt(blockTime!) + config!.blockDuration! : undefined
      };

    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return { attempts: 0, blocked: false };
    }
  }

  /**
   * Clean up old rate limit data
   */
  static cleanup(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('rate_limit_')) {
          keysToRemove.push(key);
        }
      }

      // Remove old entries (older than 24 hours)
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      
      keysToRemove.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const attempts: AttemptRecord[] = JSON.parse(data);
            const recentAttempts = attempts.filter(
              attempt => attempt.timestamp > cutoff
            );
            
            if (recentAttempts.length === 0) {
              localStorage.removeItem(key);
            } else if (recentAttempts.length < attempts.length) {
              localStorage.setItem(key, JSON.stringify(recentAttempts));
            }
          }
        } catch (error) {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      });

    } catch (error) {
      console.error('Error during rate limit cleanup:', error);
    }
  }

  /**
   * Get storage key for action and identifier
   */
  private static getStorageKey(action: string, identifier: string): string {
    return `rate_limit_${action}_${identifier}`;
  }

  /**
   * Get attempts from localStorage
   */
  private static getAttempts(key: string): AttemptRecord[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error parsing rate limit data:', error);
      return [];
    }
  }

  /**
   * Save attempts to localStorage
   */
  private static saveAttempts(key: string, attempts: AttemptRecord[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(attempts));
    } catch (error) {
      console.error('Error saving rate limit data:', error);
      // If storage is full, try to clean up and retry
      this.cleanup();
      try {
        localStorage.setItem(key, JSON.stringify(attempts.slice(-10))); // Keep only last 10
      } catch (retryError) {
        console.error('Failed to save rate limit data after cleanup:', retryError);
      }
    }
  }

  /**
   * Calculate progressive delay based on attempt count
   */
  private static calculateProgressiveDelay(attemptCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attemptCount - 1), 30000);
  }

  /**
   * Format duration for user-friendly display
   */
  private static formatDuration(ms: number): string {
    const seconds = Math.ceil(ms / 1000);
    
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  /**
   * Initialize rate limiter (call on app startup)
   */
  static initialize(): void {
    // Clean up old data on initialization
    this.cleanup();
    
    // Set up periodic cleanup (every hour)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.cleanup();
      }, 60 * 60 * 1000); // 1 hour
    }
  }
}

export default RateLimiter;