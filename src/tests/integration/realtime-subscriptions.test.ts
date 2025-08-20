import { RealtimeManager } from '../../services/analytics/RealtimeManager';
import { supabase } from '../../lib/supabase';

// Mock Supabase for integration tests
jest.mock('../../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn(),
    realtime: {
      onOpen: jest.fn(),
      onClose: jest.fn(),
      onError: jest.fn(),
    }
  }
}));

describe('Realtime Subscriptions Integration', () => {
  let realtimeManager: RealtimeManager;
  let mockChannel: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock channel
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    };
    
    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);
    
    realtimeManager = new RealtimeManager({
      propertyId: 'test-property-123',
      throttleMs: 100,
    });
  });

  afterEach(async () => {
    await realtimeManager.cleanup();
  });

  describe('channel setup', () => {
    it('should create channels for bookings and expenses', async () => {
      await realtimeManager.initialize();

      expect(supabase.channel).toHaveBeenCalledWith('bookings-test-property-123');
      expect(supabase.channel).toHaveBeenCalledWith('expenses-test-property-123');
      expect(mockChannel.on).toHaveBeenCalledTimes(2);
    });

    it('should set up postgres_changes listeners correctly', async () => {
      await realtimeManager.initialize();

      // Check booking channel setup
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: 'property_id=eq.test-property-123'
        },
        expect.any(Function)
      );

      // Check expense channel setup
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: 'property_id=eq.test-property-123'
        },
        expect.any(Function)
      );
    });

    it('should subscribe to channels with status callback', async () => {
      await realtimeManager.initialize();

      expect(mockChannel.subscribe).toHaveBeenCalledTimes(2);
      expect(mockChannel.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('real-time event handling', () => {
    it('should handle booking INSERT events', async () => {
      const updateSpy = jest.fn();
      realtimeManager.subscribe('booking-update', updateSpy);

      await realtimeManager.initialize();

      // Get the booking change handler
      const bookingHandler = mockChannel.on.mock.calls.find(
        (call: any) => call[1].table === 'bookings'
      )[2];

      // Simulate INSERT event
      const mockPayload = {
        eventType: 'INSERT',
        new: {
          id: 'booking-123',
          property_id: 'test-property-123',
          guest_name: 'John Doe',
          total_amount: 150.00
        },
        old: null
      };

      bookingHandler(mockPayload);

      // Allow time for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'booking',
          event: 'INSERT',
          processed: true
        })
      );
    });

    it('should handle expense UPDATE events', async () => {
      const updateSpy = jest.fn();
      realtimeManager.subscribe('expense-update', updateSpy);

      await realtimeManager.initialize();

      // Get the expense change handler
      const expenseHandler = mockChannel.on.mock.calls.find(
        (call: any) => call[1].table === 'expenses'
      )[2];

      // Simulate UPDATE event
      const mockPayload = {
        eventType: 'UPDATE',
        new: {
          id: 'expense-456',
          property_id: 'test-property-123',
          amount: 75.00,
          category_id: 'utilities'
        },
        old: {
          id: 'expense-456',
          property_id: 'test-property-123',
          amount: 50.00,
          category_id: 'utilities'
        }
      };

      expenseHandler(mockPayload);

      // Allow time for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expense',
          event: 'UPDATE',
          processed: true
        })
      );
    });

    it('should handle DELETE events', async () => {
      const updateSpy = jest.fn();
      realtimeManager.subscribe('booking-update', updateSpy);

      await realtimeManager.initialize();

      const bookingHandler = mockChannel.on.mock.calls.find(
        (call: any) => call[1].table === 'bookings'
      )[2];

      const mockPayload = {
        eventType: 'DELETE',
        new: null,
        old: {
          id: 'booking-789',
          property_id: 'test-property-123'
        }
      };

      bookingHandler(mockPayload);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'booking',
          event: 'DELETE',
          processed: true
        })
      );
    });
  });

  describe('connection state management', () => {
    it('should update connection state based on subscription status', async () => {
      const connectionSpy = jest.fn();
      realtimeManager.subscribe('connection-state', connectionSpy);

      await realtimeManager.initialize();

      // Get the subscription callback
      const subscriptionCallback = mockChannel.subscribe.mock.calls[0][0];

      // Simulate successful subscription
      subscriptionCallback('SUBSCRIBED');
      expect(connectionSpy).toHaveBeenCalledWith('connected');

      // Simulate error
      subscriptionCallback('CHANNEL_ERROR');
      expect(connectionSpy).toHaveBeenCalledWith('error');

      // Simulate closed
      subscriptionCallback('CLOSED');
      expect(connectionSpy).toHaveBeenCalledWith('disconnected');
    });

    it('should attempt reconnection on errors', async () => {
      jest.useFakeTimers();
      
      await realtimeManager.initialize();

      const subscriptionCallback = mockChannel.subscribe.mock.calls[0][0];

      // Simulate error to trigger reconnection
      subscriptionCallback('CHANNEL_ERROR');

      // Fast-forward time to trigger reconnection
      jest.advanceTimersByTime(1000);

      // Should attempt to create new channels
      expect(supabase.channel).toHaveBeenCalledTimes(4); // 2 initial + 2 reconnect

      jest.useRealTimers();
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate relevant caches for booking changes', async () => {
      const cacheSpy = jest.fn();
      realtimeManager.subscribe('cache-invalidation', cacheSpy);

      await realtimeManager.initialize();

      const bookingHandler = mockChannel.on.mock.calls.find(
        (call: any) => call[1].table === 'bookings'
      )[2];

      bookingHandler({
        eventType: 'INSERT',
        new: { id: 'booking-123' },
        old: null
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(cacheSpy).toHaveBeenCalledWith(['bookings', 'kpis', 'revenue', 'occupancy']);
    });

    it('should invalidate relevant caches for expense changes', async () => {
      const cacheSpy = jest.fn();
      realtimeManager.subscribe('cache-invalidation', cacheSpy);

      await realtimeManager.initialize();

      const expenseHandler = mockChannel.on.mock.calls.find(
        (call: any) => call[1].table === 'expenses'
      )[2];

      expenseHandler({
        eventType: 'UPDATE',
        new: { id: 'expense-456' },
        old: { id: 'expense-456' }
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(cacheSpy).toHaveBeenCalledWith(['expenses', 'expense-categories', 'expense-trends']);
    });
  });

  describe('cleanup', () => {
    it('should remove all channels on cleanup', async () => {
      await realtimeManager.initialize();
      await realtimeManager.cleanup();

      expect(supabase.removeChannel).toHaveBeenCalledTimes(2);
    });

    it('should stop all subscriptions on cleanup', async () => {
      const updateSpy = jest.fn();
      realtimeManager.subscribe('booking-update', updateSpy);

      await realtimeManager.initialize();
      await realtimeManager.cleanup();

      // Simulate event after cleanup - should not trigger
      const bookingHandler = mockChannel.on.mock.calls.find(
        (call: any) => call[1].table === 'bookings'
      )?.[2];

      if (bookingHandler) {
        bookingHandler({
          eventType: 'INSERT',
          new: { id: 'booking-after-cleanup' },
          old: null
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        // Should not have been called after cleanup
        expect(updateSpy).not.toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              id: 'booking-after-cleanup'
            })
          })
        );
      }
    });
  });
});
