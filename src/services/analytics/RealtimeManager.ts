import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase.ts";
import { UpdateQueue } from "./UpdateQueue.ts";
import { CrossTabSync } from "./CrossTabSync.ts";
import { OfflineQueue } from "./OfflineQueue.ts";

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface RealtimeSubscription {
  unsubscribe: () => void;
  channel: RealtimeChannel;
}

export interface DataUpdate {
  type: 'booking' | 'expense' | 'metrics';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: Date;
}

export interface RealtimeManagerConfig {
  propertyId: string;
  userId?: string;
  throttleMs?: number;
  batchSize?: number;
  maxRetries?: number;
}

export class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private updateQueue: UpdateQueue;
  private crossTabSync: CrossTabSync;
  private offlineQueue: OfflineQueue;
  private connectionState: ConnectionState = 'connecting';
  private config: RealtimeManagerConfig;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(config: RealtimeManagerConfig) {
    this.config = config;
    this.updateQueue = new UpdateQueue({
      throttleMs: config.throttleMs || 500,
      batchSize: config.batchSize || 10,
    });
    this.crossTabSync = new CrossTabSync();
    this.offlineQueue = new OfflineQueue();
    
    // Bind methods to preserve context
    this.handleBookingChange = this.handleBookingChange.bind(this);
    this.handleExpenseChange = this.handleExpenseChange.bind(this);
    this.onNetworkStatusChange = this.onNetworkStatusChange.bind(this);
  }

  async initialize() {
    try {
      // Initialize subsystems
      await Promise.all([
        this.crossTabSync.initialize(),
        this.offlineQueue.initialize(),
      ]);

      // Set up real-time channels
      this.setupBookingsChannel();
      this.setupExpensesChannel();
      
      // Initialize cross-tab communication
      this.setupCrossTabHandlers();
      
      // Set up connection monitoring
      this.monitorConnection();
      
      // Set up network listeners
      this.setupNetworkListeners();

      console.log('RealtimeManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RealtimeManager:', error);
      this.connectionState = 'error';
      this.notifySubscribers('connection-state', this.connectionState);
    }
  }

  private setupBookingsChannel() {
    const channelName = `bookings-${this.config.propertyId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `property_id=eq.${this.config.propertyId}`
        },
        this.handleBookingChange
      )
      .subscribe((status) => {
        console.log(`Bookings channel status: ${status}`);
        this.updateConnectionState(status);
      });
    
    this.channels.set('bookings', channel);
  }

  private setupExpensesChannel() {
    const channelName = `expenses-${this.config.propertyId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `property_id=eq.${this.config.propertyId}`
        },
        this.handleExpenseChange
      )
      .subscribe((status) => {
        console.log(`Expenses channel status: ${status}`);
        this.updateConnectionState(status);
      });
    
    this.channels.set('expenses', channel);
  }

  private handleBookingChange(payload: RealtimePostgresChangesPayload<any>) {
    console.log('Booking change detected:', payload);
    
    const update: DataUpdate = {
      type: 'booking',
      event: payload.eventType,
      data: payload.new || payload.old,
      timestamp: new Date()
    };

    // Add to update queue for throttled processing
    this.updateQueue.add(update);
    
    // Notify UI components immediately for loading states
    this.notifySubscribers('booking-update-start', { event: payload.eventType });
    
    // Sync across tabs
    this.crossTabSync.broadcast('data-update', update);
    
    // Process the update
    this.processDataUpdate(update);
  }

  private handleExpenseChange(payload: RealtimePostgresChangesPayload<any>) {
    console.log('Expense change detected:', payload);
    
    const update: DataUpdate = {
      type: 'expense',
      event: payload.eventType,
      data: payload.new || payload.old,
      timestamp: new Date()
    };

    // Add to update queue for throttled processing
    this.updateQueue.add(update);
    
    // Notify UI components
    this.notifySubscribers('expense-update-start', { event: payload.eventType });
    
    // Sync across tabs
    this.crossTabSync.broadcast('data-update', update);
    
    // Process the update
    this.processDataUpdate(update);
  }

  private async processDataUpdate(update: DataUpdate) {
    try {
      // Invalidate relevant caches based on update type
      const cacheKeys = this.getCacheKeysForUpdate(update);
      this.invalidateCaches(cacheKeys);
      
      // Notify subscribers with processed update
      this.notifySubscribers(`${update.type}-update`, {
        ...update,
        processed: true,
        timestamp: new Date()
      });

      // Update last updated timestamp
      this.notifySubscribers('last-updated', new Date());
      
    } catch (error) {
      console.error('Error processing data update:', error);
      this.notifySubscribers('update-error', { update, error });
    }
  }

  private getCacheKeysForUpdate(update: DataUpdate): string[] {
    switch (update.type) {
      case 'booking':
        return ['bookings', 'kpis', 'revenue', 'occupancy'];
      case 'expense':
        return ['expenses', 'expense-categories', 'expense-trends'];
      default:
        return [];
    }
  }

  private invalidateCaches(cacheKeys: string[]) {
    // This would integrate with your caching system
    // For now, we'll just notify that caches should be cleared
    this.notifySubscribers('cache-invalidation', cacheKeys);
  }

  private updateConnectionState(status: string) {
    let newState: ConnectionState;
    
    switch (status) {
      case 'SUBSCRIBED':
        newState = 'connected';
        this.reconnectAttempts = 0;
        break;
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        newState = 'error';
        this.attemptReconnect();
        break;
      case 'CLOSED':
        newState = 'disconnected';
        this.attemptReconnect();
        break;
      default:
        newState = 'connecting';
    }

    if (this.connectionState !== newState) {
      this.connectionState = newState;
      console.log(`Connection state changed: ${newState}`);
      this.notifySubscribers('connection-state', newState);
    }
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.connectionState = 'error';
      this.notifySubscribers('connection-state', 'error');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        // Unsubscribe existing channels
        await this.cleanup();
        
        // Reinitialize channels
        this.setupBookingsChannel();
        this.setupExpensesChannel();
        
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  private monitorConnection() {
    // Monitor connection status through existing channels
    // The RealtimeClient API doesn't expose direct connection event handlers
    // We monitor connection through individual channel subscription status
  }

  private setupNetworkListeners() {
    window.addEventListener('online', this.onNetworkStatusChange);
    window.addEventListener('offline', this.onNetworkStatusChange);
  }

  private onNetworkStatusChange() {
    const isOnline = navigator.onLine;
    console.log(`Network status changed: ${isOnline ? 'online' : 'offline'}`);
    
    if (isOnline) {
      // Process any queued offline updates
      this.offlineQueue.processPendingUpdates();
      // Attempt to reconnect if needed
      if (this.connectionState === 'disconnected' || this.connectionState === 'error') {
        this.attemptReconnect();
      }
    } else {
      this.connectionState = 'disconnected';
      this.notifySubscribers('connection-state', 'disconnected');
    }
  }

  private setupCrossTabHandlers() {
    // Handle updates from other tabs
    this.crossTabSync.subscribe('data-update', (update: DataUpdate) => {
      // Process remote updates without broadcasting them again
      this.processDataUpdate(update);
    });

    this.crossTabSync.subscribe('cache-invalidation', (cacheKeys: string[]) => {
      this.invalidateCaches(cacheKeys);
    });
  }

  // Public API methods
  
  public subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    
    this.subscribers.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(event)?.delete(callback);
    };
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public async cleanup() {
    // Clean up channels
    for (const channel of this.channels.values()) {
      await supabase.removeChannel(channel);
    }
    this.channels.clear();
    
    // Clean up network listeners
    window.removeEventListener('online', this.onNetworkStatusChange);
    window.removeEventListener('offline', this.onNetworkStatusChange);
    
    // Clean up subsystems
    await Promise.all([
      this.crossTabSync.cleanup(),
      this.offlineQueue.cleanup(),
    ]);
    
    console.log('RealtimeManager cleaned up');
  }

  private notifySubscribers(event: string, data: any) {
    const eventSubscribers = this.subscribers.get(event);
    if (eventSubscribers) {
      eventSubscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} subscriber:`, error);
        }
      });
    }
  }

  // Queue management methods
  public pauseUpdates() {
    this.updateQueue.pause();
  }

  public resumeUpdates() {
    this.updateQueue.resume();
  }

  public getQueueStatus() {
    return {
      queueLength: this.updateQueue.getQueueLength(),
      isProcessing: this.updateQueue.isProcessing(),
      isPaused: this.updateQueue.isPaused(),
    };
  }
}
