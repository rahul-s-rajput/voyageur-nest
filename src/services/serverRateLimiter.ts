/**
 * Server-side rate limiting service using Supabase database
 * Provides secure rate limiting that cannot be bypassed by clients
 */

import { supabase } from '../lib/supabase';
import { SecureLogger } from '../utils/secureLogger';
import { ErrorHandler, AppError, ErrorType, ErrorSeverity } from '../utils/errorHandler';

export interface ServerRateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDuration?: number;
  action: string;
}

export interface ServerRateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  resetTime?: number;
  retryAfter?: number;
  message?: string;
}

export interface RateLimitLogEntry {
  id?: string;
  action: string;
  identifier: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  success: boolean;
  blocked: boolean;
  created_at?: string;
}

export class ServerRateLimiter {
  private static readonly DEFAULT_CONFIGS: Record<string, ServerRateLimitConfig> = {
    'checkin-submission': {
      maxAttempts: 3,
      windowMs: 5 * 60 * 1000, // 5 minutes
      blockDuration: 15 * 60 * 1000, // 15 minutes
      action: 'checkin-submission'
    },
    'file-upload': {
      maxAttempts: 10,
      windowMs: 60 * 1000, // 1 minute
      blockDuration: 5 * 60 * 1000, // 5 minutes
      action: 'file-upload'
    },
    'form-validation': {
      maxAttempts: 20,
      windowMs: 60 * 1000, // 1 minute
      action: 'form-validation'
    }
  };

  /**
   * Check if an action is rate limited
   */
  static async checkRateLimit(
    action: string,
    identifier: string,
    ipAddress?: string,
    userAgent?: string,
    config?: Partial<ServerRateLimitConfig>
  ): Promise<ServerRateLimitResult> {
    try {
      const finalConfig = {
        ...this.DEFAULT_CONFIGS[action],
        ...config,
      };

      if (!finalConfig.maxAttempts || !finalConfig.windowMs) {
        throw new Error(`Invalid rate limit configuration for action: ${action}`);
      }

      const windowStart = new Date(Date.now() - finalConfig.windowMs).toISOString();

      // Get recent attempts from database
      const { data: attempts, error } = await supabase
        .from('rate_limit_log')
        .select('*')
        .eq('action', action)
        .eq('identifier', identifier)
        .gte('timestamp', windowStart)
        .order('timestamp', { ascending: false });

      if (error) {
        SecureLogger.error('Rate limit check failed', {
          action,
          identifier: SecureLogger.sanitize(identifier),
          error: error.message
        });
        
        // Fail open for database errors (but log them)
        return {
          allowed: true,
          message: 'Rate limit check unavailable'
        };
      }

      const validAttempts = attempts || [];
      const failedAttempts = validAttempts.filter(attempt => !attempt.success);

      // Check if currently blocked
      if (finalConfig.blockDuration) {
        const blockStart = new Date(Date.now() - finalConfig.blockDuration).toISOString();
        const recentBlocks = validAttempts.filter(
          attempt => attempt.blocked && attempt.timestamp >= blockStart
        );

        if (recentBlocks.length > 0) {
          const latestBlock = recentBlocks[0];
          const blockExpiry = new Date(latestBlock.timestamp).getTime() + finalConfig.blockDuration;
          const retryAfter = Math.ceil((blockExpiry - Date.now()) / 1000);

          if (retryAfter > 0) {
            return {
              allowed: false,
              retryAfter,
              message: `Blocked due to rate limit. Try again in ${this.formatDuration(retryAfter * 1000)}.`
            };
          }
        }
      }

      // Check rate limit
      if (failedAttempts.length >= finalConfig.maxAttempts) {
        const oldestAttempt = new Date(failedAttempts[failedAttempts.length - 1].timestamp).getTime();
        const resetTime = oldestAttempt + finalConfig.windowMs;
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

        // Log the rate limit violation
        await this.logAttempt(action, identifier, ipAddress, userAgent, false, true);

        return {
          allowed: false,
          resetTime,
          retryAfter,
          message: `Rate limit exceeded. Please try again in ${this.formatDuration(resetTime - Date.now())}.`
        };
      }

      const remainingAttempts = finalConfig.maxAttempts - failedAttempts.length;

      return {
        allowed: true,
        remainingAttempts,
        message: remainingAttempts <= 2 ? 
          `${remainingAttempts} attempts remaining` : undefined
      };

    } catch (error) {
      SecureLogger.error('Rate limit check error', {
        action,
        identifier: SecureLogger.sanitize(identifier),
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fail open for unexpected errors
      return {
        allowed: true,
        message: 'Rate limit check failed'
      };
    }
  }

  /**
   * Record an attempt in the database
   */
  static async recordAttempt(
    action: string,
    identifier: string,
    success: boolean = true,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.logAttempt(action, identifier, ipAddress, userAgent, success, false);
    } catch (error) {
      SecureLogger.error('Failed to record rate limit attempt', {
        action,
        identifier: SecureLogger.sanitize(identifier),
        success,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Log attempt to database
   */
  private static async logAttempt(
    action: string,
    identifier: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    blocked: boolean = false
  ): Promise<void> {
    const logEntry: RateLimitLogEntry = {
      action,
      identifier,
      ip_address: ipAddress,
      user_agent: userAgent ? userAgent.substring(0, 500) : undefined, // Truncate long user agents
      timestamp: new Date().toISOString(),
      success,
      blocked
    };

    const { error } = await supabase
      .from('rate_limit_log')
      .insert([logEntry]);

    if (error) {
      SecureLogger.error('Failed to log rate limit attempt', {
        action,
        identifier: SecureLogger.sanitize(identifier),
        error: error.message
      });
    }
  }

  /**
   * Clear rate limit data for an identifier (admin function)
   */
  static async clearRateLimit(action: string, identifier: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('rate_limit_log')
        .delete()
        .eq('action', action)
        .eq('identifier', identifier);

      if (error) {
        throw new Error(`Failed to clear rate limit: ${error.message}`);
      }

      SecureLogger.info('Rate limit cleared', {
        action,
        identifier: SecureLogger.sanitize(identifier)
      });

    } catch (error) {
      SecureLogger.error('Failed to clear rate limit', {
        action,
        identifier: SecureLogger.sanitize(identifier),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get rate limit status for monitoring
   */
  static async getRateLimitStatus(
    action: string,
    identifier: string
  ): Promise<{
    attempts: number;
    blocked: boolean;
    blockExpiry?: number;
  }> {
    try {
      const config = this.DEFAULT_CONFIGS[action];
      if (!config) {
        throw new Error(`Unknown action: ${action}`);
      }

      const windowStart = new Date(Date.now() - config.windowMs).toISOString();

      const { data: attempts, error } = await supabase
        .from('rate_limit_log')
        .select('*')
        .eq('action', action)
        .eq('identifier', identifier)
        .gte('timestamp', windowStart)
        .order('timestamp', { ascending: false });

      if (error) {
        throw new Error(`Failed to get rate limit status: ${error.message}`);
      }

      const validAttempts = attempts || [];
      const failedAttempts = validAttempts.filter(attempt => !attempt.success);

      // Check if currently blocked
      let blocked = false;
      let blockExpiry: number | undefined;

      if (config.blockDuration) {
        const blockStart = new Date(Date.now() - config.blockDuration).toISOString();
        const recentBlocks = validAttempts.filter(
          attempt => attempt.blocked && attempt.timestamp >= blockStart
        );

        if (recentBlocks.length > 0) {
          const latestBlock = recentBlocks[0];
          blockExpiry = new Date(latestBlock.timestamp).getTime() + config.blockDuration;
          blocked = blockExpiry > Date.now();
        }
      }

      return {
        attempts: failedAttempts.length,
        blocked,
        blockExpiry
      };

    } catch (error) {
      SecureLogger.error('Failed to get rate limit status', {
        action,
        identifier: SecureLogger.sanitize(identifier),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Clean up old rate limit data (should be called periodically)
   */
  static async cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanMs).toISOString();

      const { error } = await supabase
        .from('rate_limit_log')
        .delete()
        .lt('timestamp', cutoffTime);

      if (error) {
        SecureLogger.error('Rate limit cleanup failed', { error: error.message });
      } else {
        SecureLogger.info('Rate limit cleanup completed', { cutoffTime });
      }

    } catch (error) {
      SecureLogger.error('Rate limit cleanup error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Format duration for user-friendly messages
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
   * Create rate limit error for consistent error handling
   */
  static createRateLimitError(
    action: string,
    retryAfter?: number,
    context?: string
  ): AppError {
    return ErrorHandler.handleRateLimit(action, retryAfter, context);
  }
}

export default ServerRateLimiter;