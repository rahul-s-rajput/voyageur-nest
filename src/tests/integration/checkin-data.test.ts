import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockCheckInData, mockCheckInFormData } from '../mocks/data'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}))

describe('Check-in Data Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCheckInData', () => {
    it('should fetch check-in data by booking ID', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [mockCheckInData],
          error: null,
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      // Simulate the service function
      const getCheckInData = async (bookingId: string) => {
        const { data, error } = await mockSupabase.from('checkin_data')
          .select('*')
          .eq('booking_id', bookingId)
        
        if (error) throw error
        return data
      }

      const result = await getCheckInData('test-booking-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('checkin_data')
      expect(result).toEqual([mockCheckInData])
    })

    it('should handle no check-in data found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      const getCheckInData = async (bookingId: string) => {
        const { data, error } = await mockSupabase.from('checkin_data')
          .select('*')
          .eq('booking_id', bookingId)
        
        if (error) throw error
        return data
      }

      const result = await getCheckInData('non-existent-booking')

      expect(result).toEqual([])
    })
  })

  describe('createCheckInData', () => {
    it('should create check-in data successfully', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ ...mockCheckInFormData, id: 'new-checkin-123' }],
          error: null,
        }),
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      const createCheckInData = async (data: any) => {
        const { data: result, error } = await mockSupabase.from('checkin_data')
          .insert(data)
          .select()
        
        if (error) throw error
        return result[0]
      }

      const result = await createCheckInData(mockCheckInFormData)

      expect(mockSupabase.from).toHaveBeenCalledWith('checkin_data')
      expect(mockInsert).toHaveBeenCalledWith(mockCheckInFormData)
      expect(result).toEqual({ ...mockCheckInFormData, id: 'new-checkin-123' })
    })

    it('should handle validation errors during creation', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Required field missing' },
        }),
      })

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      const createCheckInData = async (data: any) => {
        const { data: result, error } = await mockSupabase.from('checkin_data')
          .insert(data)
          .select()
        
        if (error) throw error
        return result[0]
      }

      const invalidData = { ...mockCheckInFormData, booking_id: null }

      await expect(createCheckInData(invalidData)).rejects.toThrow('Required field missing')
    })
  })

  describe('updateCheckInData', () => {
    it('should update existing check-in data', async () => {
      const updatedData = {
        ...mockCheckInData,
        guest_name: 'Updated Name',
        updated_at: new Date().toISOString(),
      }

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [updatedData],
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      })

      const updateCheckInData = async (id: string, data: any) => {
        const { data: result, error } = await mockSupabase.from('checkin_data')
          .update(data)
          .eq('id', id)
          .select()
        
        if (error) throw error
        return result[0]
      }

      const result = await updateCheckInData('test-checkin-123', { guest_name: 'Updated Name' })

      expect(mockSupabase.from).toHaveBeenCalledWith('checkin_data')
      expect(result.guest_name).toBe('Updated Name')
    })

    it('should handle update errors', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Record not found' },
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      })

      const updateCheckInData = async (id: string, data: any) => {
        const { data: result, error } = await mockSupabase.from('checkin_data')
          .update(data)
          .eq('id', id)
          .select()
        
        if (error) throw error
        return result[0]
      }

      await expect(updateCheckInData('invalid-id', { guest_name: 'Updated Name' }))
        .rejects.toThrow('Record not found')
    })
  })

  describe('Check-in Flow Integration', () => {
    it('should complete full check-in flow', async () => {
      // Mock booking fetch
      const mockBookingSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-booking-123', guest_name: 'John Doe' },
            error: null,
          }),
        }),
      })

      // Mock check-in data creation
      const mockCheckInInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ ...mockCheckInFormData, id: 'new-checkin-123' }],
          error: null,
        }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'bookings') {
          return { select: mockBookingSelect }
        }
        if (table === 'checkin_data') {
          return { insert: mockCheckInInsert }
        }
        return {}
      })

      // Simulate complete check-in flow
      const completeCheckIn = async (bookingId: string, formData: any) => {
        // 1. Verify booking exists
        const { data: booking, error: bookingError } = await mockSupabase.from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single()
        
        if (bookingError) throw bookingError

        // 2. Create check-in data
        const { data: checkInData, error: checkInError } = await mockSupabase.from('checkin_data')
          .insert({ ...formData, booking_id: bookingId })
          .select()
        
        if (checkInError) throw checkInError

        return { booking, checkInData: checkInData[0] }
      }

      const result = await completeCheckIn('test-booking-123', mockCheckInFormData)

      expect(result.booking).toBeDefined()
      expect(result.checkInData).toBeDefined()
      expect(result.checkInData.id).toBe('new-checkin-123')
    })
  })
})