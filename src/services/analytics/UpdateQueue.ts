import type { DataUpdate } from './RealtimeManager.ts';

export interface UpdateQueueConfig {
  throttleMs: number;
  batchSize: number;
  maxQueueSize?: number;
}

export interface AggregatedUpdate {
  type: string;
  entities: Map<string, DataUpdate>;
  timestamp: Date;
}

export class UpdateQueue {
  private queue: DataUpdate[] = [];
  private processing = false;
  private paused = false;
  private config: UpdateQueueConfig;
  private processingTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: UpdateQueueConfig) {
    this.config = {
      maxQueueSize: 100,
      ...config,
    };
  }

  add(update: DataUpdate): boolean {
    // Check queue size limit
    if (this.queue.length >= (this.config.maxQueueSize || 100)) {
      console.warn('Update queue at maximum capacity, dropping oldest updates');
      this.queue.shift(); // Remove oldest update
    }

    this.queue.push(update);
    
    // Start processing if not already processing or paused
    if (!this.processing && !this.paused) {
      this.scheduleProcessing();
    }

    return true;
  }

  private scheduleProcessing() {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }

    this.processingTimeout = setTimeout(() => {
      this.processQueue();
    }, this.config.throttleMs);
  }

  private async processQueue() {
    if (this.processing || this.paused || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    try {
      // Take a batch of updates to process
      const batch = this.queue.splice(0, this.config.batchSize);
      
      // Aggregate updates to reduce redundant processing
      const aggregated = this.aggregateUpdates(batch);
      
      // Process aggregated updates
      await this.applyUpdates(aggregated);
      
      // If there are more updates in queue, schedule next processing
      if (this.queue.length > 0) {
        this.scheduleProcessing();
      }
      
    } catch (error) {
      console.error('Error processing update queue:', error);
    } finally {
      this.processing = false;
    }
  }

  private aggregateUpdates(updates: DataUpdate[]): AggregatedUpdate[] {
    // Group updates by type
    const grouped = updates.reduce((acc, update) => {
      if (!acc[update.type]) {
        acc[update.type] = [];
      }
      acc[update.type].push(update);
      return acc;
    }, {} as Record<string, DataUpdate[]>);

    // Merge updates of the same entity within each type
    return Object.entries(grouped).map(([type, typeUpdates]) => {
      const entities = this.mergeEntityUpdates(typeUpdates);
      return {
        type,
        entities,
        timestamp: new Date()
      };
    });
  }

  private mergeEntityUpdates(updates: DataUpdate[]): Map<string, DataUpdate> {
    const entityMap = new Map<string, DataUpdate>();

    updates.forEach(update => {
      // Use the ID from the data as the entity key, fallback to a composite key
      const entityId = update.data?.id || 
                      update.data?.booking_id || 
                      update.data?.expense_id || 
                      `${update.type}-${Date.now()}-${Math.random()}`;

      const existing = entityMap.get(entityId);
      
      if (existing) {
        // Merge updates for the same entity, keeping the latest timestamp and event
        entityMap.set(entityId, {
          ...existing,
          ...update,
          timestamp: update.timestamp > existing.timestamp ? update.timestamp : existing.timestamp,
          // For conflicting events, prioritize DELETE > UPDATE > INSERT
          event: this.prioritizeEvent(existing.event, update.event)
        });
      } else {
        entityMap.set(entityId, update);
      }
    });

    return entityMap;
  }

  private prioritizeEvent(existing: string, incoming: string): 'INSERT' | 'UPDATE' | 'DELETE' {
    const priority = { DELETE: 3, UPDATE: 2, INSERT: 1 };
    const existingPriority = priority[existing as keyof typeof priority] || 1;
    const incomingPriority = priority[incoming as keyof typeof priority] || 1;
    
    return existingPriority >= incomingPriority ? 
      existing as 'INSERT' | 'UPDATE' | 'DELETE' : 
      incoming as 'INSERT' | 'UPDATE' | 'DELETE';
  }

  private async applyUpdates(aggregatedUpdates: AggregatedUpdate[]) {
    for (const aggregatedUpdate of aggregatedUpdates) {
      try {
        await this.processAggregatedUpdate(aggregatedUpdate);
      } catch (error) {
        console.error(`Error processing ${aggregatedUpdate.type} updates:`, error);
      }
    }
  }

  private async processAggregatedUpdate(aggregatedUpdate: AggregatedUpdate) {
    const { type, entities } = aggregatedUpdate;
    
    console.log(`Processing ${entities.size} ${type} updates`);
    
    // Convert Map to array for easier processing
    const updates = Array.from(entities.values());
    
    // Process based on update type
    switch (type) {
      case 'booking':
        await this.processBookingUpdates(updates);
        break;
      case 'expense':
        await this.processExpenseUpdates(updates);
        break;
      default:
        console.warn(`Unknown update type: ${type}`);
    }
  }

  private async processBookingUpdates(updates: DataUpdate[]) {
    // Group by event type for efficient processing
    const byEvent = updates.reduce((acc, update) => {
      if (!acc[update.event]) {
        acc[update.event] = [];
      }
      acc[update.event].push(update);
      return acc;
    }, {} as Record<string, DataUpdate[]>);

    // Process each event type
    for (const [event, eventUpdates] of Object.entries(byEvent)) {
      console.log(`Processing ${eventUpdates.length} booking ${event} events`);
      
      switch (event) {
        case 'INSERT':
          await this.handleBookingInserts(eventUpdates);
          break;
        case 'UPDATE':
          await this.handleBookingUpdates(eventUpdates);
          break;
        case 'DELETE':
          await this.handleBookingDeletes(eventUpdates);
          break;
      }
    }
  }

  private async processExpenseUpdates(updates: DataUpdate[]) {
    // Similar processing for expenses
    const byEvent = updates.reduce((acc, update) => {
      if (!acc[update.event]) {
        acc[update.event] = [];
      }
      acc[update.event].push(update);
      return acc;
    }, {} as Record<string, DataUpdate[]>);

    for (const [event, eventUpdates] of Object.entries(byEvent)) {
      console.log(`Processing ${eventUpdates.length} expense ${event} events`);
      
      switch (event) {
        case 'INSERT':
          await this.handleExpenseInserts(eventUpdates);
          break;
        case 'UPDATE':
          await this.handleExpenseUpdates(eventUpdates);
          break;
        case 'DELETE':
          await this.handleExpenseDeletes(eventUpdates);
          break;
      }
    }
  }

  private async handleBookingInserts(updates: DataUpdate[]) {
    // Handle new bookings - trigger revenue recalculation
    const bookingIds = updates.map(u => u.data?.id).filter(Boolean);
    console.log(`New bookings inserted: ${bookingIds.length}`);
    
    // Emit event for UI to refresh booking-related metrics
    this.emitCacheInvalidation(['bookings', 'revenue', 'occupancy', 'kpis']);
  }

  private async handleBookingUpdates(updates: DataUpdate[]) {
    // Handle booking modifications - check if revenue-impacting fields changed
    const revenueImpactingFields = ['total_amount', 'check_in', 'check_out', 'cancelled', 'status'];
    const hasRevenueImpact = updates.some(update => 
      revenueImpactingFields.some(field => field in update.data)
    );

    if (hasRevenueImpact) {
      this.emitCacheInvalidation(['bookings', 'revenue', 'occupancy', 'kpis']);
    } else {
      this.emitCacheInvalidation(['bookings']);
    }
  }

  private async handleBookingDeletes(_updates: DataUpdate[]) {
    // Handle booking cancellations/deletions
    this.emitCacheInvalidation(['bookings', 'revenue', 'occupancy', 'kpis']);
  }

  private async handleExpenseInserts(_updates: DataUpdate[]) {
    this.emitCacheInvalidation(['expenses', 'expense-categories', 'expense-trends']);
  }

  private async handleExpenseUpdates(updates: DataUpdate[]) {
    const amountImpactingFields = ['amount', 'category_id', 'approval_status'];
    const hasAmountImpact = updates.some(update => 
      amountImpactingFields.some(field => field in update.data)
    );

    if (hasAmountImpact) {
      this.emitCacheInvalidation(['expenses', 'expense-categories', 'expense-trends']);
    } else {
      this.emitCacheInvalidation(['expenses']);
    }
  }

  private async handleExpenseDeletes(_updates: DataUpdate[]) {
    this.emitCacheInvalidation(['expenses', 'expense-categories', 'expense-trends']);
  }

  private emitCacheInvalidation(cacheKeys: string[]) {
    // This would be handled by the RealtimeManager
    // For now, we'll just log it
    console.log('Cache invalidation needed for:', cacheKeys);
  }

  // Public API methods
  
  public pause() {
    this.paused = true;
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
  }

  public resume() {
    this.paused = false;
    if (this.queue.length > 0 && !this.processing) {
      this.scheduleProcessing();
    }
  }

  public clear() {
    this.queue = [];
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public isProcessing(): boolean {
    return this.processing;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      paused: this.paused,
      config: this.config,
    };
  }
}
