import { http, HttpResponse } from 'msw'
import { mockBooking, mockCheckInData } from './data'

// Mock data for property service
const mockProperty = {
  id: 'test-property-id',
  name: 'Test Property',
  address: 'Test Address',
  phone: '1234567890',
  email: 'test@test.com',
  total_rooms: 10,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockRoom = {
  id: 'room-1',
  property_id: 'test-property-id',
  room_number: '101',
  room_type: 'deluxe',
  floor: 1,
  max_occupancy: 2,
  base_price: 1500,
  seasonal_pricing: {},
  amenities: ['wifi', 'ac'],
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

export const handlers = [
  // Mock Supabase REST API endpoints
  http.get('https://test.supabase.co/rest/v1/bookings', () => {
    return HttpResponse.json([mockBooking])
  }),

  http.get('https://test.supabase.co/rest/v1/bookings/:id', ({ params }) => {
    if (params.id === 'test-booking-123') {
      return HttpResponse.json(mockBooking)
    }
    return HttpResponse.json(null, { status: 404 })
  }),

  http.get('https://test.supabase.co/rest/v1/checkin_data', ({ request }) => {
    const url = new URL(request.url)
    const bookingId = url.searchParams.get('booking_id')
    
    if (bookingId === 'test-booking-123') {
      return HttpResponse.json([mockCheckInData])
    }
    return HttpResponse.json([])
  }),

  http.post('https://test.supabase.co/rest/v1/checkin_data', async ({ request }) => {
    const data = await request.json() as Record<string, any>
    return HttpResponse.json({
      ...data,
      id: 'new-checkin-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { status: 201 })
  }),

  http.patch('https://test.supabase.co/rest/v1/checkin_data/:id', async ({ request, params }) => {
    const data = await request.json() as Record<string, any>
    return HttpResponse.json({
      ...mockCheckInData,
      ...data,
      id: params.id,
      updated_at: new Date().toISOString()
    })
  }),

  // Mock invoice counter endpoints
  http.get('https://test.supabase.co/rest/v1/invoice_counter', () => {
    return HttpResponse.json([{ id: 1, value: 391 }])
  }),

  http.post('https://test.supabase.co/rest/v1/invoice_counter', async ({ request }) => {
    const data = await request.json()
    return HttpResponse.json(data, { status: 201 })
  }),

  http.patch('https://test.supabase.co/rest/v1/invoice_counter/:id', async ({ request }) => {
    const data = await request.json()
    return HttpResponse.json(data)
  }),

  // Property service endpoints
  http.get('https://test.supabase.co/rest/v1/properties', () => {
    return HttpResponse.json([mockProperty])
  }),

  http.get('https://test.supabase.co/rest/v1/properties/:id', ({ params }) => {
    if (params.id === 'test-property-id') {
      return HttpResponse.json(mockProperty)
    }
    return HttpResponse.json(null, { status: 404 })
  }),

  http.get('https://test.supabase.co/rest/v1/rooms', ({ request }) => {
    const url = new URL(request.url)
    const propertyId = url.searchParams.get('property_id')
    
    if (propertyId === 'test-property-id') {
      return HttpResponse.json([mockRoom])
    }
    return HttpResponse.json([])
  }),

  // Catch-all handlers for unhandled requests (helps with debugging)
  http.get('*', ({ request }) => {
    console.log('Unhandled GET request:', request.url)
    return HttpResponse.json([])
  }),

  http.post('*', ({ request }) => {
    console.log('Unhandled POST request:', request.url)
    return HttpResponse.json({}, { status: 201 })
  })
]