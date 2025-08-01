import { http, HttpResponse } from 'msw'
import { mockBooking, mockCheckInData } from './data'

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
  })
]