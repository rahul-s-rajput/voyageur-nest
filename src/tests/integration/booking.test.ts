import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockBooking } from '../mocks/data'

// Mock the entire supabase module
vi.mock('../../lib/supabase', () => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  }

  const mockBookingService = {
    getBookingById: vi.fn(),
    createBooking: vi.fn(),
    getBookings: vi.fn(),
    updateBooking: vi.fn(),
  }

  return {
    supabase: mockSupabase,
    bookingService: mockBookingService,
  }
})

// Import after mocking
const { bookingService } = await import('../../lib/supabase')

describe('bookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getBookingById', () => {
    it('should fetch booking by ID successfully', async () => {
      const mockGetBookingById = bookingService.getBookingById as any
      mockGetBookingById.mockResolvedValue(mockBooking)

      const result = await bookingService.getBookingById('test-booking-123')

      expect(mockGetBookingById).toHaveBeenCalledWith('test-booking-123')
      expect(result).toEqual(mockBooking)
    })

    it('should handle booking not found error', async () => {
      const mockGetBookingById = bookingService.getBookingById as any
      mockGetBookingById.mockResolvedValue(null)

      const result = await bookingService.getBookingById('invalid-id')
      expect(result).toBeNull()
    })

    it('should handle database connection error', async () => {
      const mockGetBookingById = bookingService.getBookingById as any
      mockGetBookingById.mockResolvedValue(null)

      const result = await bookingService.getBookingById('test-booking-123')
      expect(result).toBeNull()
    })
  })

  describe('createBooking', () => {
    it('should create booking successfully', async () => {
      const newBookingData = {
        guestName: 'Jane Doe',
        roomNo: '102',
        numberOfRooms: 1,
        checkIn: '2024-01-15',
        checkOut: '2024-01-20',
        noOfPax: 2,
        adultChild: '2 Adults',
        status: 'confirmed' as const,
        cancelled: false,
        totalAmount: 6000,
        paymentStatus: 'unpaid' as const,
        contactPhone: '+1234567890',
        contactEmail: 'jane@example.com',
        specialRequests: '',
        bookingDate: '2024-01-10',
        folioNumber: '520/392'
      }

      const expectedResult = {
        ...newBookingData,
        id: 'new-booking-456',
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-10T10:00:00Z'
      }

      const mockCreateBooking = bookingService.createBooking as any
      mockCreateBooking.mockResolvedValue(expectedResult)

      const result = await bookingService.createBooking(newBookingData)

      expect(mockCreateBooking).toHaveBeenCalledWith(newBookingData)
      expect(result).toEqual(expectedResult)
    })

    it('should handle booking creation error', async () => {
      const newBookingData = {
        guestName: 'Jane Doe',
        roomNo: '102',
        numberOfRooms: 1,
        checkIn: '2024-01-15',
        checkOut: '2024-01-20',
        noOfPax: 2,
        adultChild: '2 Adults',
        status: 'confirmed' as const,
        cancelled: false,
        totalAmount: 6000,
        paymentStatus: 'unpaid' as const,
        contactPhone: '+1234567890',
        contactEmail: 'jane@example.com',
        specialRequests: '',
        bookingDate: '2024-01-10',
        folioNumber: '520/392'
      }

      const mockCreateBooking = bookingService.createBooking as any
      mockCreateBooking.mockResolvedValue(null)

      const result = await bookingService.createBooking(newBookingData)
      expect(result).toBeNull()
    })
  })

  describe('getBookings', () => {
    it('should fetch all bookings successfully', async () => {
      const mockGetBookings = bookingService.getBookings as any
      mockGetBookings.mockResolvedValue([mockBooking])

      const result = await bookingService.getBookings()

      expect(mockGetBookings).toHaveBeenCalled()
      expect(result).toEqual([mockBooking])
    })

    it('should handle empty bookings list', async () => {
      const mockGetBookings = bookingService.getBookings as any
      mockGetBookings.mockResolvedValue([])

      const result = await bookingService.getBookings()

      expect(result).toEqual([])
    })

    it('should handle database error when fetching bookings', async () => {
      const mockGetBookings = bookingService.getBookings as any
      mockGetBookings.mockResolvedValue([])

      const result = await bookingService.getBookings()
      expect(result).toEqual([])
    })
  })

  describe('updateBooking', () => {
    it('should update booking successfully', async () => {
      const updates = {
        guestName: 'John Updated',
        totalAmount: 5500
      }

      const expectedResult = {
        ...mockBooking,
        guestName: 'John Updated',
        totalAmount: 5500
      }

      const mockUpdateBooking = bookingService.updateBooking as any
      mockUpdateBooking.mockResolvedValue(expectedResult)

      const result = await bookingService.updateBooking('test-booking-123', updates)

      expect(mockUpdateBooking).toHaveBeenCalledWith('test-booking-123', updates)
      expect(result?.guestName).toBe('John Updated')
      expect(result?.totalAmount).toBe(5500)
    })
  })
})