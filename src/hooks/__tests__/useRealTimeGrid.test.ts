import { renderHook, act } from '@testing-library/react';
import { useRealTimeGrid } from '../useRealTimeGrid';

// Mock Supabase
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockOn = jest.fn();
const mockChannel = {
  on: mockOn.mockReturnThis(),
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe
};

jest.mock('../../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => mockChannel)
  }
}));

describe('useRealTimeGrid Event-Driven Updates', () => {
  const defaultProps = {
    propertyId: 'test-property',
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    },
    onUpdate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useRealTimeGrid(defaultProps));
    
    expect(result.current.pendingUpdates).toEqual([]);
    expect(result.current.isSubscribed).toBe(false);
  });

  it('should set up subscription on mount', () => {
    renderHook(() => useRealTimeGrid(defaultProps));
    
    expect(mockChannel.on).toHaveBeenCalledWith('postgres_changes', expect.any(Object), expect.any(Function));
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should handle booking INSERT events', () => {
    renderHook(() => useRealTimeGrid(defaultProps));
    
    // Get the booking event handler
    const bookingHandler = mockOn.mock.calls.find(call => 
      call[1]?.table === 'bookings'
    )?.[2];
    
    expect(bookingHandler).toBeDefined();
    
    // Simulate booking insert
    const mockBooking = {
      id: 'booking-1',
      property_id: 'test-property',
      room_no: '101',
      guest_name: 'John Doe',
      check_in: '2024-01-15',
      check_out: '2024-01-17'
    };
    
    act(() => {
      bookingHandler?.({
        eventType: 'INSERT',
        new: mockBooking,
        old: null
      });
    });
    
    expect(defaultProps.onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_created',
      data: expect.objectContaining({
        propertyId: 'test-property',
        bookingId: 'booking-1',
        roomNo: '101'
      })
    }));
  });

  it('should handle room UPDATE events', () => {
    renderHook(() => useRealTimeGrid(defaultProps));
    
    // Get the room event handler
    const roomHandler = mockOn.mock.calls.find(call => 
      call[1]?.table === 'rooms'
    )?.[2];
    
    expect(roomHandler).toBeDefined();
    
    // Simulate room update
    const mockRoom = {
      id: 'room-1',
      property_id: 'test-property',
      room_no: '101',
      base_price: 1500
    };
    
    act(() => {
      roomHandler?.({
        eventType: 'UPDATE',
        new: mockRoom,
        old: { ...mockRoom, base_price: 1200 }
      });
    });
    
    expect(defaultProps.onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'room_updated',
      data: expect.objectContaining({
        propertyId: 'test-property',
        roomNo: '101'
      })
    }));
  });

  it('should track pending updates with timestamps', () => {
    const { result } = renderHook(() => useRealTimeGrid(defaultProps));
    
    // Get the booking event handler
    const bookingHandler = mockOn.mock.calls.find(call => 
      call[1]?.table === 'bookings'
    )?.[2];
    
    const mockBooking = {
      id: 'booking-1',
      property_id: 'test-property',
      room_no: '101',
      guest_name: 'John Doe',
      check_in: '2024-01-15',
      check_out: '2024-01-17'
    };
    
    act(() => {
      bookingHandler?.({
        eventType: 'INSERT',
        new: mockBooking,
        old: null
      });
    });
    
    expect(result.current.pendingUpdates).toHaveLength(1);
    expect(result.current.lastUpdateTime).toBeInstanceOf(Date);
  });

  it('should clear pending updates after timeout', () => {
    const { result } = renderHook(() => useRealTimeGrid(defaultProps));
    
    // Get the booking event handler
    const bookingHandler = mockOn.mock.calls.find(call => 
      call[1]?.table === 'bookings'
    )?.[2];
    
    const mockBooking = {
      id: 'booking-1',
      property_id: 'test-property',
      room_no: '101',
      guest_name: 'John Doe',
      check_in: '2024-01-15',
      check_out: '2024-01-17'
    };
    
    act(() => {
      bookingHandler?.({
        eventType: 'INSERT',
        new: mockBooking,
        old: null
      });
    });
    
    expect(result.current.pendingUpdates).toHaveLength(1);
    
    // Fast forward past the timeout
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(result.current.pendingUpdates).toHaveLength(0);
  });

  it('should send optimistic updates', () => {
    const { result } = renderHook(() => useRealTimeGrid(defaultProps));
    
    const optimisticUpdate = {
      type: 'booking_updated' as const,
      data: { 
        propertyId: 'test-property',
        bookingId: 'booking-1',
        booking: { id: 'booking-1', status: 'confirmed' } as any
      },
      timestamp: new Date().toISOString()
    };
    
    act(() => {
      result.current.sendOptimisticUpdate(optimisticUpdate);
    });
    
    expect(defaultProps.onUpdate).toHaveBeenCalledWith(optimisticUpdate);
    expect(result.current.pendingUpdates).toHaveLength(1);
  });

  it('should properly cleanup on unmount', () => {
    const { unmount } = renderHook(() => useRealTimeGrid(defaultProps));
    
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should prevent updates during cleanup', () => {
    const { unmount } = renderHook(() => useRealTimeGrid(defaultProps));
    
    // Start unmounting
    unmount();
    
    // Get the booking event handler
    const bookingHandler = mockOn.mock.calls.find(call => 
      call[1]?.table === 'bookings'
    )?.[2];
    
    const mockBooking = {
      id: 'booking-1',
      property_id: 'test-property',
      room_no: '101',
      guest_name: 'John Doe',
      check_in: '2024-01-15',
      check_out: '2024-01-17'
    };
    
    // Try to trigger an update after unmount
    act(() => {
      bookingHandler?.({
        eventType: 'INSERT',
        new: mockBooking,
        old: null
      });
    });
    
    // Should not call onUpdate after unmount
    expect(defaultProps.onUpdate).not.toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_created'
    }));
  });
});