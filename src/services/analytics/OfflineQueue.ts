export interface PendingUpdate {
  id: string;
  type: 'booking' | 'expense' | 'metrics';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries?: number;
}

export interface OfflineQueueConfig {
  dbName?: string;
  dbVersion?: number;
  maxRetries?: number;
  retryDelay?: number;
  maxQueueSize?: number;
}

export class OfflineQueue {
  private db: IDBDatabase | null = null;
  private config: OfflineQueueConfig;
  private readonly QUEUE_STORE_NAME = 'pending-updates';
  private isProcessing = false;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  constructor(config: OfflineQueueConfig = {}) {
    this.config = {
      dbName: 'analytics-offline-queue',
      dbVersion: 1,
      maxRetries: 3,
      retryDelay: 1000,
      maxQueueSize: 500,
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      this.db = await this.openDatabase();
      this.setupNetworkListeners();
      
      // Process any pending updates on initialization
      if (navigator.onLine) {
        await this.processPendingUpdates();
      }
      
      console.log('OfflineQueue initialized');
    } catch (error) {
      console.error('Failed to initialize OfflineQueue:', error);
      throw error;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName!, this.config.dbVersion!);
      
      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.QUEUE_STORE_NAME)) {
          const store = db.createObjectStore(this.QUEUE_STORE_NAME, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('type', 'type');
          store.createIndex('retryCount', 'retryCount');
        }
      };
    });
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    console.log('Network came online, processing pending updates');
    this.notifySubscribers('network-status', { online: true });
    this.processPendingUpdates();
  }

  private handleOffline(): void {
    console.log('Network went offline');
    this.notifySubscribers('network-status', { online: false });
  }

  async queueUpdate(update: Omit<PendingUpdate, 'id' | 'retryCount'>): Promise<void> {
    if (!this.db) {
      throw new Error('OfflineQueue not initialized');
    }

    // Check queue size limit
    const queueSize = await this.getQueueSize();
    if (queueSize >= (this.config.maxQueueSize || 500)) {
      console.warn('Offline queue at maximum capacity, removing oldest entries');
      await this.removeOldestEntries(50); // Remove 50 oldest entries
    }

    const pendingUpdate: PendingUpdate = {
      ...update,
      id: this.generateUpdateId(),
      retryCount: 0,
      maxRetries: this.config.maxRetries || 3
    };

    const transaction = this.db.transaction([this.QUEUE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.QUEUE_STORE_NAME);
    
    await this.promisifyRequest(store.add(pendingUpdate));
    
    console.log(`Queued offline update: ${pendingUpdate.type} ${pendingUpdate.action}`);
    this.notifySubscribers('update-queued', pendingUpdate);
  }

  async processPendingUpdates(): Promise<void> {
    if (!navigator.onLine || this.isProcessing || !this.db) {
      return;
    }

    this.isProcessing = true;
    
    try {
      const updates = await this.getAllPendingUpdates();
      console.log(`Processing ${updates.length} pending updates`);
      
      if (updates.length === 0) {
        return;
      }

      this.notifySubscribers('processing-start', { count: updates.length });

      for (const update of updates) {
        try {
          await this.syncUpdate(update);
          await this.removeFromQueue(update.id);
          this.notifySubscribers('update-synced', update);
        } catch (error) {
          await this.handleSyncError(update, error);
        }
      }

      this.notifySubscribers('processing-complete', { count: updates.length });
      
    } catch (error) {
      console.error('Error processing pending updates:', error);
      this.notifySubscribers('processing-error', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async getAllPendingUpdates(): Promise<PendingUpdate[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction([this.QUEUE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.QUEUE_STORE_NAME);
    
    // Get all updates ordered by timestamp
    const index = store.index('timestamp');
    const request = index.getAll();
    
    return await this.promisifyRequest(request) || [];
  }

  private async syncUpdate(update: PendingUpdate): Promise<void> {
    const { type, data, action } = update;
    
    switch (type) {
      case 'booking':
        await this.syncBooking(data, action);
        break;
      case 'expense':
        await this.syncExpense(data, action);
        break;
      case 'metrics':
        await this.syncMetrics(data, action);
        break;
      default:
        throw new Error(`Unknown update type: ${type}`);
    }
  }

  private async syncBooking(data: any, action: string): Promise<void> {
    // This would integrate with your booking service
    console.log(`Syncing booking ${action}:`, data);
    
    switch (action) {
      case 'create':
        // await bookingService.create(data);
        break;
      case 'update':
        // await bookingService.update(data.id, data);
        break;
      case 'delete':
        // await bookingService.delete(data.id);
        break;
    }
  }

  private async syncExpense(data: any, action: string): Promise<void> {
    // This would integrate with your expense service
    console.log(`Syncing expense ${action}:`, data);
    
    switch (action) {
      case 'create':
        // await expenseService.create(data);
        break;
      case 'update':
        // await expenseService.update(data.id, data);
        break;
      case 'delete':
        // await expenseService.delete(data.id);
        break;
    }
  }

  private async syncMetrics(data: any, action: string): Promise<void> {
    // This would trigger metric recalculation
    console.log(`Syncing metrics ${action}:`, data);
  }

  private async handleSyncError(update: PendingUpdate, error: any): Promise<void> {
    console.error(`Error syncing update ${update.id}:`, error);
    
    update.retryCount++;
    
    if (update.retryCount >= (update.maxRetries || 3)) {
      console.error(`Max retries exceeded for update ${update.id}, removing from queue`);
      await this.removeFromQueue(update.id);
      this.notifySubscribers('update-failed', { update, error });
      return;
    }

    // Update retry count in database
    await this.updateRetryCount(update);
    
    // Schedule retry with exponential backoff
    const delay = this.config.retryDelay! * Math.pow(2, update.retryCount - 1);
    setTimeout(() => {
      if (navigator.onLine) {
        this.processPendingUpdates();
      }
    }, delay);
    
    this.notifySubscribers('update-retry', { update, delay });
  }

  private async removeFromQueue(id: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.QUEUE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.QUEUE_STORE_NAME);
    
    await this.promisifyRequest(store.delete(id));
  }

  private async updateRetryCount(update: PendingUpdate): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.QUEUE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.QUEUE_STORE_NAME);
    
    await this.promisifyRequest(store.put(update));
  }

  private async getQueueSize(): Promise<number> {
    if (!this.db) return 0;

    const transaction = this.db.transaction([this.QUEUE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.QUEUE_STORE_NAME);
    
    const request = store.count();
    return await this.promisifyRequest(request) || 0;
  }

  private async removeOldestEntries(count: number): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.QUEUE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.QUEUE_STORE_NAME);
    const index = store.index('timestamp');
    
    // Get oldest entries
    const request = index.openCursor();
    let deletedCount = 0;
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && deletedCount < count) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private generateUpdateId(): string {
    return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Public API methods

  public subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    
    this.subscribers.get(event)!.add(callback);
    
    return () => {
      this.subscribers.get(event)?.delete(callback);
    };
  }

  public async getQueueStats() {
    if (!this.db) return null;

    const size = await this.getQueueSize();
    const updates = await this.getAllPendingUpdates();
    
    const byType = updates.reduce((acc, update) => {
      acc[update.type] = (acc[update.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byRetryCount = updates.reduce((acc, update) => {
      acc[update.retryCount] = (acc[update.retryCount] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalSize: size,
      isProcessing: this.isProcessing,
      byType,
      byRetryCount,
      oldestUpdate: updates[0]?.timestamp || null,
      newestUpdate: updates[updates.length - 1]?.timestamp || null
    };
  }

  public async clearQueue(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.QUEUE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.QUEUE_STORE_NAME);
    
    await this.promisifyRequest(store.clear());
    
    console.log('Offline queue cleared');
    this.notifySubscribers('queue-cleared', {});
  }

  public isOnline(): boolean {
    return navigator.onLine;
  }

  public isProcessingQueue(): boolean {
    return this.isProcessing;
  }

  public async cleanup(): Promise<void> {
    // Remove network listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    // Close database
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    // Clear subscribers
    this.subscribers.clear();
    
    console.log('OfflineQueue cleaned up');
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
}
