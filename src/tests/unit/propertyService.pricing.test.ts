import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PropertyService } from '../../services/propertyService';
import { Room, RoomType } from '../../types/property';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }
}));

describe('PropertyService - Room Pricing', () => {
  let propertyService: PropertyService;
  
  beforeEach(() => {
    propertyService = new PropertyService();
    vi.clearAllMocks();
  });

  describe('updateRoomPricing', () => {
    it('should update base price successfully', async () => {
      const mockRoom: Room = {
        id: 'room-1',
        propertyId: 'prop-1',
        roomNumber: '101',
        roomNo: '101',
        roomType: 'deluxe' as RoomType,
        floor: 1,
        maxOccupancy: 2,
        basePrice: 5000,
        seasonalPricing: {},
        amenities: [],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      // Mock the database response
      const { supabase } = await import('../../lib/supabase');
      const mockUpdate = vi.fn().mockResolvedValue({
        data: { ...mockRoom, base_price: 6000 },
        error: null
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockUpdate
            }))
          }))
        }))
      } as any);

      const result = await propertyService.updateRoomPricing('room-1', {
        basePrice: 6000
      });

      expect(result).toBeDefined();
      expect(result.basePrice).toBe(6000);
    });

    it('should update seasonal pricing successfully', async () => {
      const seasonalPricing: Record<string, number> = {
        'peak-season': 7500,
        'off-season': 4000
      };

      const mockRoom: Room = {
        id: 'room-1',
        propertyId: 'prop-1',
        roomNumber: '101',
        roomNo: '101',
        roomType: 'deluxe' as RoomType,
        floor: 1,
        maxOccupancy: 2,
        basePrice: 5000,
        seasonalPricing,
        amenities: [],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const { supabase } = await import('../../lib/supabase');
      const mockUpdate = vi.fn().mockResolvedValue({
        data: { ...mockRoom, seasonal_pricing: seasonalPricing },
        error: null
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockUpdate
            }))
          }))
        }))
      } as any);

      const result = await propertyService.updateRoomPricing('room-1', {
        seasonalPricing
      });

      expect(result).toBeDefined();
      expect(result.seasonalPricing).toEqual(seasonalPricing);
    });

    it('should throw error for invalid base price', async () => {
      await expect(
        propertyService.updateRoomPricing('room-1', { basePrice: -100 })
      ).rejects.toThrow('Base price cannot be negative');
    });
  });

  describe('getRoomPricingForDates', () => {
    it('should return base price when no seasonal pricing applies', async () => {
      const mockRoom: Room = {
        id: 'room-1',
        propertyId: 'prop-1',
        roomNumber: '101',
        roomNo: '101',
        roomType: 'deluxe' as RoomType,
        floor: 1,
        maxOccupancy: 2,
        basePrice: 5000,
        seasonalPricing: {},
        amenities: [],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const { supabase } = await import('../../lib/supabase');
      const mockSelect = vi.fn().mockResolvedValue({
        data: {
          base_price: mockRoom.basePrice,
          seasonal_pricing: mockRoom.seasonalPricing
        },
        error: null
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: mockSelect
              }))
            }))
          }))
        }))
      } as any);

      const pricing = await propertyService.getRoomPricingForDates(
        '101',
        'prop-1',
        [
          new Date('2024-03-01'),
          new Date('2024-03-02'),
          new Date('2024-03-03'),
          new Date('2024-03-04'),
          new Date('2024-03-05')
        ]
      );

      expect(pricing).toEqual({
        '2024-03-01': 5000,
        '2024-03-02': 5000,
        '2024-03-03': 5000,
        '2024-03-04': 5000,
        '2024-03-05': 5000
      });
    });

    it('should apply seasonal pricing when applicable', async () => {
      const seasonalPricing: Record<string, number> = {
        'regular': 7500
      };

      const mockRoom: Room = {
        id: 'room-1',
        propertyId: 'prop-1',
        roomNumber: '101',
        roomNo: '101',
        roomType: 'deluxe' as RoomType,
        floor: 1,
        maxOccupancy: 2,
        basePrice: 5000,
        seasonalPricing,
        amenities: [],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const { supabase } = await import('../../lib/supabase');
      const mockSelect = vi.fn().mockResolvedValue({
        data: {
          base_price: mockRoom.basePrice,
          seasonal_pricing: mockRoom.seasonalPricing
        },
        error: null
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: mockSelect
              }))
            }))
          }))
        }))
      } as any);

      const pricing = await propertyService.getRoomPricingForDates(
        '101',
        'prop-1',
        [
          new Date('2024-03-01'),
          new Date('2024-03-02'),
          new Date('2024-03-03')
        ]
      );

      expect(pricing).toEqual({
        '2024-03-01': 7500,
        '2024-03-02': 7500,
        '2024-03-03': 7500
      });
    });

    it('should use fixed price when specified in seasonal pricing', async () => {
      const seasonalPricing: Record<string, number> = {
        'regular': 8000
      };

      const mockRoom: Room = {
        id: 'room-1',
        propertyId: 'prop-1',
        roomNumber: '101',
        roomNo: '101',
        roomType: 'deluxe' as RoomType,
        floor: 1,
        maxOccupancy: 2,
        basePrice: 5000,
        seasonalPricing,
        amenities: [],
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const { supabase } = await import('../../lib/supabase');
      const mockSelect = vi.fn().mockResolvedValue({
        data: {
          base_price: mockRoom.basePrice,
          seasonal_pricing: mockRoom.seasonalPricing
        },
        error: null
      });
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: mockSelect
              }))
            }))
          }))
        }))
      } as any);

      const pricing = await propertyService.getRoomPricingForDates(
        '101',
        'prop-1',
        [
          new Date('2024-03-01'),
          new Date('2024-03-02'),
          new Date('2024-03-03')
        ]
      );

      expect(pricing).toEqual({
        '2024-03-01': 8000,
        '2024-03-02': 8000,
        '2024-03-03': 8000
      });
    });
  });
});