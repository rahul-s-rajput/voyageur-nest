import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PropertyService } from '../../../services/propertyService'
import type { Room, RoomType } from '../../../types/property'

// Mock the supabase module
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              or: vi.fn(() => ({
                order: vi.fn(() => ({
                  data: [],
                  error: null
                }))
              }))
            }))
          }))
        }))
      }))
    }))
  },
  getAdminClient: vi.fn()
}))

// Mock RoomBookingService
vi.mock('../../../services/roomBookingService', () => ({
  RoomBookingService: vi.fn().mockImplementation(() => ({
    getRoomAvailability: vi.fn(),
    getBookingsForRoom: vi.fn()
  }))
}))

describe('PropertyService - Room Grid Data', () => {
  let propertyService: PropertyService
  let mockRoomBookingService: any

  beforeEach(() => {
    propertyService = new PropertyService()
    mockRoomBookingService = {
      getRoomAvailability: vi.fn(),
      getBookingsForRoom: vi.fn()
    }
    
    // Mock the dynamic import
    vi.doMock('../../../services/roomBookingService', () => ({
      RoomBookingService: vi.fn().mockImplementation(() => mockRoomBookingService)
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getPropertyRoomsWithBookings', () => {
    const mockPropertyId = 'property-123'
    const mockStartDate = new Date('2024-01-01')
    const mockEndDate = new Date('2024-01-07')

    const mockRooms: Room[] = [
      {
        id: 'room-1',
        roomNumber: '101',
        roomNo: '101',
        roomType: 'deluxe' as RoomType,
        floor: 1,
        basePrice: 5000,
        seasonalPricing: { '2024-01-01': 6000 },
        maxOccupancy: 2,
        amenities: ['wifi', 'tv'],
        isActive: true,
        propertyId: mockPropertyId,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'room-2',
        roomNumber: '102',
        roomNo: '102',
        roomType: 'standard' as RoomType,
        floor: 1,
        basePrice: 4000,
        seasonalPricing: {},
        maxOccupancy: 2,
        amenities: ['wifi'],
        isActive: true,
        propertyId: mockPropertyId,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]

    const mockAvailability = {
      '2024-01-01': { status: 'available', price: 6000 },
      '2024-01-02': { status: 'occupied', price: 6000 }
    }

    const mockBookings = [
      {
        id: 'booking-1',
        propertyId: mockPropertyId,
        propertyName: 'Test Property',
        guestName: 'John Doe',
        roomNo: '101',
        checkIn: '2024-01-02',
        checkOut: '2024-01-04',
        status: 'confirmed',
        totalAmount: 12000
      }
    ]

    const mockPricing = {
      '2024-01-01': 6000,
      '2024-01-02': 6000,
      '2024-01-03': 6000
    }

    beforeEach(() => {
      // Mock getRooms method
      vi.spyOn(propertyService, 'getRooms').mockResolvedValue(mockRooms)
      
      // Mock getRoomPricingForDates method
      vi.spyOn(propertyService, 'getRoomPricingForDates').mockResolvedValue(mockPricing)
      
      // Mock room booking service methods
      mockRoomBookingService.getRoomAvailability.mockResolvedValue(mockAvailability)
      
      // Mock private method getPropertyBookingsForRoom
      vi.spyOn(propertyService as any, 'getPropertyBookingsForRoom').mockResolvedValue(mockBookings)
    })

    it('should return complete room grid data for all rooms', async () => {
      const result = await propertyService.getPropertyRoomsWithBookings(
        mockPropertyId,
        mockStartDate,
        mockEndDate
      )

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        room: mockRooms[0],
        availability: mockAvailability,
        bookings: mockBookings,
        pricing: mockPricing
      })
      expect(result[1]).toEqual({
        room: mockRooms[1],
        availability: mockAvailability,
        bookings: mockBookings,
        pricing: mockPricing
      })
    })

    it('should sort rooms by room number', async () => {
      const unsortedRooms: Room[] = [
        {
          ...mockRooms[1],
          roomNumber: '201',
          roomNo: '201',
          roomType: 'standard' as RoomType,
          floor: 2,
          maxOccupancy: 2,
          amenities: ['wifi'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          ...mockRooms[0],
          roomNumber: '101',
          roomNo: '101',
          roomType: 'deluxe' as RoomType,
          floor: 1,
          maxOccupancy: 2,
          amenities: ['wifi'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          ...mockRooms[0],
          roomNumber: '105',
          roomNo: '105',
          roomType: 'deluxe' as RoomType,
          floor: 1,
          maxOccupancy: 2,
          amenities: ['wifi'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]
      
      vi.spyOn(propertyService, 'getRooms').mockResolvedValue(unsortedRooms)

      const result = await propertyService.getPropertyRoomsWithBookings(
        mockPropertyId,
        mockStartDate,
        mockEndDate
      )

      expect(result[0].room.roomNumber).toBe('101')
      expect(result[1].room.roomNumber).toBe('105')
      expect(result[2].room.roomNumber).toBe('201')
    })

    it('should handle rooms with non-numeric room numbers', async () => {
      const mixedRooms: Room[] = [
        {
          ...mockRooms[0],
          roomNumber: 'Suite-A',
          roomNo: 'Suite-A',
          roomType: 'suite' as RoomType,
          floor: 3,
          maxOccupancy: 2,
          amenities: ['wifi'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          ...mockRooms[1],
          roomNumber: '101',
          roomNo: '101',
          roomType: 'standard' as RoomType,
          floor: 1,
          maxOccupancy: 2,
          amenities: ['wifi'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          ...mockRooms[0],
          roomNumber: 'Penthouse',
          roomNo: 'Penthouse',
          roomType: 'deluxe' as RoomType,
          floor: 5,
          maxOccupancy: 2,
          amenities: ['wifi'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]
      
      vi.spyOn(propertyService, 'getRooms').mockResolvedValue(mixedRooms)

      const result = await propertyService.getPropertyRoomsWithBookings(
        mockPropertyId,
        mockStartDate,
        mockEndDate
      )

      // Should not throw error and return all rooms
      expect(result).toHaveLength(3)
      expect(result.map(r => r.room.roomNumber)).toContain('Suite-A')
      expect(result.map(r => r.room.roomNumber)).toContain('101')
      expect(result.map(r => r.room.roomNumber)).toContain('Penthouse')
    })

    it('should handle individual room processing errors gracefully', async () => {
      // Mock one room to fail
      mockRoomBookingService.getRoomAvailability
        .mockResolvedValueOnce(mockAvailability)
        .mockRejectedValueOnce(new Error('Room service error'))

      const result = await propertyService.getPropertyRoomsWithBookings(
        mockPropertyId,
        mockStartDate,
        mockEndDate
      )

      expect(result).toHaveLength(2)
      
      // First room should have normal data
      expect(result[0].availability).toEqual(mockAvailability)
      
      // Second room should have empty fallback data
      expect(result[1].availability).toEqual({})
      expect(result[1].bookings).toEqual([])
      expect(result[1].pricing).toEqual({})
    })

    it('should throw error when getRooms fails', async () => {
      vi.spyOn(propertyService, 'getRooms').mockRejectedValue(new Error('Database error'))

      await expect(
        propertyService.getPropertyRoomsWithBookings(mockPropertyId, mockStartDate, mockEndDate)
      ).rejects.toThrow('Failed to fetch room grid data: Database error')
    })

    it('should call all required service methods with correct parameters', async () => {
      await propertyService.getPropertyRoomsWithBookings(
        mockPropertyId,
        mockStartDate,
        mockEndDate
      )

      expect(propertyService.getRooms).toHaveBeenCalledWith(mockPropertyId)
      expect(mockRoomBookingService.getRoomAvailability).toHaveBeenCalledTimes(2)
      expect(propertyService.getRoomPricingForDates).toHaveBeenCalledTimes(2)
    })

    it('should generate correct date range for availability calculation', async () => {
      await propertyService.getPropertyRoomsWithBookings(
        mockPropertyId,
        mockStartDate,
        mockEndDate
      )

      // Check that generateDateRange was called with correct dates
      const expectedDates = [
        new Date('2024-01-01'),
        new Date('2024-01-02'),
        new Date('2024-01-03'),
        new Date('2024-01-04'),
        new Date('2024-01-05'),
        new Date('2024-01-06'),
        new Date('2024-01-07')
      ]

      expect(mockRoomBookingService.getRoomAvailability).toHaveBeenCalledWith(
        mockRooms[0].roomNumber,
        expectedDates
      )
    })

    it('should handle empty property (no rooms)', async () => {
      vi.spyOn(propertyService, 'getRooms').mockResolvedValue([])

      const result = await propertyService.getPropertyRoomsWithBookings(
        mockPropertyId,
        mockStartDate,
        mockEndDate
      )

      expect(result).toEqual([])
      expect(mockRoomBookingService.getRoomAvailability).not.toHaveBeenCalled()
    })
  })

  describe('generateDateRange', () => {
    it('should generate correct date range', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-03')
      
      // Access private method for testing
      const dateRange = (propertyService as any).generateDateRange(startDate, endDate)
      
      expect(dateRange).toHaveLength(3)
      expect(dateRange[0]).toEqual(new Date('2024-01-01'))
      expect(dateRange[1]).toEqual(new Date('2024-01-02'))
      expect(dateRange[2]).toEqual(new Date('2024-01-03'))
    })

    it('should handle single day range', () => {
      const singleDate = new Date('2024-01-01')
      
      const dateRange = (propertyService as any).generateDateRange(singleDate, singleDate)
      
      expect(dateRange).toHaveLength(1)
      expect(dateRange[0]).toEqual(singleDate)
    })
  })
})