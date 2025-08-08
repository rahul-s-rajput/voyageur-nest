import { supabase } from '../lib/supabase';

export interface NotificationConfig {
  id: string;
  propertyId: string;
  platform: 'booking.com' | 'gommt' | 'all';
  type: 'reminder' | 'alert' | 'update' | 'deadline';
  enabled: boolean;
  schedule: {
    frequency: 'daily' | 'weekly' | 'custom';
    time: string; // HH:MM format
    days?: number[]; // 0-6, Sunday = 0
    customCron?: string;
  };
  conditions: {
    pendingUpdatesThreshold?: number;
    hoursWithoutUpdate?: number;
    upcomingDeadlineHours?: number;
  };
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    webhook?: string;
  };
  message: {
    title: string;
    body: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  propertyId: string;
  configId: string;
  type: 'reminder' | 'alert' | 'update' | 'deadline';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  platform?: string;
  data?: any;
  read: boolean;
  dismissed: boolean;
  scheduledFor?: Date;
  sentAt?: Date;
  createdAt: Date;
}

export interface NotificationSubscription {
  id: string;
  userId: string;
  propertyId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
}

class NotificationService {
  private subscribers: Map<string, ((notification: Notification) => void)[]> = new Map();
  private notificationQueue: Notification[] = [];
  private isProcessing = false;

  // Real-time notification subscription
  subscribeToNotifications(propertyId: string, callback: (notification: Notification) => void) {
    if (!this.subscribers.has(propertyId)) {
      this.subscribers.set(propertyId, []);
    }
    this.subscribers.get(propertyId)!.push(callback);

    // Set up real-time subscription with Supabase
    const subscription = supabase
      .channel(`notifications:${propertyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `property_id=eq.${propertyId}`
        },
        (payload) => {
          const notification = this.transformNotification(payload.new);
          this.notifySubscribers(propertyId, notification);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(propertyId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
      subscription.unsubscribe();
    };
  }

  private notifySubscribers(propertyId: string, notification: Notification) {
    const callbacks = this.subscribers.get(propertyId);
    if (callbacks) {
      callbacks.forEach(callback => callback(notification));
    }
  }

  private transformNotification(data: any): Notification {
    return {
      id: data.id,
      propertyId: data.property_id,
      configId: data.config_id,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority,
      platform: data.platform,
      data: data.data,
      read: data.read,
      dismissed: data.dismissed,
      scheduledFor: data.scheduled_for ? new Date(data.scheduled_for) : undefined,
      sentAt: data.sent_at ? new Date(data.sent_at) : undefined,
      createdAt: new Date(data.created_at)
    };
  }

  // Create notification configuration
  async createNotificationConfig(config: Omit<NotificationConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationConfig> {
    const { data, error } = await supabase
      .from('notification_configs')
      .insert({
        property_id: config.propertyId,
        platform: config.platform,
        type: config.type,
        enabled: config.enabled,
        schedule: config.schedule,
        conditions: config.conditions,
        channels: config.channels,
        message: config.message
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      propertyId: data.property_id,
      platform: data.platform,
      type: data.type,
      enabled: data.enabled,
      schedule: data.schedule,
      conditions: data.conditions,
      channels: data.channels,
      message: data.message,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  // Get notification configurations
  async getNotificationConfigs(propertyId: string): Promise<NotificationConfig[]> {
    const { data, error } = await supabase
      .from('notification_configs')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      propertyId: item.property_id,
      platform: item.platform,
      type: item.type,
      enabled: item.enabled,
      schedule: item.schedule,
      conditions: item.conditions,
      channels: item.channels,
      message: item.message,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));
  }

  // Send immediate notification
  async sendNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        property_id: notification.propertyId,
        config_id: notification.configId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        platform: notification.platform,
        data: notification.data,
        read: notification.read,
        dismissed: notification.dismissed,
        scheduled_for: notification.scheduledFor?.toISOString(),
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    const createdNotification = this.transformNotification(data);

    // Send to appropriate channels
    await this.deliverNotification(createdNotification);

    return createdNotification;
  }

  // Deliver notification through configured channels
  private async deliverNotification(notification: Notification) {
    try {
      // Get notification config to determine delivery channels
      const { data: config } = await supabase
        .from('notification_configs')
        .select('channels')
        .eq('id', notification.configId)
        .single();

      if (!config) return;

      const channels = config.channels;

      // In-app notification (already handled by real-time subscription)
      if (channels.inApp) {
        this.notifySubscribers(notification.propertyId, notification);
      }

      // Browser push notification
      if (channels.inApp && 'Notification' in window) {
        await this.sendBrowserNotification(notification);
      }

      // Email notification
      if (channels.email) {
        await this.sendEmailNotification(notification);
      }

      // SMS notification
      if (channels.sms) {
        await this.sendSMSNotification(notification);
      }

      // Webhook notification
      if (channels.webhook) {
        await this.sendWebhookNotification(notification, channels.webhook);
      }
    } catch (error) {
      console.error('Error delivering notification:', error);
    }
  }

  // Browser push notification
  private async sendBrowserNotification(notification: Notification) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        data: notification.data
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
          data: notification.data
        });
      }
    }
  }

  // Email notification (placeholder - integrate with your email service)
  private async sendEmailNotification(notification: Notification) {
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    console.log('Sending email notification:', notification);
  }

  // SMS notification (placeholder - integrate with Twilio or similar)
  private async sendSMSNotification(notification: Notification) {
    // This would integrate with your SMS service (Twilio, AWS SNS, etc.)
    console.log('Sending SMS notification:', notification);
  }

  // Webhook notification
  private async sendWebhookNotification(notification: Notification, webhookUrl: string) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'notification',
          notification: notification,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error sending webhook notification:', error);
    }
  }

  // Get notifications for a property
  async getNotifications(propertyId: string, options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('property_id', propertyId);

    if (options?.unreadOnly) {
      query = query.eq('read', false);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(options?.limit || 50);

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(item => this.transformNotification(item));
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  }

  // Mark notification as dismissed
  async dismissNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ dismissed: true })
      .eq('id', notificationId);

    if (error) throw error;
  }

  // Check conditions and send automated notifications
  async checkAndSendAutomatedNotifications(propertyId: string): Promise<void> {
    try {
      const configs = await this.getNotificationConfigs(propertyId);
      const enabledConfigs = configs.filter(config => config.enabled);

      for (const config of enabledConfigs) {
        const shouldSend = await this.evaluateNotificationConditions(config);
        
        if (shouldSend) {
          await this.sendNotification({
            propertyId: config.propertyId,
            configId: config.id,
            type: config.type,
            title: config.message.title,
            message: config.message.body,
            priority: config.message.priority,
            platform: config.platform === 'all' ? undefined : config.platform,
            read: false,
            dismissed: false
          });
        }
      }
    } catch (error) {
      console.error('Error checking automated notifications:', error);
    }
  }

  // Evaluate notification conditions
  private async evaluateNotificationConditions(config: NotificationConfig): Promise<boolean> {
    const conditions = config.conditions;

    // Check pending updates threshold
    if (conditions.pendingUpdatesThreshold) {
      // This would check the actual pending updates count
      // Implementation depends on your manual update service
    }

    // Check hours without update
    if (conditions.hoursWithoutUpdate) {
      // This would check the last update timestamp
      // Implementation depends on your manual update service
    }

    // Check upcoming deadlines
    if (conditions.upcomingDeadlineHours) {
      // This would check for upcoming booking deadlines
      // Implementation depends on your booking service
    }

    // For now, return false to prevent spam during development
    return false;
  }

  // Create default notification configurations for a property
  async createDefaultConfigurations(propertyId: string): Promise<NotificationConfig[]> {
    const defaultConfigs = [
      {
        propertyId,
        platform: 'booking.com' as const,
        type: 'reminder' as const,
        enabled: true,
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
          days: [1, 2, 3, 4, 5] // Monday to Friday
        },
        conditions: {
          pendingUpdatesThreshold: 5,
          hoursWithoutUpdate: 24
        },
        channels: {
          inApp: true,
          email: false,
          sms: false
        },
        message: {
          title: 'Booking.com Updates Required',
          body: 'You have pending updates for Booking.com that require attention.',
          priority: 'medium' as const
        }
      },
      {
        propertyId,
        platform: 'gommt' as const,
        type: 'reminder' as const,
        enabled: true,
        schedule: {
          frequency: 'daily' as const,
          time: '09:30',
          days: [1, 2, 3, 4, 5] // Monday to Friday
        },
        conditions: {
          pendingUpdatesThreshold: 5,
          hoursWithoutUpdate: 24
        },
        channels: {
          inApp: true,
          email: false,
          sms: false
        },
        message: {
          title: 'GoMMT Updates Required',
          body: 'You have pending updates for GoMMT that require attention.',
          priority: 'medium' as const
        }
      }
    ];

    const createdConfigs = [];
    for (const config of defaultConfigs) {
      const created = await this.createNotificationConfig(config);
      createdConfigs.push(created);
    }

    return createdConfigs;
  }
}

export const notificationService = new NotificationService();