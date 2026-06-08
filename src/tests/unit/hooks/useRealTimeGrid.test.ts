import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// A single stable channel object so `.on` calls accumulate across the
// chained `.on(...).on(...).subscribe()` invocations the hook performs.
// Declared via vi.hoisted so the vi.mock factory (hoisted to top) can use it.
const { channelMock, mockSupabase } = vi.hoisted(() => {
  const channelMock: any = {
    on: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn()
  };
  // `.on(...)` is chainable; `.subscribe()` returns a truthy channel so the
  // hook's subscriptionRef is set (drives `isSubscribed`).
  channelMock.on.mockReturnValue(channelMock);
  channelMock.subscribe.mockReturnValue(channelMock);
  return {
    channelMock,
    mockSupabase: { channel: vi.fn(() => channelMock) }
  };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase
}));

import { useRealTimeGrid } from '../../../hooks/useRealTimeGrid';

const getHandler = (table: 'bookings' | 'rooms') => {
  const call = channelMock.on.mock.calls.find(c => c[1]?.table === table);
  return call?.[2] as ((payload: any) => void) | undefined;
};

describe('useRealTimeGrid', () => {
  const mockDateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  };
  const mockPropertyId = 'test-property-id';

  beforeEach(() => {
    vi.clearAllMocks();
    channelMock.on.mockReturnValue(channelMock);
    channelMock.subscribe.mockReturnValue(channelMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should initialize with empty pending updates and no last update', () => {
    const { result } = renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId })
    );

    expect(result.current.pendingUpdates).toEqual([]);
    expect(result.current.lastUpdateTime).toBeNull();
  });

  it('should expose isSubscribed reflecting the subscription ref', () => {
    // `isSubscribed` is derived from a ref, so the value returned on the
    // initial render (before the mount effect commits the subscription) is
    // false. This documents the hook's current observable behavior.
    const { result } = renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId })
    );

    expect(result.current.isSubscribed).toBe(false);
  });

  it('should set up Supabase subscription on mount', () => {
    renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId })
    );

    expect(mockSupabase.channel).toHaveBeenCalledWith(`grid_updates_${mockPropertyId}`);
    expect(channelMock.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `property_id=eq.${mockPropertyId}`
      }),
      expect.any(Function)
    );
    expect(channelMock.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `property_id=eq.${mockPropertyId}`
      }),
      expect.any(Function)
    );
    expect(channelMock.subscribe).toHaveBeenCalled();
  });

  it('should handle booking INSERT (created) events', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId, onUpdate })
    );

    const bookingData = {
      id: 'booking-1',
      property_id: mockPropertyId,
      guest_name: 'John Doe',
      check_in: '2024-01-02',
      check_out: '2024-01-04',
      room_no: '101'
    };

    act(() => {
      getHandler('bookings')?.({ eventType: 'INSERT', new: bookingData, old: null });
    });

    expect(result.current.pendingUpdates).toHaveLength(1);
    expect(result.current.pendingUpdates[0].type).toBe('booking_created');
    expect(result.current.pendingUpdates[0].data.booking?.guestName).toBe('John Doe');
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_created',
      data: expect.objectContaining({
        bookingId: 'booking-1',
        propertyId: mockPropertyId,
        roomNo: '101'
      })
    }));
  });

  it('should handle booking UPDATE (updated) events', () => {
    const onUpdate = vi.fn();
    renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId, onUpdate })
    );

    const updatedBooking = {
      id: 'booking-1',
      property_id: mockPropertyId,
      guest_name: 'John Smith',
      check_in: '2024-01-02',
      check_out: '2024-01-04',
      room_no: '101'
    };

    act(() => {
      getHandler('bookings')?.({ eventType: 'UPDATE', new: updatedBooking, old: null });
    });

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ type: 'booking_updated' }));
  });

  it('should handle booking DELETE (deleted) events', () => {
    const onUpdate = vi.fn();
    renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId, onUpdate })
    );

    const bookingData = {
      id: 'booking-1',
      property_id: mockPropertyId,
      room_no: '101'
    };

    act(() => {
      getHandler('bookings')?.({ eventType: 'DELETE', new: null, old: bookingData });
    });

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_deleted',
      data: expect.objectContaining({ bookingId: 'booking-1', roomNo: '101' })
    }));
  });

  it('should handle room UPDATE events', () => {
    const onUpdate = vi.fn();
    renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId, onUpdate })
    );

    const roomData = {
      id: 'room-1',
      property_id: mockPropertyId,
      room_no: '101',
      base_price: 1500
    };

    act(() => {
      getHandler('rooms')?.({ eventType: 'UPDATE', new: roomData, old: { ...roomData, base_price: 1200 } });
    });

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'room_updated',
      data: expect.objectContaining({ propertyId: mockPropertyId, roomNo: '101' })
    }));
  });

  it('should ignore bookings outside the active date range', () => {
    const onUpdate = vi.fn();
    renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId, onUpdate })
    );

    const inRange = {
      id: 'booking-1',
      property_id: mockPropertyId,
      guest_name: 'John Doe',
      check_in: '2024-01-02',
      check_out: '2024-01-04',
      room_no: '101'
    };
    const outOfRange = {
      id: 'booking-2',
      property_id: mockPropertyId,
      guest_name: 'Jane Doe',
      check_in: '2024-03-01',
      check_out: '2024-03-03',
      room_no: '102'
    };

    act(() => {
      const handler = getHandler('bookings')!;
      handler({ eventType: 'INSERT', new: inRange, old: null });
      handler({ eventType: 'INSERT', new: outOfRange, old: null });
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_created',
      data: expect.objectContaining({ bookingId: 'booking-1' })
    }));
  });

  it('should track pending updates and expose a numeric lastUpdateTime', () => {
    const { result } = renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId })
    );

    act(() => {
      getHandler('bookings')?.({
        eventType: 'INSERT',
        new: {
          id: 'booking-1',
          property_id: mockPropertyId,
          guest_name: 'John Doe',
          check_in: '2024-01-15',
          check_out: '2024-01-17',
          room_no: '101'
        },
        old: null
      });
    });

    expect(result.current.pendingUpdates).toHaveLength(1);
    expect(typeof result.current.lastUpdateTime).toBe('number');
  });

  it('should clear pending updates after the timeout', () => {
    const { result } = renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId })
    );

    act(() => {
      getHandler('bookings')?.({
        eventType: 'INSERT',
        new: {
          id: 'booking-1',
          property_id: mockPropertyId,
          guest_name: 'John Doe',
          check_in: '2024-01-15',
          check_out: '2024-01-17',
          room_no: '101'
        },
        old: null
      });
    });

    expect(result.current.pendingUpdates).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.pendingUpdates).toHaveLength(0);
  });

  it('should send optimistic updates and notify onUpdate', () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId, onUpdate })
    );

    const optimisticUpdate = {
      type: 'booking_updated' as const,
      data: {
        propertyId: mockPropertyId,
        bookingId: 'booking-1',
        booking: { id: 'booking-1', status: 'confirmed' } as any
      },
      timestamp: new Date().toISOString()
    };

    act(() => {
      result.current.sendOptimisticUpdate(optimisticUpdate);
    });

    expect(onUpdate).toHaveBeenCalledWith(optimisticUpdate);
    expect(result.current.pendingUpdates).toHaveLength(1);
  });

  it('should cleanup subscription on unmount', () => {
    const { unmount } = renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId })
    );

    unmount();

    expect(channelMock.unsubscribe).toHaveBeenCalled();
  });

  it('should not emit updates after unmount/cleanup', () => {
    const onUpdate = vi.fn();
    const { unmount } = renderHook(() =>
      useRealTimeGrid({ dateRange: mockDateRange, propertyId: mockPropertyId, onUpdate })
    );

    const handler = getHandler('bookings')!;
    unmount();

    act(() => {
      handler({
        eventType: 'INSERT',
        new: {
          id: 'booking-1',
          property_id: mockPropertyId,
          guest_name: 'John Doe',
          check_in: '2024-01-15',
          check_out: '2024-01-17',
          room_no: '101'
        },
        old: null
      });
    });

    expect(onUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'booking_created' }));
  });
});
