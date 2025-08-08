import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HomePage } from '../../../components/HomePage';
import { PropertyProvider } from '../../../contexts/PropertyContext';

// Mock the CalendarViewManager component
vi.mock('../../../components/CalendarViewManager', () => {
  const CalendarViewManagerComponent = ({ bookings, onSelectBooking }: any) => (
    <div data-testid="calendar-view-manager">
      <div>Calendar View Manager</div>
      <div>Bookings count: {bookings.length}</div>
      <button onClick={() => onSelectBooking('test-booking')}>
        Select Booking
      </button>
    </div>
  );
  
  return {
    CalendarViewManager: CalendarViewManagerComponent,
    default: CalendarViewManagerComponent,
  };
});

// Mock the BookingList component
vi.mock('../../../components/BookingList', () => {
  const BookingListComponent = ({ bookings, onSelectBooking }: any) => (
    <div data-testid="booking-list">
      <div>Booking List</div>
      <div>Bookings count: {bookings.length}</div>
      <button onClick={() => onSelectBooking('test-booking')}>
        Select Booking
      </button>
    </div>
  );
  
  return {
    BookingList: BookingListComponent,
    default: BookingListComponent,
  };
});

// Mock other components
vi.mock('../../../components/BookingDetails', () => {
  const BookingDetailsComponent = () => <div data-testid="booking-details">Booking Details</div>;
  
  return {
    BookingDetails: BookingDetailsComponent,
    default: BookingDetailsComponent,
  };
});

vi.mock('../../../components/NewBookingModal', () => {
  const NewBookingModalComponent = ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="new-booking-modal">New Booking Modal</div> : null;
  
  return {
    NewBookingModal: NewBookingModalComponent,
    default: NewBookingModalComponent,
  };
});

vi.mock('../../../components/InvoiceForm', () => {
  const InvoiceFormComponent = () => <div data-testid="invoice-form">Invoice Form</div>;
  
  return {
    InvoiceForm: InvoiceFormComponent,
    default: InvoiceFormComponent,
  };
});

// Mock hooks
vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

// Mock Supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
}));

// Mock PropertyContext
vi.mock('../../../contexts/PropertyContext', () => ({
  PropertyProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useProperty: () => ({
    currentProperty: {
      id: 'test-property-id',
      name: 'Test Property',
      address: 'Test Address',
      phone: '123-456-7890',
      email: 'test@example.com',
      totalRooms: 10,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    properties: [],
    switchProperty: vi.fn(),
    isLoading: false,
    error: null
  })
}));

const mockBookings = [
  {
    id: '1',
    guestName: 'John Doe',
    roomNo: '101',
    numberOfRooms: 1,
    checkIn: '2024-01-15',
    checkOut: '2024-01-20',
    noOfPax: 2,
    adultChild: '2 Adults, 0 Children',
    totalAmount: 500,
    paymentStatus: 'paid' as const,
    status: 'confirmed' as const,
    cancelled: false,
    contactEmail: 'john@example.com',
    contactPhone: '123-456-7890',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const defaultProps = {
  bookings: mockBookings,
  viewMode: 'calendar' as const,
  onViewModeChange: vi.fn(),
  onNewBooking: vi.fn(),
  onSelectBooking: vi.fn(),
  onEditBooking: vi.fn(),
  onDeleteBooking: vi.fn(),
  onCreateInvoice: vi.fn(),
  onCancelBooking: vi.fn(),
  onCreateCancellationInvoice: vi.fn(),
};


const renderWithPropertyContext = (props = {}) => {
  const mergedProps = { ...defaultProps, ...props };
  return render(
    <PropertyProvider>
      <HomePage {...mergedProps} />
    </PropertyProvider>
  );
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders HomePage with default view mode', async () => {
    renderWithPropertyContext();
    
    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    });
    
    // Should show calendar view by default (not list)
    expect(screen.getByTestId('calendar-view-manager')).toBeInTheDocument();
    expect(screen.queryByTestId('booking-list')).not.toBeInTheDocument();
  });

  it('toggles between view modes correctly', async () => {
    const mockOnViewModeChange = vi.fn();
    renderWithPropertyContext({ onViewModeChange: mockOnViewModeChange });
    
    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    });

    // Initially should show calendar view (CalendarViewManager)
    expect(screen.getByTestId('calendar-view-manager')).toBeInTheDocument();
    
    // Click List view button
    const listButton = screen.getByRole('button', { name: /list/i });
    fireEvent.click(listButton);
    
    // Should call onViewModeChange with 'list'
    expect(mockOnViewModeChange).toHaveBeenCalledWith('list');
    
    // Click Calendar view button
    const calendarButton = screen.getByRole('button', { name: /calendar/i });
    fireEvent.click(calendarButton);
    
    // Should call onViewModeChange with 'calendar'
    expect(mockOnViewModeChange).toHaveBeenCalledWith('calendar');
  });

  it('shows grid view option in view toggle', async () => {
    renderWithPropertyContext();
    
    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    });

    // Should have Grid button
    expect(screen.getByRole('button', { name: /grid/i })).toBeInTheDocument();
  });

  it('switches to grid view when grid button is clicked', async () => {
    const mockOnViewModeChange = vi.fn();
    renderWithPropertyContext({ onViewModeChange: mockOnViewModeChange });
    
    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    });

    // Click Grid view button
    const gridButton = screen.getByRole('button', { name: /grid/i });
    fireEvent.click(gridButton);
    
    // Should call onViewModeChange with 'grid'
    expect(mockOnViewModeChange).toHaveBeenCalledWith('grid');
  });

  it('handles booking selection correctly', async () => {
    const mockOnSelectBooking = vi.fn();
    renderWithPropertyContext({ onSelectBooking: mockOnSelectBooking });
    
    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    });

    // Click select booking button in calendar view
    const selectButton = screen.getByText('Select Booking');
    fireEvent.click(selectButton);
    
    // Should call onSelectBooking
    expect(mockOnSelectBooking).toHaveBeenCalledWith('test-booking');
  });

  it('handles booking selection from list view', async () => {
    const mockOnSelectBooking = vi.fn();
    renderWithPropertyContext({ 
      viewMode: 'list',
      onSelectBooking: mockOnSelectBooking 
    });
    
    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    });

    // Should show booking list in list view mode
    expect(screen.getByTestId('booking-list')).toBeInTheDocument();

    // Click select booking button in list view
    const selectButton = screen.getByText('Select Booking');
    fireEvent.click(selectButton);
    
    // Should call onSelectBooking
    expect(mockOnSelectBooking).toHaveBeenCalledWith('test-booking');
  });

  it('shows new booking button', async () => {
    renderWithPropertyContext();
    
    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /new booking/i })).toBeInTheDocument();
  });

  it('opens new booking modal when new booking button is clicked', async () => {
    renderWithPropertyContext();
    
    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    });

    const newBookingButton = screen.getByRole('button', { name: /new/i });
    fireEvent.click(newBookingButton);
    
    // Should show the new booking modal
    await waitFor(() => {
      expect(screen.getByTestId('new-booking-modal')).toBeInTheDocument();
    });
  });

  it('displays filter toggles', async () => {
    renderWithPropertyContext();
    
    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    });

    // Should have filter toggle buttons
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
  });

  it('handles responsive design', async () => {
    // Mock window.innerWidth for mobile view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    renderWithPropertyContext();
    
    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    });

    // Component should render without errors on mobile
    expect(screen.getByTestId('calendar-view-manager')).toBeInTheDocument();
  });

  it('maintains view mode state across re-renders', async () => {
    const { rerender } = render(
      <PropertyProvider>
        <HomePage {...defaultProps} viewMode="list" />
      </PropertyProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    });

    // Should show list view
    expect(screen.getByTestId('booking-list')).toBeInTheDocument();

    // Re-render component with calendar view
    rerender(
      <PropertyProvider>
        <HomePage {...defaultProps} viewMode="calendar" />
      </PropertyProvider>
    );
    
    // Should now show calendar view
    await waitFor(() => {
      expect(screen.getByTestId('calendar-view-manager')).toBeInTheDocument();
      expect(screen.queryByTestId('booking-list')).not.toBeInTheDocument();
    });
  });
});