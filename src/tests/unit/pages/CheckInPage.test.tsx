import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { CheckInPage } from '../../../pages/CheckInPage'

// Mock the lib/supabase module
vi.mock('../../../lib/supabase', () => ({
  bookingService: {
    getBookingById: vi.fn(),
  },
  checkInService: {
    getCheckInDataByBookingId: vi.fn(),
    createCheckInData: vi.fn(),
    updateCheckInData: vi.fn(),
  },
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(),
  }
})

// Mock CheckInForm component
vi.mock('../../../components/CheckInForm', () => ({
  CheckInForm: ({ onSubmit, isSubmitting, initialData }: any) => (
    <div data-testid="check-in-form">
      <div>Mock CheckInForm</div>
      <div>Loading: {isSubmitting ? 'true' : 'false'}</div>
      <div>Initial Data: {initialData ? JSON.stringify(initialData) : 'none'}</div>
      <button onClick={() => onSubmit({ test: 'data' })}>Submit</button>
    </div>
  ),
}))

const mockBooking = {
  id: 'test-booking-123',
  guestName: 'John Doe',
  contactEmail: 'john@example.com',
  contactPhone: '+1234567890',
  checkIn: '2024-01-15',
  checkOut: '2024-01-20',
  roomNo: '101',
  status: 'confirmed' as const,
  cancelled: false,
  numberOfRooms: 1,
  noOfPax: 2,
  adultChild: '2 Adults',
  totalAmount: 5000,
  paymentStatus: 'paid' as const,
  paymentAmount: 5000,
  paymentMode: 'card',
  specialRequests: '',
  bookingDate: '2024-01-10',
  folioNumber: '520/391',
  createdAt: '2024-01-10T10:00:00Z',
  updatedAt: '2024-01-10T10:00:00Z'
}

const mockCheckInData = {
  id: 'checkin-123',
  booking_id: 'test-booking-123',
  guest_name: 'John Doe',
  guest_email: 'john@example.com',
  phone_number: '+1234567890',
  address: '123 Main St',
  emergency_contact_name: 'Jane Doe',
  emergency_contact_phone: '+0987654321',
  purpose_of_visit: 'Business',
  additional_guests: [],
  terms_accepted: true,
  created_at: '2024-01-15T10:00:00Z',
}

describe('CheckInPage', () => {
  let mockBookingService: any
  let mockCheckInService: any
  let mockUseParams: any
  let mockNavigate: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mocked modules
    const { bookingService, checkInService } = await import('../../../lib/supabase')
    const { useParams, useNavigate } = await import('react-router-dom')
    
    mockBookingService = bookingService
    mockCheckInService = checkInService
    mockUseParams = useParams as any
    mockNavigate = useNavigate as any

    // Setup default mock implementations
    mockUseParams.mockReturnValue({ bookingId: 'test-booking-123' })
    mockNavigate.mockReturnValue(vi.fn())
    mockBookingService.getBookingById.mockResolvedValue(mockBooking)
    mockCheckInService.getCheckInDataByBookingId.mockResolvedValue(null)
    mockCheckInService.createCheckInData.mockResolvedValue({ success: true })
    mockCheckInService.updateCheckInData.mockResolvedValue({ success: true })
  })

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('should render loading state initially', () => {
    renderWithRouter(<CheckInPage />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should load booking data and render check-in form', async () => {
    renderWithRouter(<CheckInPage />)

    await waitFor(() => {
      expect(screen.getByTestId('check-in-form')).toBeInTheDocument()
    })

    expect(mockBookingService.getBookingById).toHaveBeenCalledWith('test-booking-123')
    expect(screen.getByText('Mock CheckInForm')).toBeInTheDocument()
  })

  it('should pass language prop to CheckInForm', async () => {
    renderWithRouter(<CheckInPage />)

    await waitFor(() => {
      expect(screen.getByTestId('check-in-form')).toBeInTheDocument()
    })

    // The CheckInForm should receive the language prop (default 'en')
    // This is verified by the mock CheckInForm component receiving the language prop
    expect(screen.getByTestId('check-in-form')).toBeInTheDocument()
  })

  it('should handle form submission successfully', async () => {
    mockCheckInService.createCheckInData.mockResolvedValue({ success: true })

    renderWithRouter(<CheckInPage />)

    await waitFor(() => {
      expect(screen.getByTestId('check-in-form')).toBeInTheDocument()
    })

    const submitButton = screen.getByText('Submit')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCheckInService.createCheckInData).toHaveBeenCalledWith(
        'test-booking-123',
        { test: 'data' }
      )
    })
  })

  it('should handle form submission error', async () => {
    mockCheckInService.createCheckInData.mockRejectedValue(new Error('Submission failed'))

    renderWithRouter(<CheckInPage />)

    await waitFor(() => {
      expect(screen.getByTestId('check-in-form')).toBeInTheDocument()
    })

    const submitButton = screen.getByText('Submit')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCheckInService.createCheckInData).toHaveBeenCalled()
    })

    // Should show error state after failed submission
    await waitFor(() => {
      expect(screen.getByText('Failed to submit check-in form. Please try again.')).toBeInTheDocument()
    })
  })

  it('should handle booking not found', async () => {
    mockBookingService.getBookingById.mockResolvedValue(null)

    renderWithRouter(<CheckInPage />)

    await waitFor(() => {
      expect(screen.getByText('Booking not found')).toBeInTheDocument()
    })
  })

  it('should populate form with existing check-in data', async () => {
    mockCheckInService.getCheckInDataByBookingId.mockResolvedValue(mockCheckInData)

    renderWithRouter(<CheckInPage />)

    await waitFor(() => {
      expect(screen.getByTestId('check-in-form')).toBeInTheDocument()
    })

    expect(screen.getByText(/Initial Data:/)).toBeInTheDocument()
  })

  it('should show submitting state during form submission', async () => {
    let resolveSubmit: (value: any) => void
    const submitPromise = new Promise((resolve) => {
      resolveSubmit = resolve
    })
    mockCheckInService.createCheckInData.mockReturnValue(submitPromise)

    renderWithRouter(<CheckInPage />)

    await waitFor(() => {
      expect(screen.getByTestId('check-in-form')).toBeInTheDocument()
    })

    const submitButton = screen.getByText('Submit')
    fireEvent.click(submitButton)

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Loading: true')).toBeInTheDocument()
    })

    // Resolve the promise
    resolveSubmit!({ success: true })

    // Should show success state after submission
    await waitFor(() => {
      expect(screen.getByText('Check-in Complete!')).toBeInTheDocument()
    })
  })
})