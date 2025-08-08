// OTA Monitoring and Analytics Service
// Story 4.2: Task 7 - Monitoring and Analytics

import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay, endOfDay, subHours } from 'date-fns';
import type { 
  OTASyncLog, 
  CalendarConflict, 
  OTAPlatform,
  SyncHealthMetrics,
  ConflictAnalytics,
  PlatformPerformance,
  SyncTrend,
  AlertRule,
  MonitoringAlert
} from '../types/ota';

export class OTAMonitoringService {
  /**
   * Get sync health metrics for dashboard
   */
  static async getSyncHealthMetrics(days: number = 7): Promise<SyncHealthMetrics> {
    const startDate = subDays(new Date(), days);
    
    try {
      // Get sync logs
      const { data: syncLogs, error: syncError } = await supabase
        .from('ota_sync_logs')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (syncError) throw syncError;

      // Get conflicts
      const { data: conflicts, error: conflictError } = await supabase
        .from('calendar_conflicts')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (conflictError) throw conflictError;

      // Get active platforms
      const { data: platforms, error: platformError } = await supabase
        .from('ota_platforms')
        .select('*')
        .eq('is_active', true)
        .eq('sync_enabled', true);

      if (platformError) throw platformError;

      // Calculate metrics
      const totalSyncs = syncLogs?.length || 0;
      const successfulSyncs = syncLogs?.filter(log => log.status === 'success').length || 0;
      const failedSyncs = syncLogs?.filter(log => log.status === 'error').length || 0;
      const totalConflicts = conflicts?.length || 0;
      const resolvedConflicts = conflicts?.filter(c => c.status === 'resolved').length || 0;
      const activePlatforms = platforms?.filter(p => p.sync_enabled).length || 0;

      // Calculate sync health score (0-100)
      const syncSuccessRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100;
      const conflictResolutionRate = totalConflicts > 0 ? (resolvedConflicts / totalConflicts) * 100 : 100;
      const platformHealthScore = platforms?.length > 0 ? (activePlatforms / platforms.length) * 100 : 100;
      
      const overallHealthScore = Math.round(
        (syncSuccessRate * 0.5 + conflictResolutionRate * 0.3 + platformHealthScore * 0.2)
      );

      // Get recent sync failures
      const recentFailures = syncLogs
        ?.filter(log => log.status === 'error')
        .slice(0, 5)
        .map(log => ({
          platform: log.platform_name,
          error: log.error_message,
          timestamp: log.created_at
        })) || [];

      return {
        overall_score: overallHealthScore,
        platform_scores: platforms?.reduce((acc, platform) => {
          acc[platform.id] = Math.round(Math.random() * 100); // Placeholder calculation
          return acc;
        }, {} as Record<string, number>) || {},
        last_sync_times: platforms?.reduce((acc, platform) => {
          acc[platform.id] = platform.last_sync || new Date().toISOString();
          return acc;
        }, {} as Record<string, string>) || {},
        error_rates: platforms?.reduce((acc, platform) => {
          acc[platform.id] = Math.round(Math.random() * 10); // Placeholder calculation
          return acc;
        }, {} as Record<string, number>) || {},
        uptime_percentage: Math.round(syncSuccessRate)
      };
    } catch (error) {
      console.error('Error getting sync health metrics:', error);
      throw error;
    }
  }

  /**
   * Get platform performance analytics
   */
  static async getPlatformPerformance(days: number = 30): Promise<PlatformPerformance[]> {
    const startDate = subDays(new Date(), days);
    
    try {
      const { data: platforms, error: platformError } = await supabase
        .from('ota_platforms')
        .select('*')
        .eq('is_active', true);

      if (platformError) throw platformError;

      const performance: PlatformPerformance[] = [];

      for (const platform of platforms || []) {
        // Get sync logs for this platform
        const { data: syncLogs, error: syncError } = await supabase
          .from('ota_sync_logs')
          .select('*')
          .eq('platform_id', platform.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });

        if (syncError) throw syncError;

        // Get conflicts for this platform
        const { data: conflicts, error: conflictError } = await supabase
          .from('calendar_conflicts')
          .select('*')
          .eq('platform_id', platform.id)
          .gte('created_at', startDate.toISOString());

        if (conflictError) throw conflictError;

        const totalSyncs = syncLogs?.length || 0;
        const successfulSyncs = syncLogs?.filter(log => log.status === 'success').length || 0;
        const failedSyncs = syncLogs?.filter(log => log.status === 'error').length || 0;
        const totalConflicts = conflicts?.length || 0;
        const avgSyncDuration = syncLogs?.length > 0 
          ? syncLogs.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / syncLogs.length 
          : 0;

        // Calculate uptime (percentage of successful syncs in expected sync intervals)
        const expectedSyncs = Math.ceil((days * 24) / platform.sync_frequency_hours);
        const uptime = expectedSyncs > 0 ? Math.min((successfulSyncs / expectedSyncs) * 100, 100) : 100;

        performance.push({
          platform_id: platform.id,
          platform_name: platform.name,
          sync_success_rate: totalSyncs > 0 ? Math.round((successfulSyncs / totalSyncs) * 100) : 100,
          average_sync_time: Math.round(avgSyncDuration),
          last_successful_sync: syncLogs?.find(log => log.status === 'success')?.created_at || '',
          error_count: failedSyncs,
          booking_count: 0 // Placeholder - would need to calculate from bookings
        });
      }

      return performance.sort((a, b) => b.sync_success_rate - a.sync_success_rate);
    } catch (error) {
      console.error('Error getting platform performance:', error);
      throw error;
    }
  }

  /**
   * Get sync trends over time
   */
  static async getSyncTrends(days: number = 30): Promise<SyncTrend[]> {
    const startDate = subDays(new Date(), days);
    
    try {
      const { data: syncLogs, error } = await supabase
        .from('ota_sync_logs')
        .select('created_at, status, platform_name')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by day
      const trendMap = new Map<string, {
        date: string;
        totalSyncs: number;
        successfulSyncs: number;
        failedSyncs: number;
        platforms: Set<string>;
      }>();

      syncLogs?.forEach(log => {
        const date = format(new Date(log.created_at), 'yyyy-MM-dd');
        
        if (!trendMap.has(date)) {
          trendMap.set(date, {
            date,
            totalSyncs: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            platforms: new Set()
          });
        }

        const trend = trendMap.get(date)!;
        trend.totalSyncs++;
        trend.platforms.add(log.platform_name);
        
        if (log.status === 'success') {
          trend.successfulSyncs++;
        } else if (log.status === 'error') {
          trend.failedSyncs++;
        }
      });

      return Array.from(trendMap.values()).map(trend => ({
        date: trend.date,
        successful_syncs: trend.successfulSyncs,
        failed_syncs: trend.failedSyncs,
        total_bookings: 0, // Placeholder - would need to calculate from bookings
        conflicts_detected: 0 // Placeholder - would need to calculate from conflicts
      }));
    } catch (error) {
      console.error('Error getting sync trends:', error);
      throw error;
    }
  }

  /**
   * Get conflict analytics
   */
  static async getConflictAnalytics(days: number = 30): Promise<ConflictAnalytics> {
    const startDate = subDays(new Date(), days);
    
    try {
      const { data: conflicts, error } = await supabase
        .from('calendar_conflicts')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const totalConflicts = conflicts?.length || 0;
      const resolvedConflicts = conflicts?.filter(c => c.status === 'resolved').length || 0;
      const pendingConflicts = conflicts?.filter(c => c.status === 'pending').length || 0;
      const autoResolvedConflicts = conflicts?.filter(c => c.auto_resolved).length || 0;

      // Group by type
      const conflictsByType = conflicts?.reduce((acc, conflict) => {
        acc[conflict.conflict_type] = (acc[conflict.conflict_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Group by platform
      const conflictsByPlatform = conflicts?.reduce((acc, conflict) => {
        const platform = conflict.platform_name || 'Unknown';
        acc[platform] = (acc[platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Calculate average resolution time
      const resolvedConflictsWithTime = conflicts?.filter(c => 
        c.status === 'resolved' && c.resolved_at
      ) || [];
      
      const avgResolutionTime = resolvedConflictsWithTime.length > 0
        ? resolvedConflictsWithTime.reduce((sum, conflict) => {
            const created = new Date(conflict.created_at);
            const resolved = new Date(conflict.resolved_at!);
            return sum + (resolved.getTime() - created.getTime());
          }, 0) / resolvedConflictsWithTime.length
        : 0;

      return {
        total_conflicts: totalConflicts,
        resolved_conflicts: resolvedConflicts,
        pending_conflicts: pendingConflicts,
        conflict_types: conflictsByType,
        resolution_times: {}, // Placeholder - would need to calculate resolution times by type
        platform_conflicts: conflictsByPlatform
      };
    } catch (error) {
      console.error('Error getting conflict analytics:', error);
      throw error;
    }
  }

  /**
   * Check for sync alerts
   */
  static async checkSyncAlerts(): Promise<MonitoringAlert[]> {
    const alerts: MonitoringAlert[] = [];
    const now = new Date();
    const oneHourAgo = subHours(now, 1);
    const oneDayAgo = subDays(now, 1);

    try {
      // Get active platforms for health calculation
      const { data: platforms, error: platformError } = await supabase
        .from('ota_platforms')
        .select('*')
        .eq('is_active', true)
        .eq('sync_enabled', true);

      if (platformError) throw platformError;

      for (const platform of platforms || []) {
        // Check for missed syncs
        const expectedLastSync = subHours(now, platform.sync_frequency_hours);
        if (!platform.last_sync || new Date(platform.last_sync) < expectedLastSync) {
          alerts.push({
            id: `missed-sync-${platform.id}`,
            rule_id: 'missed-sync-rule',
            severity: 'warning',
            message: `Platform ${platform.name} has not synced in ${platform.sync_frequency_hours} hours`,
            platform_id: platform.id,
            property_id: platform.property_id,
            triggered_at: now.toISOString(),
            acknowledged: false
          });
        }

        // Check for recent sync failures
        const { data: recentLogs, error: logError } = await supabase
          .from('ota_sync_logs')
          .select('*')
          .eq('platform_id', platform.id)
          .gte('created_at', oneHourAgo.toISOString())
          .eq('status', 'error')
          .limit(1);

        if (logError) throw logError;

        if (recentLogs && recentLogs.length > 0) {
          alerts.push({
            id: `sync-failure-${platform.id}`,
            rule_id: 'sync-failure-rule',
            severity: 'error',
            message: `Sync failed for ${platform.name}: ${recentLogs[0].error_message}`,
            platform_id: platform.id,
            property_id: platform.property_id,
            triggered_at: recentLogs[0].created_at,
            acknowledged: false
          });
        }
      }

      // Check for unresolved conflicts
      const { data: oldConflicts, error: conflictError } = await supabase
        .from('calendar_conflicts')
        .select('*')
        .eq('status', 'pending')
        .lt('created_at', oneDayAgo.toISOString());

      if (conflictError) throw conflictError;

      if (oldConflicts && oldConflicts.length > 0) {
        alerts.push({
          id: 'old-conflicts',
          rule_id: 'unresolved-conflicts-rule',
          severity: 'warning',
          message: `${oldConflicts.length} conflicts have been pending for more than 24 hours`,
          triggered_at: now.toISOString(),
          acknowledged: false
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error checking sync alerts:', error);
      throw error;
    }
  }

  /**
   * Generate sync report
   */
  static async generateSyncReport(startDate: Date, endDate: Date): Promise<{
    summary: SyncHealthMetrics;
    platformPerformance: PlatformPerformance[];
    conflictAnalytics: ConflictAnalytics;
    trends: SyncTrend[];
    recommendations: string[];
  }> {
    try {
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const [summary, platformPerformance, conflictAnalytics, trends] = await Promise.all([
        this.getSyncHealthMetrics(days),
        this.getPlatformPerformance(days),
        this.getConflictAnalytics(days),
        this.getSyncTrends(days)
      ]);

      // Generate recommendations
      const recommendations: string[] = [];

      // Check sync success rate
      if (summary.uptime_percentage < 95) {
        recommendations.push('Sync success rate is below 95%. Review platform configurations and network connectivity.');
      }

      // Check overall health score
      if (summary.overall_score < 80) {
        recommendations.push('Overall health score is low. Consider implementing more automated resolution rules.');
      }

      // Check platform performance
      const poorPerformingPlatforms = platformPerformance.filter(p => p.sync_success_rate < 70);
      if (poorPerformingPlatforms.length > 0) {
        recommendations.push(`${poorPerformingPlatforms.length} platform(s) have poor performance: ${poorPerformingPlatforms.map(p => p.platform_name).join(', ')}`);
      }

      // Check error rates
      const highErrorPlatforms = platformPerformance.filter(p => p.error_count > 10);
      if (highErrorPlatforms.length > 0) {
        recommendations.push('Some platforms have high error counts. Consider reviewing their configurations.');
      }

      return {
        summary,
        platformPerformance,
        conflictAnalytics,
        trends,
        recommendations
      };
    } catch (error) {
      console.error('Error generating sync report:', error);
      throw error;
    }
  }

  /**
   * Log sync operation
   */
  static async logSyncOperation(
    platformId: string,
    operation: string,
    status: 'success' | 'error' | 'warning',
    details?: {
      eventsProcessed?: number;
      conflictsDetected?: number;
      duration?: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('ota_sync_logs')
        .insert({
          platform_id: platformId,
          operation,
          status,
          events_processed: details?.eventsProcessed || 0,
          conflicts_detected: details?.conflictsDetected || 0,
          duration_ms: details?.duration || 0,
          error_message: details?.errorMessage,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update platform last_sync time if successful
      if (status === 'success') {
        await supabase
          .from('ota_platforms')
          .update({ 
            last_sync: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', platformId);
      }
    } catch (error) {
      console.error('Error logging sync operation:', error);
      throw error;
    }
  }

  /**
   * Get real-time sync status
   */
  static async getRealTimeSyncStatus(): Promise<{
    activeSyncs: number;
    queuedSyncs: number;
    lastSyncTime: string | null;
    systemHealth: 'healthy' | 'warning' | 'critical';
  }> {
    try {
      // Get recent sync logs (last 5 minutes)
      const fiveMinutesAgo = subHours(new Date(), 0.083); // 5 minutes
      
      const { data: recentLogs, error } = await supabase
        .from('ota_sync_logs')
        .select('*')
        .gte('created_at', fiveMinutesAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const activeSyncs = recentLogs?.filter(log => log.status === 'in_progress').length || 0;
      const queuedSyncs = 0; // Would need a queue table to track this
      const lastSyncTime = recentLogs?.[0]?.created_at || null;

      // Determine system health
      const recentFailures = recentLogs?.filter(log => log.status === 'error').length || 0;
      const totalRecent = recentLogs?.length || 0;
      
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      if (totalRecent > 0) {
        const failureRate = recentFailures / totalRecent;
        if (failureRate > 0.5) {
          systemHealth = 'critical';
        } else if (failureRate > 0.2) {
          systemHealth = 'warning';
        }
      }

      return {
        activeSyncs,
        queuedSyncs,
        lastSyncTime,
        systemHealth
      };
    } catch (error) {
      console.error('Error getting real-time sync status:', error);
      throw error;
    }
  }
}

export default OTAMonitoringService;