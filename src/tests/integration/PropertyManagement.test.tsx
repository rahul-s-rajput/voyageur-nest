import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropertyProvider } from '../../contexts/PropertyContext';
import PropertyDashboard from '../../components/PropertyManagement/PropertyDashboard';
import PropertySelector from '../../components/PropertySelector';
import { propertyService } from '../../services/propertyService';
import { Property, Room } from '../../types/property';

// Mock the property service
vi.mock('../../services/propertyService');

// PropertyDashboard.loadDashboardData() fetches all bookings via bookingService to
// compute today's occupancy for the current property. In jsdom the real Supabase
// client cannot reach the network, so we stub just getBookings to resolve with an
// empty list. Everything else from the module is preserved via importOriginal. The
// expense summary it also loads is wrapped in its own try/catch, so an unmocked
// ExpenseService call degrades to an empty summary without failing the render.
vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/supabase')>();
  return {
    ...actual,
    bookingService: {
      ...actual.bookingService,
      getBookings: vi.fn().mockResolvedValue([]),
    },
  };
});

const mockProperties: Property[] = [
  {
    id: 'prop-1',
    name: 'Mountain View Hotel',
    address: '123 Mountain Road',
    location: '123 Mountain Road',
    phone: '+1-555-0123',
    email: 'info@mountainview.com',
    contactPhone: '+1-555-0123',
    contactEmail: 'info@mountainview.com',
    totalRooms: 20,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'prop-2',
    name: 'City Center Inn',
    address: '456 City Street',
    location: '456 City Street',
    phone: '+1-555-0456',
    email: 'contact@citycenter.com',
    contactPhone: '+1-555-0456',
    contactEmail: 'contact@citycenter.com',
    totalRooms: 15,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Convenience aliases used throughout assertions. The PropertyContext selects the
// first loaded property as the current one on mount.
const PRIMARY_PROPERTY = mockProperties[0].name; // 'Mountain View Hotel'
const SECONDARY_PROPERTY = mockProperties[1].name; // 'City Center Inn'

const mockRooms: Room[] = [
  {
    id: '1',
    propertyId: '1',
    roomNumber: '101',
    roomType: 'DELUXE' as any,
    floor: 1,
    maxOccupancy: 2,
    basePrice: 3000,
    amenities: ['WiFi', 'AC', 'TV'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    propertyId: '2',
    roomNumber: '201',
    roomType: 'STANDARD' as any,
    floor: 2,
    maxOccupancy: 2,
    basePrice: 2500,
    amenities: ['WiFi', 'TV'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

describe('Property Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // PropertyContext persists the selected property id in localStorage and restores
    // it on mount. Without clearing it between tests, a property switched in an
    // earlier test leaks into later ones and changes which property becomes current.
    localStorage.clear();

    // Mock property service methods
    vi.mocked(propertyService.getAllProperties).mockResolvedValue(mockProperties);
    vi.mocked(propertyService.getPropertyById).mockImplementation((id) =>
      Promise.resolve(mockProperties.find(p => p.id === id)!)
    );
    // Navigating into the "Room Inventory" section mounts RoomManagement, which
    // fetches rooms on mount. Stub it so that drill-in renders without hitting the
    // network (the auto-mock would otherwise resolve undefined).
    vi.mocked(propertyService.getRoomsByProperty).mockResolvedValue(mockRooms);
    // Note: getRoomsByProperty and getPropertyAnalytics are not currently used by PropertyDashboard
    // as it uses mock data internally. These mocks can be added back when the component
    // is updated to use real service calls.
  });

  const renderWithPropertyProvider = (component: React.ReactElement) => {
    // PropertyDashboard reads KPIs through @tanstack/react-query hooks (useKpiPeriod /
    // useKpiComparison), so a QueryClientProvider is required in the tree.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <PropertyProvider>
          {component}
        </PropertyProvider>
      </QueryClientProvider>
    );
  };

  describe('PropertyProvider Context', () => {
    it('should load properties on initialization', async () => {
      renderWithPropertyProvider(<PropertySelector />);
      
      await waitFor(() => {
        expect(propertyService.getAllProperties).toHaveBeenCalled();
      });
    });

    it('should provide current property information', async () => {
      renderWithPropertyProvider(<PropertySelector />);

      await waitFor(() => {
        expect(screen.getByText(PRIMARY_PROPERTY)).toBeInTheDocument();
      });
    });
  });

  describe('PropertySelector Component', () => {
    it('should display current property', async () => {
      renderWithPropertyProvider(<PropertySelector />);

      await waitFor(() => {
        expect(screen.getByText(PRIMARY_PROPERTY)).toBeInTheDocument();
      });
    });

    it('should allow property switching', async () => {
      renderWithPropertyProvider(<PropertySelector />);

      // Open the dropdown once the current property is shown on the trigger button.
      await waitFor(() => {
        expect(screen.getByText(PRIMARY_PROPERTY)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button'));

      // The secondary property option appears inside the dropdown list.
      await waitFor(() => {
        expect(screen.getByText(SECONDARY_PROPERTY)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(SECONDARY_PROPERTY));

      // After switching, the trigger button reflects the newly selected property.
      await waitFor(() => {
        expect(screen.getByText(SECONDARY_PROPERTY)).toBeInTheDocument();
      });
    });
  });

  describe('PropertyDashboard Component', () => {
    // The dashboard is single-property now: it lands directly on the current
    // property's management hub (no overview grid, no view toggle, no Add Property).
    it('should render the current property', async () => {
      renderWithPropertyProvider(<PropertyDashboard />);

      await waitFor(() => {
        expect(screen.getByText(PRIMARY_PROPERTY)).toBeInTheDocument();
      });
    });

    it("should display today's occupancy stats", async () => {
      renderWithPropertyProvider(<PropertyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Rooms')).toBeInTheDocument();
      });
      expect(screen.getByText('Occupied Today')).toBeInTheDocument();
      expect(screen.getByText('Available Today')).toBeInTheDocument();
    });

    it('should navigate into a management section and back', async () => {
      renderWithPropertyProvider(<PropertyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Room Inventory')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Room Inventory'));

      // Drilling into a section reveals the "Back to Overview" control.
      await waitFor(() => {
        expect(screen.getByText('Back to Overview')).toBeInTheDocument();
      });
    });
  });

  describe('Single-Property Operations Focus', () => {
    it('should surface the operations entry points', async () => {
      renderWithPropertyProvider(<PropertyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Room Inventory')).toBeInTheDocument();
      });
      expect(screen.getByText('Pricing Rules')).toBeInTheDocument();
      expect(screen.getByText('Guest Services')).toBeInTheDocument();
      expect(screen.getByText('Expenses')).toBeInTheDocument();
    });

    it('should not render removed multi-property or stub UI', async () => {
      renderWithPropertyProvider(<PropertyDashboard />);

      await waitFor(() => {
        expect(screen.getByText(PRIMARY_PROPERTY)).toBeInTheDocument();
      });

      // Multi-property scaffolding is gone…
      expect(screen.queryByText('Add Property')).not.toBeInTheDocument();
      expect(screen.queryByText('Individual Properties')).not.toBeInTheDocument();
      expect(screen.queryByText('All Properties')).not.toBeInTheDocument();
      // …and so are the "coming soon" stubs and in-property reports.
      expect(screen.queryByText('Maintenance Schedule')).not.toBeInTheDocument();
      expect(screen.queryByText('Staff Management')).not.toBeInTheDocument();
      expect(screen.queryByText('Reports & Analytics')).not.toBeInTheDocument();
    });
  });

  describe('Property CRUD Operations', () => {
    it('should handle property creation', async () => {
      const newProperty = {
        name: 'New Property',
        address: 'Test Location',
        phone: '+919876161217',
        email: 'test@voyageurnest.com',
        totalRooms: 5,
        isActive: true
      };

      vi.mocked(propertyService.createProperty).mockResolvedValue({
        ...newProperty,
        id: '3',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });

      renderWithPropertyProvider(<PropertyDashboard />);
      
      // This would be triggered by a form submission in the actual UI
      await propertyService.createProperty(newProperty);
      
      expect(propertyService.createProperty).toHaveBeenCalledWith(newProperty);
    });

    it('should handle property updates', async () => {
      const updatedProperty = { ...mockProperties[0], name: 'Updated Old Manali' };
      
      vi.mocked(propertyService.updateProperty).mockResolvedValue(updatedProperty);

      renderWithPropertyProvider(<PropertyDashboard />);
      
      await propertyService.updateProperty('1', updatedProperty);
      
      expect(propertyService.updateProperty).toHaveBeenCalledWith('1', updatedProperty);
    });
  });

  describe('Room Management', () => {
    // NOTE: The previous "should load rooms for current property" test was removed.
    // The current PropertyDashboard no longer fetches rooms via
    // propertyService.getRoomsByProperty(); it derives room counts from each
    // property's `totalRooms` and loads bookings through bookingService. The room
    // service is exercised by the dedicated RoomManagement component instead, so the
    // assertion verified behavior this component no longer has.

    it('should handle room creation', async () => {
      const newRoom = {
        propertyId: '1',
        roomNumber: '102',
        roomType: 'STANDARD' as any,
        floor: 1,
        maxOccupancy: 2,
        basePrice: 2500,
        amenities: ['WiFi'],
        isActive: true
      };

      vi.mocked(propertyService.createRoom).mockResolvedValue({
        ...newRoom,
        id: '3',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });

      await propertyService.createRoom(newRoom);
      
      expect(propertyService.createRoom).toHaveBeenCalledWith(newRoom);
    });
  });

  describe('Error Handling', () => {
    it('should handle property loading errors gracefully', async () => {
      vi.mocked(propertyService.getAllProperties).mockRejectedValue(new Error('Network error'));
      
      renderWithPropertyProvider(<PropertySelector />);
      
      await waitFor(() => {
        // Should show error state or fallback UI (property never renders)
        expect(screen.queryByText(PRIMARY_PROPERTY)).not.toBeInTheDocument();
      });
    });

    it('should handle property switching errors', async () => {
      vi.mocked(propertyService.getPropertyById).mockRejectedValue(new Error('Property not found'));
      
      renderWithPropertyProvider(<PropertySelector />);
      
      // Error should be handled gracefully without crashing the app
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should not reload properties unnecessarily', async () => {
      // A single PropertyProvider loads properties once on mount. Re-rendering the
      // same provider tree must NOT trigger another getAllProperties call.
      // (The previous version mounted two independent providers, which legitimately
      // fetches twice; that was a test bug, not a component regression.)
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <PropertyProvider>
            <PropertySelector />
          </PropertyProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(propertyService.getAllProperties).toHaveBeenCalledTimes(1);
      });

      // Re-render of the same provider should not trigger another API call
      rerender(
        <QueryClientProvider client={queryClient}>
          <PropertyProvider>
            <PropertySelector />
          </PropertyProvider>
        </QueryClientProvider>
      );

      expect(propertyService.getAllProperties).toHaveBeenCalledTimes(1);
    });
  });
});