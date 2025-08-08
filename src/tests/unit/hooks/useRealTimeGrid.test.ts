import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRealTimeGrid } from '../../../hooks/useRealTimeGrid';

// Mock Supabase
const mockSupabase = {
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn()
  })),
  removeChannel: vi.fn()
};

vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase
}));

describe('useRealTimeGrid', () => {
  const mockDateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-07')
  };
  const mockPropertyId = 'test-property-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useRealTimeGrid({
        dateRange: mockDateRange,
        propertyId: mockPropertyId
      })
    );

    expect(result.current.bookings).toEqual([]);
    expect(result.current.rooms).toEqual([]);
    expect(result.current.connectionStatus).toBe('connecting');
    expect(result.current.pendingUpdates).toEqual([]);
    expect(result.current.lastUpdateTime).toBeNull();
  });

  it('should set up Supabase subscription on mount', () => {
    renderHook(() =>
      useRealTimeGrid({
        dateRange: mockDateRange,
        propertyId: mockPropertyId
      })
    );

    expect(mockSupabase.channel).toHaveBeenCalledWith(`grid_bookings_${mockPropertyId}`);
    expect(mockSupabase.channel().on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `property_id=eq.${mockPropertyId}`
      }),
      expect.any(Function)
    );
    expect(mockSupabase.channel().on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `property_id=eq.${mockPropertyId}`
      }),
      expect.any(Function)
    );
  });

  it('should handle booking created events', () => {
    const mockOnUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealTimeGrid({
        dateRange: mockDateRange,
        propertyId: mockPropertyId,
        onUpdate: mockOnUpdate
      })
    );

    const mockBookingData = {
      id: 'booking-1',
      property_id: mockPropertyId,
      guest_name: 'John Doe',
      check_in: '2024-01-02',
      check_out: '2024-01-04',
      room_no: '101',
      no_of_pax: 2,
      contact_phone: '1234567890',
      special_requests: 'Late checkout'
    };

    // Simulate booking created event
    act(() => {
      const onCallback = mockSupabase.channel().on.mock.calls.find(
        call => call[1].table === 'bookings'
      )[2];
      onCallback({
        eventType: 'INSERT',
        new: mockBookingData,
        old: null
      });
    });

    expect(result.current.pendingUpdates).toHaveLength(1);
    expect(result.current.pendingUpdates[0].type).toBe('booking_created');
    expect(result.current.pendingUpdates[0].data.booking?.guestName).toBe('John Doe');
    expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_created',
      data: expect.objectContaining({
        bookingId: 'booking-1',
        propertyId: mockPropertyId
      })
    }));
  });

  it('should handle booking updated events', () => {
    const mockOnUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealTimeGrid({
        dateRange: mockDateRange,
        propertyId: mockPropertyId,
        onUpdate: mockOnUpdate
      })
    );

    const updatedBooking = {
      id: 'booking-1',
      property_id: mockPropertyId,
      guest_name: 'John Smith',
      check_in: '2024-01-02',
      check_out: '2024-01-04',
      room_no: '101',
      special_requests: 'Early checkin',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T01:00:00Z'
    };

    // Update booking
    act(() => {
      const onCallback = mockSupabase.channel().on.mock.calls.find(
        call => call[1].table === 'bookings'
      )[2];
      onCallback({
        eventType: 'UPDATE',
        new: updatedBooking,
        old: null
      });
    });

    expect(result.current.pendingUpdates).toHaveLength(1);
    expect(result.current.pendingUpdates[0].type).toBe('booking_updated');
    expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_updated'
    }));
  });

  it('should handle booking deleted events', () => {
    const mockOnUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealTimeGrid({
        dateRange: mockDateRange,
        propertyId: mockPropertyId,
        onUpdate: mockOnUpdate
      })
    );

    const bookingData = {
      id: 'booking-1',
      property_id: mockPropertyId,
      guest_name: 'John Doe',
      check_in: '2024-01-02',
      check_out: '2024-01-04',
      room_no: '101'
    };

    // Delete booking
    act(() => {
      const onCallback = mockSupabase.channel().on.mock.calls.find(
        call => call[1].table === 'bookings'
      )[2];
      onCallback({
        eventType: 'DELETE',
        new: null,
        old: bookingData
      });
    });

    expect(result.current.pendingUpdates).toHaveLength(1);
    expect(result.current.pendingUpdates[0].type).toBe('booking_deleted');
    expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_deleted'
    }));
  });

  it('should filter bookings by date range', () => {
    const mockOnUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealTimeGrid({
        dateRange: mockDateRange,
        propertyId: mockPropertyId,
        onUpdate: mockOnUpdate
      })
    );

    const bookingInRange = {
      id: 'booking-1',
      property_id: mockPropertyId,
      guest_name: 'John Doe',
      check_in: '2024-01-02',
      check_out: '2024-01-04',
      room_no: '101',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const bookingOutOfRange = {
      id: 'booking-2',
      property_id: mockPropertyId,
      guest_name: 'Jane Doe',
      check_in: '2024-02-01',
      check_out: '2024-02-03',
      room_no: '102',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    act(() => {
      const onCallback = mockSupabase.channel().on.mock.calls.find(
        call => call[1].table === 'bookings'
      )[2];
      
      // Add booking in range
      onCallback({
        eventType: 'INSERT',
        new: bookingInRange,
        old: null
      });
      
      // Add booking out of range - this should be ignored
      onCallback({
        eventType: 'INSERT',
        new: bookingOutOfRange,
        old: null
      });
    });

    // Only the booking in range should generate an update
    expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_created',
      data: expect.objectContaining({
        bookingId: 'booking-1'
      })
    }));
  });

  it('should handle optimistic updates', () => {
    const { result } = renderHook(() =>
      useRealTimeGrid({
        dateRange: mockDateRange,
        propertyId: mockPropertyId
      })
    );

    const optimisticUpdate = {
      type: 'booking_created' as const,
      data: {
        bookingId: 'temp-booking',
        roomNo: 'room-101',
        propertyId: mockPropertyId,
        dateRange: mockDateRange
      },
      timestamp: new Date().toISOString()
    };

    act(() => {
      result.current.applyOptimisticUpdate(optimisticUpdate);
    });

    expect(result.current.pendingUpdates).toHaveLength(1);
    expect(result.current.pendingUpdates[0]).toEqual(optimisticUpdate);
  });

  it('should revert optimistic updates', () => {
    const { result } = renderHook(() =>
      useRealTimeGrid({
        dateRange: mockDateRange,
        propertyId: mockPropertyId
      })
    );

    const optimisticUpdate = {
      type: 'booking_created' as const,
      data: {
        bookingId: 'temp-booking',
        roomNo: 'room-101',
        propertyId: mockPropertyId,
        dateRange: mockDateRange
      },
      timestamp: new Date().toISOString()
    };

    act(() => {
      result.current.applyOptimisticUpdate(optimisticUpdate);
    });

    expect(result.current.pendingUpdates).toHaveLength(1);

    act(() => {
      result.current.revertOptimisticUpdate('booking_created_temp-booking_' + Date.now());
    });

    expect(result.current.pendingUpdates).toHaveLength(0);
  });

  it('should clear all pending updates', () => {
    const { result } = renderHook(() =>
      useRealTimeGrid({
        dateRange: mockDateRange,
        propertyId: mockPropertyId
      })
    );

    const update1 = {
      type: 'booking_created' as const,
      data: { bookingId: 'booking-1', roomNo: 'room-101', propertyId: mockPropertyId, dateRange: mockDateRange },
      timestamp: new Date().toISOString()
    };

    const update2 = {
      type: 'booking_updated' as const,
      data: { bookingId: 'booking-2', roomNo: 'room-102', propertyId: mockPropertyId, dateRange: mockDateRange },
      timestamp: new Date().toISOString()
    };

    act(() => {
      result.current.applyOptimisticUpdate(update1);
      result.current.applyOptimisticUpdate(update2);
    });

    expect(result.current.pendingUpdates).toHaveLength(2);

    act(() => {
      result.current.clearPendingUpdates();
    });

    expect(result.current.pendingUpdates).toHaveLength(0);
  });

  it('should update connection status', () => {
    const { result } = renderHook(() =>
      useRealTimeGrid({
        dateRange: mockDateRange,
        propertyId: mockPropertyId
      })
    );

    expect(result.current.connectionStatus).toBe('connecting');

    // Simulate successful subscription
    act(() => {
      const subscribeCallback = mockSupabase.channel().subscribe;
      subscribeCallback.mock.calls[0][0]('SUBSCRIBED');
    });

    expect(result.current.connectionStatus).toBe('connected');
  });

  it('should cleanup subscription on unmount', () => {
    const { unmount } = renderHook(() =>
      useRealTimeGrid({
        dateRange: mockDateRange,
        propertyId: mockPropertyId
      })
    );

    unmount();

    expect(mockSupabase.channel().unsubscribe).toHaveBeenCalled();
    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });
});