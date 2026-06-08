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

// Mock RoomBookingService.
// getPropertyRoomsWithBookings dynamically imports the `roomBookingService`
// SINGLETON (not the class) and calls getBatchRoomAvailability on it, so the
// mock module must export that singleton instance.
const mockRoomBookingService = {
  getBatchRoomAvailability: vi.fn(),
  getBookingsForRoom: vi.fn()
}
vi.mock('../../../services/roomBookingService', () => ({
  RoomBookingService: vi.fn().mockImplementation(() => mockRoomBookingService),
  roomBookingService: mockRoomBookingService
}))

describe('PropertyService - Room Grid Data', () => {
  let propertyService: PropertyService

  beforeEach(() => {
    propertyService = new PropertyService()
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

    // Build batch-shaped (keyed by room number) responses from the per-room
    // fixtures so every room in a test resolves to the same availability/pricing.
    const buildBatchAvailability = (rooms: Room[]) =>
      Object.fromEntries(rooms.map(r => [r.roomNumber, mockAvailability]))
    const buildBatchPricing = (rooms: Room[]) =>
      Object.fromEntries(rooms.map(r => [r.roomNumber, mockPricing]))

    beforeEach(() => {
      mockRoomBookingService.getBatchRoomAvailability.mockReset()
      mockRoomBookingService.getBookingsForRoom.mockReset()

      // Mock getRooms method
      vi.spyOn(propertyService, 'getRooms').mockResolvedValue(mockRooms)

      // Batch availability comes from the roomBookingService singleton.
      mockRoomBookingService.getBatchRoomAvailability.mockResolvedValue(
        buildBatchAvailability(mockRooms)
      )

      // Batch bookings + batch pricing are private PropertyService methods.
      vi.spyOn(propertyService as any, 'getBatchPropertyBookings').mockResolvedValue(mockBookings)
      vi.spyOn(propertyService as any, 'getBatchRoomPricing').mockResolvedValue(
        buildBatchPricing(mockRooms)
      )
    })

    it('should return complete room grid data for all rooms', async () => {
      const result = await propertyService.getPropertyRoomsWithBookings(
        mockPropertyId,
        mockStartDate,
        mockEndDate
      )

      expect(result).toHaveLength(2)
      // Source adds a `roomNo` compatibility field onto each room.
      expect(result[0]).toEqual({
        room: { ...mockRooms[0], roomNo: mockRooms[0].roomNumber },
        availability: mockAvailability,
        // mockBookings is for room '101', and the source filters bookings by
        // roomNo === room.roomNumber, so only room 101 receives them.
        bookings: mockBookings,
        pricing: mockPricing
      })
      expect(result[1]).toEqual({
        room: { ...mockRooms[1], roomNo: mockRooms[1].roomNumber },
        availability: mockAvailability,
        bookings: [],
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

    it('should fall back to empty data for rooms missing from the batch results', async () => {
      // The batch implementation builds the grid from batch maps keyed by room
      // number. If a room is absent from the availability/pricing maps (e.g. it
      // had no data), the source falls back to {} for that room rather than
      // failing the whole request. Provide data only for room 101.
      mockRoomBookingService.getBatchRoomAvailability.mockResolvedValue({
        '101': mockAvailability
      })
      ;(propertyService as any).getBatchRoomPricing.mockResolvedValue({
        '101': mockPricing
      })

      const result = await propertyService.getPropertyRoomsWithBookings(
        mockPropertyId,
        mockStartDate,
        mockEndDate
      )

      expect(result).toHaveLength(2)

      // Room 101 has full data.
      expect(result[0].room.roomNumber).toBe('101')
      expect(result[0].availability).toEqual(mockAvailability)
      expect(result[0].pricing).toEqual(mockPricing)

      // Room 102 is missing from the batch maps -> empty fallback data.
      expect(result[1].room.roomNumber).toBe('102')
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
      // The batch implementation makes ONE call each, passing all room numbers.
      const roomNumbers = mockRooms.map(r => r.roomNumber)
      expect(mockRoomBookingService.getBatchRoomAvailability).toHaveBeenCalledTimes(1)
      expect(mockRoomBookingService.getBatchRoomAvailability).toHaveBeenCalledWith(
        roomNumbers,
        expect.any(Array)
      )
      expect((propertyService as any).getBatchPropertyBookings).toHaveBeenCalledTimes(1)
      expect((propertyService as any).getBatchRoomPricing).toHaveBeenCalledTimes(1)
    })

    it('should generate correct date range for availability calculation', async () => {
      await propertyService.getPropertyRoomsWithBookings(
        mockPropertyId,
        mockStartDate,
        mockEndDate
      )

      // Check that the generated date range (inclusive start..end) is passed
      // through to the batch availability call.
      const expectedDates = [
        new Date('2024-01-01'),
        new Date('2024-01-02'),
        new Date('2024-01-03'),
        new Date('2024-01-04'),
        new Date('2024-01-05'),
        new Date('2024-01-06'),
        new Date('2024-01-07')
      ]

      const roomNumbers = mockRooms.map(r => r.roomNumber)
      expect(mockRoomBookingService.getBatchRoomAvailability).toHaveBeenCalledWith(
        roomNumbers,
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
      expect(mockRoomBookingService.getBatchRoomAvailability).not.toHaveBeenCalled()
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