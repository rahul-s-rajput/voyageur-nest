import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to properly hoist the mock function
const mockUseRealTimeGrid = vi.hoisted(() => vi.fn());

// Mock the useRealTimeGrid hook
vi.mock('../../../hooks/useRealTimeGrid', () => ({
  useRealTimeGrid: mockUseRealTimeGrid
}));

// Mock RealTimeIndicators to avoid import issues
vi.mock('../../../components/RoomGridCalendar/RealTimeIndicators', () => ({
  RealTimeStatusBar: ({ connectionStatus, pendingUpdates }: { connectionStatus: string, pendingUpdates: any[] }) => (
    <div data-testid="real-time-status">
      <div>
        {connectionStatus === 'connected' && <span>Live updates active</span>}
        {connectionStatus === 'connecting' && <span>Connecting...</span>}
        {connectionStatus === 'disconnected' && <span>Connection lost - retrying...</span>}
      </div>
      <div>
        {pendingUpdates.length > 0 && <span>{pendingUpdates.length} pending update{pendingUpdates.length !== 1 ? 's' : ''}</span>}
      </div>
    </div>
  )
}));

// Import after mocks
import { GridUpdateManager, useGridUpdateContext } from '../../../components/RoomGridCalendar/GridUpdateManager';

// Test component that uses the context
const TestConsumer: React.FC = () => {
  const context = useGridUpdateContext();
  
  return (
    <div>
      <div data-testid="connection-status">{context.connectionStatus}</div>
      <div data-testid="bookings-count">{context.bookings.length}</div>
      <div data-testid="rooms-count">{context.rooms.length}</div>
      <div data-testid="pending-updates">{context.pendingUpdates.length}</div>
      <div data-testid="last-update">{context.lastUpdateTime ? `Last updated: ${new Date(context.lastUpdateTime).toLocaleTimeString()}` : 'No updates yet'}</div>
      <button 
        onClick={() => context.applyOptimisticUpdate({
          type: 'booking_created',
          data: {
            bookingId: 'test-booking',
            roomNo: 'test-room',
            propertyId: 'test-property',
            dateRange: { start: new Date(), end: new Date() }
          },
          timestamp: new Date().toISOString()
        })}
        data-testid="apply-update"
      >
        Apply Update
      </button>
      <button 
        onClick={() => context.clearPendingUpdates()}
        data-testid="clear-updates"
      >
        Clear Updates
      </button>
    </div>
  );
};

describe('GridUpdateManager', () => {
  const mockProps = {
    dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-07') },
    propertyId: 'test-property',
    onBookingsUpdate: vi.fn(),
    onRoomsUpdate: vi.fn(),
    children: <TestConsumer />
  };

  const mockRealTimeGridReturn = {
    connectionStatus: 'connected' as const,
    pendingUpdates: [],
    lastUpdateTime: null,
    sendOptimisticUpdate: vi.fn(),
    applyOptimisticUpdate: vi.fn(),
    revertOptimisticUpdate: vi.fn(),
    clearPendingUpdates: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRealTimeGrid.mockReturnValue(mockRealTimeGridReturn);
  });

  it('should render children and provide context', () => {
    render(<GridUpdateManager {...mockProps} />);
    
    expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
    expect(screen.getByTestId('bookings-count')).toHaveTextContent('0');
    expect(screen.getByTestId('rooms-count')).toHaveTextContent('0');
    expect(screen.getByTestId('pending-updates')).toHaveTextContent('0');
  });

  it('should render real-time status bar', () => {
    render(<GridUpdateManager {...mockProps} />);
    
    expect(screen.getByText('Live updates active')).toBeInTheDocument();
  });

  it('should call useRealTimeGrid with correct parameters', () => {
    render(<GridUpdateManager {...mockProps} />);
    
    expect(mockUseRealTimeGrid).toHaveBeenCalledWith({
      dateRange: mockProps.dateRange,
      propertyId: mockProps.propertyId,
      onUpdate: expect.any(Function)
    });
  });

  it('should handle optimistic updates through context', () => {
    render(<GridUpdateManager {...mockProps} />);
    
    act(() => {
      fireEvent.click(screen.getByTestId('apply-update'));
    });
    
    expect(mockRealTimeGridReturn.applyOptimisticUpdate).toHaveBeenCalledWith({
      type: 'booking_created',
      data: {
        bookingId: 'test-booking',
        roomNo: 'test-room',
        propertyId: 'test-property',
        dateRange: expect.any(Object)
      },
      timestamp: expect.any(String)
    });
  });

  it('should handle clearing pending updates', () => {
    render(<GridUpdateManager {...mockProps} />);
    
    act(() => {
      fireEvent.click(screen.getByTestId('clear-updates'));
    });
    
    expect(mockRealTimeGridReturn.clearPendingUpdates).toHaveBeenCalled();
  });

  it('should display pending updates indicator when there are updates', () => {
    mockUseRealTimeGrid.mockReturnValue({
      ...mockRealTimeGridReturn,
      pendingUpdates: [
        {
          type: 'booking_created',
          data: {
            bookingId: 'booking-1',
            roomNo: 'room-1',
            propertyId: 'test-property',
            dateRange: { start: new Date(), end: new Date() }
          },
          timestamp: new Date().toISOString()
        }
      ]
    });

    render(<GridUpdateManager {...mockProps} />);
    
    expect(screen.getByText('1 pending update')).toBeInTheDocument();
  });

  it('should display connection status correctly', () => {
    mockUseRealTimeGrid.mockReturnValue({
      ...mockRealTimeGridReturn,
      connectionStatus: 'connecting'
    });

    render(<GridUpdateManager {...mockProps} />);
    
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('should display disconnected status', () => {
    mockUseRealTimeGrid.mockReturnValue({
      ...mockRealTimeGridReturn,
      connectionStatus: 'disconnected'
    });

    render(<GridUpdateManager {...mockProps} />);
    
    expect(screen.getByText('Connection lost - retrying...')).toBeInTheDocument();
  });

  it('should update bookings and rooms data through real-time events', async () => {
    const mockOnBookingsUpdate = vi.fn();
    const mockOnRoomsUpdate = vi.fn();
    
    const propsWithCallbacks = {
      ...mockProps,
      onBookingsUpdate: mockOnBookingsUpdate,
      onRoomsUpdate: mockOnRoomsUpdate
    };

    // Mock the hook to simulate receiving updates
    let capturedOnUpdate: ((event: any) => void) | undefined;
    mockUseRealTimeGrid.mockImplementation(({ onUpdate }: any) => {
      capturedOnUpdate = onUpdate;
      return mockRealTimeGridReturn;
    });

    render(<GridUpdateManager {...propsWithCallbacks} />);
    
    // Simulate a booking update event wrapped in act
    if (capturedOnUpdate) {
      await act(async () => {
        capturedOnUpdate!({
          type: 'booking_created',
          data: {
            booking: {
              id: 'booking-1',
              propertyId: 'test-property',
              guestName: 'John Doe',
              checkIn: '2024-01-02',
              checkOut: '2024-01-04',
              roomNo: '101',
              totalAmount: 5000,
              status: 'confirmed' as const,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          },
          timestamp: new Date().toISOString()
        });
      });
    }
    
    // Wait for state updates to be reflected
    await waitFor(() => {
      expect(mockOnBookingsUpdate).toHaveBeenCalled();
      expect(screen.getByTestId('bookings-count')).toHaveTextContent('1');
    });
  });

  it('should call onOptimisticUpdate callback when provided', () => {
    const mockOnOptimisticUpdate = vi.fn();
    const propsWithCallback = {
      ...mockProps,
      onOptimisticUpdate: mockOnOptimisticUpdate
    };

    render(<GridUpdateManager {...propsWithCallback} />);
    
    act(() => {
      fireEvent.click(screen.getByTestId('apply-update'));
    });
    
    expect(mockOnOptimisticUpdate).toHaveBeenCalledWith({
      type: 'booking_created',
      data: expect.any(Object),
      timestamp: expect.any(String)
    });
  });

  it('should apply custom className', () => {
    const customClassName = 'custom-grid-class';
    const propsWithClassName = {
      ...mockProps,
      className: customClassName
    };

    const { container } = render(<GridUpdateManager {...propsWithClassName} />);
    
    expect(container.firstChild).toHaveClass(`real-time-grid-container ${customClassName}`);
  });

  it('should throw error when useGridUpdateContext is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useGridUpdateContext must be used within a GridUpdateManager');
    
    consoleSpy.mockRestore();
  });

  it('should display last update time when available', () => {
    const lastUpdateTime = Date.now();
    mockUseRealTimeGrid.mockReturnValue({
      ...mockRealTimeGridReturn,
      lastUpdateTime
    });

    render(<GridUpdateManager {...mockProps} />);
    
    expect(screen.getByTestId('last-update')).toHaveTextContent(/Last updated:/);
  });

  it('should display no updates message when lastUpdateTime is null', () => {
    mockUseRealTimeGrid.mockReturnValue({
      ...mockRealTimeGridReturn,
      lastUpdateTime: null
    });

    render(<GridUpdateManager {...mockProps} />);
    
    expect(screen.getByText('No updates yet')).toBeInTheDocument();
  });

  it('should handle multiple pending updates', () => {
    const multiplePendingUpdates = [
      {
        type: 'booking_created',
        data: {
          bookingId: 'booking-1',
          roomNo: 'room-1',
          propertyId: 'test-property',
          dateRange: { start: new Date(), end: new Date() }
        },
        timestamp: new Date().toISOString()
      },
      {
        type: 'booking_updated',
        data: {
          bookingId: 'booking-2',
          roomNo: 'room-2',
          propertyId: 'test-property',
          dateRange: { start: new Date(), end: new Date() }
        },
        timestamp: new Date().toISOString()
      }
    ];

    mockUseRealTimeGrid.mockReturnValue({
      ...mockRealTimeGridReturn,
      pendingUpdates: multiplePendingUpdates
    });

    render(<GridUpdateManager {...mockProps} />);
    
    expect(screen.getByText('2 pending updates')).toBeInTheDocument();
  });

  it('should handle room updates through real-time events', async () => {
    const mockOnRoomsUpdate = vi.fn();
    
    const propsWithCallback = {
      ...mockProps,
      onRoomsUpdate: mockOnRoomsUpdate
    };

    // Mock the hook to capture the onUpdate callback
    let capturedOnUpdate: ((event: any) => void) | undefined;
    mockUseRealTimeGrid.mockImplementation(({ onUpdate }: any) => {
      capturedOnUpdate = onUpdate;
      return mockRealTimeGridReturn;
    });

    render(<GridUpdateManager {...propsWithCallback} />);
    
    // Simulate a room update event wrapped in act
    if (capturedOnUpdate) {
      await act(async () => {
        capturedOnUpdate!({
          type: 'room_updated',
          data: {
            room: {
              id: 'room-1',
              propertyId: 'test-property',
              roomNumber: '101',
              roomNo: '101',
              roomType: 'deluxe' as const,
              maxOccupancy: 2,
              basePrice: 5000,
              amenities: ['wifi', 'ac'],
              isActive: true,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          },
          timestamp: new Date().toISOString()
        });
      });
    }
    
    // Wait for state updates to be reflected
    await waitFor(() => {
      expect(mockOnRoomsUpdate).toHaveBeenCalled();
      expect(screen.getByTestId('rooms-count')).toHaveTextContent('1');
    });
  });
});