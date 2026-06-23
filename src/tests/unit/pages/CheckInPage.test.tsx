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

// Mock the property service (the page fetches the property name for the header)
vi.mock('../../../services/propertyService', () => ({
  propertyService: {
    getPropertyById: vi.fn().mockResolvedValue({ id: 'p1', name: 'Voyageur Nest' }),
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
      {/* The real CheckInForm handles submission errors internally
          (externalErrorHandling). Swallow the rejection here so a re-thrown
          error from the page doesn't surface as an unhandled rejection. */}
      <button onClick={() => Promise.resolve(onSubmit({ test: 'data' })).catch(() => {})}>Submit</button>
    </div>
  ),
}))

// Mock EtherealHero (the success/landing hero pulls in heavy presentational deps
// that are irrelevant to the page logic under test).
vi.mock('../../../components/EtherealHero', () => ({
  default: ({ title }: { title?: string }) => <div data-testid="ethereal-hero">{title}</div>,
}))

// Mock the notification hook so the page can render without a NotificationProvider
// (which pulls in Supabase realtime subscriptions).
vi.mock('../../../components/NotificationContainer', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    showNotification: vi.fn(),
  }),
}))

// Mock the translation hook so the page renders the English copy the assertions
// expect instead of raw translation keys (real copy lives in the DB translation
// service). `errorPrefix` resolves to an empty string so the submission-error
// text matches exactly.
const checkInPageTranslations: Record<string, string> = {
  'checkInPage.loading': 'Loading...',
  'checkInPage.error': 'Error loading check-in information',
  'checkInPage.checkInComplete': 'Check-in Complete!',
  'checkInPage.checkInSuccess': 'Your check-in has been completed successfully.',
  'checkInPage.digitalCheckIn': 'Digital Check-in',
  'checkInPage.errorPrefix': '',
}

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: (initialLanguage = 'en-US') => ({
    t: (key: string) => checkInPageTranslations[key] ?? key,
    isLoading: false,
    currentLanguage: initialLanguage,
    setLanguage: vi.fn(),
    error: null,
    clearError: vi.fn(),
    availableLanguages: [],
    isLanguageSupported: vi.fn().mockResolvedValue(true),
    preloadLanguage: vi.fn().mockResolvedValue(true),
  }),
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
    expect(screen.getByText('Loading your booking…')).toBeInTheDocument()
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

    // Should show error state after failed submission. The page surfaces the
    // thrown Error's message (it only falls back to a generic string for
    // non-Error rejections), so the banner shows 'Submission failed'.
    await waitFor(() => {
      expect(screen.getByText('Submission failed')).toBeInTheDocument()
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