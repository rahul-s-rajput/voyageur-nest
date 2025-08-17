import { supabase } from '../lib/supabase';

export type NotificationType =
  | 'reminder'
  | 'alert'
  | 'update'
  | 'deadline'
  | 'booking_event'
  | 'email_parsed'
  | 'expense_event'
  | 'budget_event';

export interface NotificationConfig {
  id: string;
  propertyId: string;
  platform: 'booking.com' | 'gommt' | 'all';
  type: NotificationType;
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
  type: NotificationType;
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
  private vapidPublicKey?: string;

  // Real-time notification subscription (GLOBAL ONLY)
  subscribeToNotifications(_propertyId: string | undefined, callback: (notification: Notification) => void) {
    const key = 'global';
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key)!.push(callback);

    // Set up a single global real-time subscription with Supabase (no property filter)
    const unique = Math.random().toString(36).slice(2);
    const chanName = `notifications:all:${unique}`;
    const channel = supabase.channel(chanName);
    const config = { event: 'INSERT', schema: 'public', table: 'notifications' } as any;
    const subscription = channel.on('postgres_changes', config, (payload: any) => {
      const notification = this.transformNotification(payload.new);
      console.log('[NotificationService] Real-time notification received:', notification.id, notification.title, 'for channel:', chanName);
      this.notifySubscribers(notification.propertyId, notification);
    }).subscribe();

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
      subscription.unsubscribe();
    };
  }

  private notifySubscribers(_propertyId: string, notification: Notification) {
    // Global-only delivery to avoid duplicates
    const cbs = this.subscribers.get('global');
    if (cbs) cbs.forEach(cb => cb(notification));
  }

  // Push API: register SW and subscribe
  async ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register('/notifications-sw.js');
      await navigator.serviceWorker.ready;
      return reg;
    } catch {
      return null;
    }
  }

  async subscribePush(propertyId?: string): Promise<PushSubscription | null> {
    try {
      const reg = await this.ensureServiceWorker();
      if (!reg || !('PushManager' in window)) return null;
      if (!this.vapidPublicKey) {
        // Load VAPID public key from env served by backend or .env proxy
        const res = await fetch('/vapid-public-key.json').catch(() => null);
        const json = res && res.ok ? await res.json() : null;
        this.vapidPublicKey = json?.publicKey;
      }
      if (!this.vapidPublicKey) return null;
      const converted = this.urlBase64ToUint8Array(this.vapidPublicKey);
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: converted });
      // Persist subscription
      await (await import('../lib/supabase')).supabase
        .from('notification_subscriptions')
        .upsert({
          endpoint: sub.endpoint,
          keys: sub.toJSON().keys,
          property_id: propertyId || null
        }, { onConflict: 'endpoint' as any });
      return sub;
    } catch {
      return null;
    }
  }

  async unsubscribePush(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      try {
        await (await import('../lib/supabase')).supabase
          .from('notification_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint);
      } catch {}
      await sub.unsubscribe();
    }
  }

  private urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
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

  async updateNotificationConfig(id: string, updates: Partial<Omit<NotificationConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<NotificationConfig> {
    const payload: any = {};
    if (updates.enabled !== undefined) payload.enabled = updates.enabled;
    if (updates.channels !== undefined) payload.channels = updates.channels as any;
    if (updates.message !== undefined) payload.message = updates.message as any;
    if (updates.schedule !== undefined) payload.schedule = updates.schedule as any;
    if (updates.conditions !== undefined) payload.conditions = updates.conditions as any;
    if (updates.platform !== undefined) payload.platform = updates.platform as any;
    if (updates.type !== undefined) payload.type = updates.type as any;
    const { data, error } = await supabase
      .from('notification_configs')
      .update(payload)
      .eq('id', id)
      .select('*')
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
    
    // Debug log to track notifications
    console.log('[NotificationService] Created notification:', createdNotification.id, createdNotification.title);

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

      // In-app handled by realtime subscriber; show OS-level (system) notification here
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

  // Email notification (Supabase Functions invoke)
  private async sendEmailNotification(notification: Notification) {
    try {
      await (supabase as any).functions.invoke('send-email', {
        body: {
          propertyId: notification.propertyId,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          data: notification.data
        }
      });
    } catch (e) {
      console.warn('Email send failed', e);
    }
  }

  // SMS notification (Supabase Functions invoke)
  private async sendSMSNotification(notification: Notification) {
    try {
      await (supabase as any).functions.invoke('send-sms', {
        body: {
          propertyId: notification.propertyId,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          data: notification.data
        }
      });
    } catch (e) {
      console.warn('SMS send failed', e);
    }
  }

  // Convenience: send event with auto channel handling
  async sendEvent(params: {
    propertyId: string;
    type: Notification['type'];
    title: string;
    message: string;
    priority?: Notification['priority'];
    platform?: string;
    data?: any;
  }): Promise<Notification> {
    const { propertyId, type, title, message } = params;
    const priority = params.priority || 'medium';
    let channels: any = { inApp: true, email: false, sms: false };
    let configId: string | undefined;
    try {
      const { data: cfg } = await supabase
        .from('notification_configs')
        .select('id, channels')
        .eq('property_id', propertyId)
        .eq('type', type)
        .maybeSingle();
      if (cfg) {
        configId = cfg.id;
        channels = cfg.channels || channels;
      }
    } catch {}

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        property_id: propertyId,
        config_id: configId || null,
        type,
        title,
        message,
        priority,
        platform: params.platform,
        data: params.data,
        read: false,
        dismissed: false,
        sent_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw error;

    const created = this.transformNotification(data);
    try {
      // Show OS-level notification; in-app toasts handled by realtime subscriber
      if (channels.inApp && 'Notification' in window) await this.sendBrowserNotification(created);
      if (channels.email) await this.sendEmailNotification(created);
      if (channels.sms) await this.sendSMSNotification(created);
    } catch {}
    return created;
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
  async getNotifications(propertyId?: string, options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*');

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

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