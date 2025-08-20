import { UpdateQueue } from '../../../../services/analytics/UpdateQueue';
import { DataUpdate } from '../../../../services/analytics/RealtimeManager';

describe('UpdateQueue', () => {
  let updateQueue: UpdateQueue;

  beforeEach(() => {
    updateQueue = new UpdateQueue({
      throttleMs: 100,
      batchSize: 3,
      maxQueueSize: 10,
    });
  });

  afterEach(() => {
    updateQueue.clear();
  });

  describe('basic functionality', () => {
    it('should add updates to queue', () => {
      const update: DataUpdate = {
        type: 'booking',
        event: 'INSERT',
        data: { id: 'booking-123' },
        timestamp: new Date(),
      };

      const result = updateQueue.add(update);
      expect(result).toBe(true);
      expect(updateQueue.getQueueLength()).toBe(1);
    });

    it('should respect max queue size', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Fill queue to max capacity
      for (let i = 0; i < 12; i++) {
        updateQueue.add({
          type: 'booking',
          event: 'INSERT',
          data: { id: `booking-${i}` },
          timestamp: new Date(),
        });
      }

      expect(updateQueue.getQueueLength()).toBe(10);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Update queue at maximum capacity, dropping oldest updates'
      );

      consoleSpy.mockRestore();
    });

    it('should provide correct status', () => {
      expect(updateQueue.isProcessing()).toBe(false);
      expect(updateQueue.isPaused()).toBe(false);
      expect(updateQueue.getQueueLength()).toBe(0);
    });
  });

  describe('pause/resume functionality', () => {
    it('should pause and resume queue processing', () => {
      updateQueue.pause();
      expect(updateQueue.isPaused()).toBe(true);

      updateQueue.resume();
      expect(updateQueue.isPaused()).toBe(false);
    });

    it('should not process updates when paused', () => {
      updateQueue.pause();

      updateQueue.add({
        type: 'booking',
        event: 'INSERT',
        data: { id: 'booking-123' },
        timestamp: new Date(),
      });

      // Wait for any potential processing
      return new Promise(resolve => {
        setTimeout(() => {
          expect(updateQueue.getQueueLength()).toBe(1);
          resolve(undefined);
        }, 150);
      });
    });
  });

  describe('update aggregation', () => {
    it('should aggregate updates of same entity', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Add multiple updates for same booking
      updateQueue.add({
        type: 'booking',
        event: 'INSERT',
        data: { id: 'booking-123', status: 'pending' },
        timestamp: new Date(),
      });

      updateQueue.add({
        type: 'booking',
        event: 'UPDATE',
        data: { id: 'booking-123', status: 'confirmed' },
        timestamp: new Date(),
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should see aggregated processing
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing')
      );

      consoleSpy.mockRestore();
    });

    it('should prioritize DELETE over other events', () => {
      const mergeMethod = (updateQueue as any).mergeEntityUpdates;
      
      const updates: DataUpdate[] = [
        {
          type: 'booking',
          event: 'INSERT',
          data: { id: 'booking-123' },
          timestamp: new Date(Date.now() - 1000),
        },
        {
          type: 'booking',
          event: 'DELETE',
          data: { id: 'booking-123' },
          timestamp: new Date(),
        },
      ];

      const result = mergeMethod(updates);
      const mergedUpdate = result.get('booking-123');
      
      expect(mergedUpdate?.event).toBe('DELETE');
    });
  });

  describe('stats and monitoring', () => {
    it('should provide accurate stats', () => {
      updateQueue.add({
        type: 'booking',
        event: 'INSERT',
        data: { id: 'booking-123' },
        timestamp: new Date(),
      });

      const stats = updateQueue.getStats();
      expect(stats).toEqual({
        queueLength: 1,
        processing: false,
        paused: false,
        config: expect.any(Object),
      });
    });

    it('should clear queue when requested', () => {
      updateQueue.add({
        type: 'booking',
        event: 'INSERT',
        data: { id: 'booking-123' },
        timestamp: new Date(),
      });

      expect(updateQueue.getQueueLength()).toBe(1);
      
      updateQueue.clear();
      expect(updateQueue.getQueueLength()).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle processing errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock a processing method to throw error
      const originalMethod = (updateQueue as any).processAggregatedUpdate;
      (updateQueue as any).processAggregatedUpdate = jest.fn().mockRejectedValue(
        new Error('Processing failed')
      );

      updateQueue.add({
        type: 'booking',
        event: 'INSERT',
        data: { id: 'booking-123' },
        timestamp: new Date(),
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error processing update queue:',
        expect.any(Error)
      );

      // Restore original method
      (updateQueue as any).processAggregatedUpdate = originalMethod;
      consoleSpy.mockRestore();
    });
  });
});
