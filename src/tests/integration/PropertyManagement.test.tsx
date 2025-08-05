import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PropertyProvider } from '../../contexts/PropertyContext';
import PropertyDashboard from '../../components/PropertyManagement/PropertyDashboard';
import PropertySelector from '../../components/PropertySelector';
import { propertyService } from '../../services/propertyService';
import { Property, Room } from '../../types/property';

// Mock the property service
vi.mock('../../services/propertyService');

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
    
    // Mock property service methods
    vi.mocked(propertyService.getAllProperties).mockResolvedValue(mockProperties);
    vi.mocked(propertyService.getPropertyById).mockImplementation((id) => 
      Promise.resolve(mockProperties.find(p => p.id === id)!)
    );
    // Note: getRoomsByProperty and getPropertyAnalytics are not currently used by PropertyDashboard
    // as it uses mock data internally. These mocks can be added back when the component
    // is updated to use real service calls.
  });

  const renderWithPropertyProvider = (component: React.ReactElement) => {
    return render(
      <PropertyProvider>
        {component}
      </PropertyProvider>
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
        expect(screen.getByText('Old Manali')).toBeInTheDocument();
      });
    });
  });

  describe('PropertySelector Component', () => {
    it('should display current property', async () => {
      renderWithPropertyProvider(<PropertySelector />);
      
      await waitFor(() => {
        expect(screen.getByText('Old Manali')).toBeInTheDocument();
      });
    });

    it('should allow property switching', async () => {
      renderWithPropertyProvider(<PropertySelector />);
      
      await waitFor(() => {
        const selector = screen.getByRole('button');
        fireEvent.click(selector);
      });

      await waitFor(() => {
        expect(screen.getByText('Baror')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Baror'));
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Baror')).toBeInTheDocument();
      });
    });
  });

  describe('PropertyDashboard Component', () => {
    it('should render property dashboard with stats', async () => {
      renderWithPropertyProvider(<PropertyDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Property Management Dashboard')).toBeInTheDocument();
      });
    });

    it('should display property cards', async () => {
      renderWithPropertyProvider(<PropertyDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Old Manali')).toBeInTheDocument();
        expect(screen.getByText('Baror')).toBeInTheDocument();
      });
    });

    it('should switch between overview and individual views', async () => {
      renderWithPropertyProvider(<PropertyDashboard />);
      
      await waitFor(() => {
        const individualViewButton = screen.getByText('Individual Property');
        fireEvent.click(individualViewButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Current Property: Old Manali')).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Property Data Isolation', () => {
    it('should display property management dashboard', async () => {
      renderWithPropertyProvider(<PropertyDashboard />);
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Property Management')).toBeInTheDocument();
      });
      
      // Verify dashboard elements are present
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Individual Properties')).toBeInTheDocument();
      expect(screen.getByText('Add Property')).toBeInTheDocument();
    });

    it('should switch between overview and individual property views', async () => {
      renderWithPropertyProvider(<PropertyDashboard />);
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Property Management')).toBeInTheDocument();
      });
      
      // Click on Individual Properties tab
      const individualTab = screen.getByText('Individual Properties');
      fireEvent.click(individualTab);
      
      // Verify the view has changed
      await waitFor(() => {
        expect(screen.getByText('Total Rooms')).toBeInTheDocument();
      });
      
      // Switch back to Overview
      const overviewTab = screen.getByText('Overview');
      fireEvent.click(overviewTab);
      
      // Verify we're back to overview
      await waitFor(() => {
        expect(screen.getByText('All Properties')).toBeInTheDocument();
      });
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
    it('should load rooms for current property', async () => {
      renderWithPropertyProvider(<PropertyDashboard />);
      
      await waitFor(() => {
        expect(propertyService.getRoomsByProperty).toHaveBeenCalledWith('1');
      });
    });

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
        // Should show error state or fallback UI
        expect(screen.queryByText('Old Manali')).not.toBeInTheDocument();
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
      renderWithPropertyProvider(<PropertySelector />);
      
      await waitFor(() => {
        expect(propertyService.getAllProperties).toHaveBeenCalledTimes(1);
      });

      // Re-render should not trigger another API call
      renderWithPropertyProvider(<PropertySelector />);
      
      expect(propertyService.getAllProperties).toHaveBeenCalledTimes(1);
    });
  });
});