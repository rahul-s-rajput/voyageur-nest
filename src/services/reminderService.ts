import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';
import { ManualUpdateService } from './manualUpdateService';

export interface ReminderRule {
  id: string;
  propertyId: string;
  name: string;
  description: string;
  platform: 'booking.com' | 'gommt' | 'all';
  enabled: boolean;
  trigger: {
    type: 'schedule' | 'condition' | 'event';
    schedule?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      time: string; // HH:MM
      days?: number[]; // 0-6, Sunday = 0
      timezone: string;
    };
    condition?: {
      type: 'pending_updates' | 'time_since_update' | 'upcoming_deadline' | 'booking_count';
      operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
      value: number;
      unit?: 'minutes' | 'hours' | 'days';
    };
    event?: {
      type: 'new_booking' | 'booking_modified' | 'booking_cancelled' | 'rate_change';
      delay?: number; // minutes to wait after event
    };
  };
  action: {
    type: 'notification' | 'checklist' | 'bulk_format' | 'email' | 'sms';
    notification?: {
      title: string;
      message: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      channels: string[];
    };
    checklist?: {
      autoGenerate: boolean;
      template?: string;
    };
    bulkFormat?: {
      format: 'csv' | 'json' | 'calendar-grid';
      autoDownload: boolean;
    };
  };
  lastTriggered?: Date;
  nextScheduled?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderExecution {
  id: string;
  ruleId: string;
  propertyId: string;
  triggeredAt: Date;
  triggerType: string;
  triggerData?: any;
  actionType: string;
  actionResult: 'success' | 'failed' | 'partial';
  errorMessage?: string;
  executionTime: number; // milliseconds
}

class ReminderService {
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  // Start the reminder service
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleAllRules();
    
    // Check for condition-based reminders every 5 minutes
    setInterval(() => {
      this.checkConditionBasedRules();
    }, 5 * 60 * 1000);
    
    console.log('Reminder service started');
  }

  // Stop the reminder service
  stop() {
    this.isRunning = false;
    
    // Clear all scheduled jobs
    this.scheduledJobs.forEach(timeout => clearTimeout(timeout));
    this.scheduledJobs.clear();
    
    console.log('Reminder service stopped');
  }

  // Create a new reminder rule
  async createReminderRule(rule: Omit<ReminderRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReminderRule> {
    const { data, error } = await supabase
      .from('reminder_rules')
      .insert({
        property_id: rule.propertyId,
        name: rule.name,
        description: rule.description,
        platform: rule.platform,
        enabled: rule.enabled,
        trigger: rule.trigger,
        action: rule.action,
        next_scheduled: this.calculateNextScheduled(rule.trigger)
      })
      .select()
      .single();

    if (error) throw error;

    const createdRule = this.transformReminderRule(data);
    
    // Schedule the rule if it's enabled
    if (createdRule.enabled) {
      this.scheduleRule(createdRule);
    }

    return createdRule;
  }

  // Get reminder rules for a property
  async getReminderRules(propertyId: string): Promise<ReminderRule[]> {
    const { data, error } = await supabase
      .from('reminder_rules')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(item => this.transformReminderRule(item));
  }

  // Update a reminder rule
  async updateReminderRule(ruleId: string, updates: Partial<ReminderRule>): Promise<ReminderRule> {
    const { data, error } = await supabase
      .from('reminder_rules')
      .update({
        name: updates.name,
        description: updates.description,
        platform: updates.platform,
        enabled: updates.enabled,
        trigger: updates.trigger,
        action: updates.action,
        next_scheduled: updates.trigger ? this.calculateNextScheduled(updates.trigger) : undefined
      })
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;

    const updatedRule = this.transformReminderRule(data);
    
    // Reschedule the rule
    this.unscheduleRule(ruleId);
    if (updatedRule.enabled) {
      this.scheduleRule(updatedRule);
    }

    return updatedRule;
  }

  // Delete a reminder rule
  async deleteReminderRule(ruleId: string): Promise<void> {
    const { error } = await supabase
      .from('reminder_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw error;

    this.unscheduleRule(ruleId);
  }

  // Schedule all active rules
  private async scheduleAllRules() {
    try {
      const { data, error } = await supabase
        .from('reminder_rules')
        .select('*')
        .eq('enabled', true);

      if (error) throw error;

      data.forEach(ruleData => {
        const rule = this.transformReminderRule(ruleData);
        this.scheduleRule(rule);
      });
    } catch (error) {
      console.error('Error scheduling rules:', error);
    }
  }

  // Schedule a specific rule
  private scheduleRule(rule: ReminderRule) {
    if (rule.trigger.type !== 'schedule') return;

    const nextExecution = this.calculateNextScheduled(rule.trigger);
    if (!nextExecution) return;

    const delay = nextExecution.getTime() - Date.now();
    if (delay <= 0) return;

    const timeout = setTimeout(async () => {
      await this.executeRule(rule);
      
      // Reschedule for next execution
      this.unscheduleRule(rule.id);
      this.scheduleRule(rule);
    }, delay);

    this.scheduledJobs.set(rule.id, timeout);
  }

  // Unschedule a rule
  private unscheduleRule(ruleId: string) {
    const timeout = this.scheduledJobs.get(ruleId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledJobs.delete(ruleId);
    }
  }

  // Calculate next scheduled execution
  private calculateNextScheduled(trigger: ReminderRule['trigger']): Date | null {
    if (trigger.type !== 'schedule' || !trigger.schedule) return null;

    const now = new Date();
    const schedule = trigger.schedule;
    const [hours, minutes] = schedule.time.split(':').map(Number);

    let nextDate = new Date();
    nextDate.setHours(hours, minutes, 0, 0);

    // If the time has passed today, move to next occurrence
    if (nextDate <= now) {
      switch (schedule.frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
      }
    }

    // For weekly schedules, adjust to the correct day
    if (schedule.frequency === 'weekly' && schedule.days) {
      const currentDay = nextDate.getDay();
      const targetDays = schedule.days.sort();
      
      let nextDay = targetDays.find(day => day > currentDay);
      if (!nextDay) {
        nextDay = targetDays[0];
        nextDate.setDate(nextDate.getDate() + 7);
      }
      
      const daysToAdd = nextDay - currentDay;
      nextDate.setDate(nextDate.getDate() + daysToAdd);
    }

    return nextDate;
  }

  // Check condition-based rules
  private async checkConditionBasedRules() {
    try {
      const { data, error } = await supabase
        .from('reminder_rules')
        .select('*')
        .eq('enabled', true)
        .eq('trigger->>type', 'condition');

      if (error) throw error;

      for (const ruleData of data) {
        const rule = this.transformReminderRule(ruleData);
        const shouldTrigger = await this.evaluateCondition(rule);
        
        if (shouldTrigger) {
          await this.executeRule(rule);
        }
      }
    } catch (error) {
      console.error('Error checking condition-based rules:', error);
    }
  }

  // Evaluate if a condition-based rule should trigger
  private async evaluateCondition(rule: ReminderRule): Promise<boolean> {
    if (!rule.trigger.condition) return false;

    const condition = rule.trigger.condition;
    const now = new Date();

    // Check if rule was triggered recently to avoid spam
    if (rule.lastTriggered) {
      const timeSinceLastTrigger = now.getTime() - rule.lastTriggered.getTime();
      const minInterval = 60 * 60 * 1000; // 1 hour minimum between triggers
      
      if (timeSinceLastTrigger < minInterval) {
        return false;
      }
    }

    try {
      switch (condition.type) {
        case 'pending_updates':
          return await this.checkPendingUpdates(rule.propertyId, rule.platform, condition);
        
        case 'time_since_update':
          return await this.checkTimeSinceUpdate(rule.propertyId, rule.platform, condition);
        
        case 'upcoming_deadline':
          return await this.checkUpcomingDeadlines(rule.propertyId, condition);
        
        case 'booking_count':
          return await this.checkBookingCount(rule.propertyId, condition);
        
        default:
          return false;
      }
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  // Check pending updates condition
  private async checkPendingUpdates(
    propertyId: string, 
    platform: string, 
    condition: { operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'; value: number }
  ): Promise<boolean> {
    const checklists = await ManualUpdateService.getPendingChecklists();
    const platformChecklists = platform === 'all' 
      ? checklists 
      : checklists.filter(c => c.platform_id === platform);
    
    const pendingCount = platformChecklists.reduce((sum, c) => 
      sum + ((c.total_items || 0) - (c.completed_items || 0)), 0
    );

    return this.compareValues(pendingCount, condition.operator, condition.value);
  }

  // Check time since last update condition
  private async checkTimeSinceUpdate(
    propertyId: string, 
    platform: string, 
    condition: { 
      operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'; 
      value: number; 
      unit?: 'minutes' | 'hours' | 'days' 
    }
  ): Promise<boolean> {
    const checklists = await ManualUpdateService.getPendingChecklists();
    const platformChecklists = platform === 'all' 
      ? checklists 
      : checklists.filter(c => c.platform_id === platform);

    if (platformChecklists.length === 0) return false;

    const lastUpdate = Math.max(...platformChecklists.map(c => new Date(c.updated_at).getTime()));
    const timeSinceUpdate = Date.now() - lastUpdate;
    
    let thresholdMs = condition.value;
    switch (condition.unit) {
      case 'minutes':
        thresholdMs *= 60 * 1000;
        break;
      case 'hours':
        thresholdMs *= 60 * 60 * 1000;
        break;
      case 'days':
        thresholdMs *= 24 * 60 * 60 * 1000;
        break;
    }

    return this.compareValues(timeSinceUpdate, condition.operator, thresholdMs);
  }

  // Check upcoming deadlines condition
  private async checkUpcomingDeadlines(
    propertyId: string, 
    condition: { operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'; value: number }
  ): Promise<boolean> {
    // This would check for upcoming booking deadlines
    // Implementation depends on your booking service
    return false;
  }

  // Check booking count condition
  private async checkBookingCount(
    propertyId: string, 
    condition: { operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'; value: number }
  ): Promise<boolean> {
    // This would check recent booking counts
    // Implementation depends on your booking service
    return false;
  }

  // Compare values based on operator
  private compareValues(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'gte': return actual >= expected;
      case 'lt': return actual < expected;
      case 'lte': return actual <= expected;
      case 'eq': return actual === expected;
      default: return false;
    }
  }

  // Execute a reminder rule
  private async executeRule(rule: ReminderRule): Promise<void> {
    const startTime = Date.now();
    let result: 'success' | 'failed' | 'partial' = 'success';
    let errorMessage: string | undefined;

    try {
      switch (rule.action.type) {
        case 'notification':
          await this.executeNotificationAction(rule);
          break;
        
        case 'checklist':
          await this.executeChecklistAction(rule);
          break;
        
        case 'bulk_format':
          await this.executeBulkFormatAction(rule);
          break;
        
        case 'email':
          await this.executeEmailAction(rule);
          break;
        
        case 'sms':
          await this.executeSMSAction(rule);
          break;
        
        default:
          throw new Error(`Unknown action type: ${rule.action.type}`);
      }

      // Update last triggered time
      await supabase
        .from('reminder_rules')
        .update({ last_triggered: new Date().toISOString() })
        .eq('id', rule.id);

    } catch (error) {
      result = 'failed';
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error executing reminder rule:', error);
    }

    // Log execution
    await this.logExecution({
      ruleId: rule.id,
      propertyId: rule.propertyId,
      triggeredAt: new Date(),
      triggerType: rule.trigger.type,
      actionType: rule.action.type,
      actionResult: result,
      errorMessage,
      executionTime: Date.now() - startTime
    });
  }

  // Execute notification action
  private async executeNotificationAction(rule: ReminderRule): Promise<void> {
    if (!rule.action.notification) return;

    await notificationService.sendNotification({
      propertyId: rule.propertyId,
      configId: rule.id, // Use rule ID as config ID for reminders
      type: 'reminder',
      title: rule.action.notification.title,
      message: rule.action.notification.message,
      priority: rule.action.notification.priority,
      platform: rule.platform === 'all' ? undefined : rule.platform,
      read: false,
      dismissed: false
    });
  }

  // Execute checklist action
  private async executeChecklistAction(rule: ReminderRule): Promise<void> {
    if (!rule.action.checklist?.autoGenerate) return;

    // Generate checklist for the property and platform
    const dateRange = {
      start: new Date(),
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };

    if (rule.platform === 'all') {
      // Get all manual platforms and generate checklists
      const { data: platforms } = await supabase
        .from('ota_platforms')
        .select('id')
        .eq('manual_update_required', true)
        .eq('is_active', true);

      if (platforms) {
        for (const platform of platforms) {
          await ManualUpdateService.generateChecklist(platform.id, rule.propertyId, dateRange);
        }
      }
    } else {
      // Find platform ID for the specified platform
      const { data: platform } = await supabase
        .from('ota_platforms')
        .select('id')
        .ilike('name', `%${rule.platform}%`)
        .eq('manual_update_required', true)
        .eq('is_active', true)
        .single();

      if (platform) {
        await ManualUpdateService.generateChecklist(platform.id, rule.propertyId, dateRange);
      }
    }
  }

  // Execute bulk format action
  private async executeBulkFormatAction(rule: ReminderRule): Promise<void> {
    // This would generate and optionally download bulk formats
    // Implementation depends on your bulk format service integration
    console.log('Executing bulk format action for rule:', rule.id);
  }

  // Execute email action
  private async executeEmailAction(rule: ReminderRule): Promise<void> {
    // This would send email notifications
    // Implementation depends on your email service
    console.log('Executing email action for rule:', rule.id);
  }

  // Execute SMS action
  private async executeSMSAction(rule: ReminderRule): Promise<void> {
    // This would send SMS notifications
    // Implementation depends on your SMS service
    console.log('Executing SMS action for rule:', rule.id);
  }

  // Log rule execution
  private async logExecution(execution: Omit<ReminderExecution, 'id'>): Promise<void> {
    try {
      await supabase
        .from('reminder_executions')
        .insert({
          rule_id: execution.ruleId,
          property_id: execution.propertyId,
          triggered_at: execution.triggeredAt.toISOString(),
          trigger_type: execution.triggerType,
          trigger_data: execution.triggerData,
          action_type: execution.actionType,
          action_result: execution.actionResult,
          error_message: execution.errorMessage,
          execution_time: execution.executionTime
        });
    } catch (error) {
      console.error('Error logging reminder execution:', error);
    }
  }

  // Transform database row to ReminderRule
  private transformReminderRule(data: any): ReminderRule {
    return {
      id: data.id,
      propertyId: data.property_id,
      name: data.name,
      description: data.description,
      platform: data.platform,
      enabled: data.enabled,
      trigger: data.trigger,
      action: data.action,
      lastTriggered: data.last_triggered ? new Date(data.last_triggered) : undefined,
      nextScheduled: data.next_scheduled ? new Date(data.next_scheduled) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  // Create default reminder rules for a property
  async createDefaultRules(propertyId: string): Promise<ReminderRule[]> {
    const defaultRules = [
      {
        propertyId,
        name: 'Daily Update Reminder',
        description: 'Daily reminder to check for pending updates',
        platform: 'all' as const,
        enabled: true,
        trigger: {
          type: 'schedule' as const,
          schedule: {
            frequency: 'daily' as const,
            time: '09:00',
            days: [1, 2, 3, 4, 5], // Monday to Friday
            timezone: 'UTC'
          }
        },
        action: {
          type: 'notification' as const,
          notification: {
            title: 'Daily Update Check',
            message: 'Time to check for pending manual updates on your OTA platforms.',
            priority: 'medium' as const,
            channels: ['in-app']
          }
        }
      },
      {
        propertyId,
        name: 'Overdue Updates Alert',
        description: 'Alert when updates are overdue',
        platform: 'all' as const,
        enabled: true,
        trigger: {
          type: 'condition' as const,
          condition: {
            type: 'time_since_update' as const,
            operator: 'gt' as const,
            value: 24,
            unit: 'hours' as const
          }
        },
        action: {
          type: 'notification' as const,
          notification: {
            title: 'Overdue Updates',
            message: 'You have updates that are more than 24 hours overdue.',
            priority: 'high' as const,
            channels: ['in-app', 'email']
          }
        }
      }
    ];

    const createdRules = [];
    for (const rule of defaultRules) {
      const created = await this.createReminderRule(rule);
      createdRules.push(created);
    }

    return createdRules;
  }
}

export const reminderService = new ReminderService();