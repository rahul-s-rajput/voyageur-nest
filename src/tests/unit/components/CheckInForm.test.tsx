import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CheckInForm } from '../../../components/CheckInForm'
import { mockCheckInFormData } from '../../mocks/data'

// Mock the notification hook so the component can render without a full
// NotificationProvider (which pulls in Supabase realtime subscriptions).
vi.mock('../../../components/NotificationContainer', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    showNotification: vi.fn(),
  }),
}))

describe('CheckInForm (Himalayan design)', () => {
  const defaultProps = {
    bookingId: 'test-booking-123',
    onSubmit: vi.fn(),
    initialData: mockCheckInFormData,
    isSubmitting: false,
    language: 'en',
    onLanguageChange: vi.fn(),
    bookingRef: '520/391',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all numbered sections', () => {
    render(<CheckInForm {...defaultProps} />)
    expect(screen.getByRole('heading', { name: 'Personal Details' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ID Verification' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Address' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Emergency Contact' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Visit Details' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Additional Guests' })).toBeInTheDocument()
  })

  it('renders the submit button and add-guest control', () => {
    render(<CheckInForm {...defaultProps} />)
    expect(screen.getByRole('button', { name: /submit check-in/i })).toBeInTheDocument()
    expect(screen.getByText('Add Guest')).toBeInTheDocument()
  })

  it('shows the Update label when updating an existing check-in', () => {
    render(<CheckInForm {...defaultProps} isUpdate />)
    expect(screen.getByRole('button', { name: /update check-in/i })).toBeInTheDocument()
  })

  it('forwards language changes via onLanguageChange', async () => {
    const user = userEvent.setup()
    render(<CheckInForm {...defaultProps} />)
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'हिन्दी' }))
    })
    expect(defaultProps.onLanguageChange).toHaveBeenCalledWith('hi')
  })

  it('renders Hindi copy when language is hi', () => {
    render(<CheckInForm {...defaultProps} language="hi" />)
    // Hindi section title for Personal Details
    expect(screen.getByText('व्यक्तिगत विवरण')).toBeInTheDocument()
  })

  it('disables the submit button and shows the busy label when submitting', () => {
    render(<CheckInForm {...defaultProps} isSubmitting />)
    const submitButton = screen.getByRole('button', { name: /submitting/i })
    expect(submitButton).toBeDisabled()
  })
})
