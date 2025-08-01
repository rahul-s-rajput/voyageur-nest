import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CheckInForm } from '../../../components/CheckInForm'
import { mockCheckInFormData } from '../../mocks/data'

// Mock react-hook-form
const mockRegister = vi.fn()
const mockHandleSubmit = vi.fn()
const mockWatch = vi.fn()
const mockSetValue = vi.fn()
const mockReset = vi.fn()
const mockFormState = {
  errors: {},
  isSubmitting: false,
  isValid: true,
}

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: mockRegister,
    handleSubmit: mockHandleSubmit,
    watch: mockWatch,
    setValue: mockSetValue,
    formState: mockFormState,
    reset: mockReset,
    control: {},
  }),
  useFieldArray: () => ({
    fields: [],
    append: vi.fn(),
    remove: vi.fn(),
  }),
}))

describe('CheckInForm', () => {
  const defaultProps = {
    bookingId: 'test-booking-123',
    onSubmit: vi.fn(),
    initialData: mockCheckInFormData,
    isSubmitting: false,
    language: 'en' as const,
    onLanguageChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockRegister.mockReturnValue({})
    mockHandleSubmit.mockImplementation((fn) => (e?: React.FormEvent) => {
      e?.preventDefault()
      fn(mockCheckInFormData)
    })
    mockWatch.mockReturnValue('')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render form with title and language toggle', () => {
    render(<CheckInForm {...defaultProps} />)

    // Check for form title
    expect(screen.getByText('Digital Check-in Form')).toBeInTheDocument()
    
    // Check for language toggle button
    expect(screen.getByText('हिंदी')).toBeInTheDocument()
    
    // Check for submit button with correct text
    expect(screen.getByRole('button', { name: /complete check-in/i })).toBeInTheDocument()
  })

  it('should toggle language when language button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<CheckInForm {...defaultProps} />)

    const hindiButton = screen.getByText('हिंदी')
    
    await act(async () => {
      await user.click(hindiButton)
    })

    expect(defaultProps.onLanguageChange).toHaveBeenCalledWith('hi')
  })

  it('should call onSubmit when form is submitted', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<CheckInForm {...defaultProps} />)

    const submitButton = screen.getByRole('button', { name: /complete check-in/i })
    
    await act(async () => {
      await user.click(submitButton)
    })

    expect(mockHandleSubmit).toHaveBeenCalled()
  })

  it('should show loading state when isSubmitting is true', () => {
    render(<CheckInForm {...defaultProps} isSubmitting={true} />)

    const submitButton = screen.getByRole('button', { name: /submitting/i })
    expect(submitButton).toBeDisabled()
  })

  it('should populate form with initial data', () => {
    render(<CheckInForm {...defaultProps} />)

    // Verify that register was called for expected fields
    expect(mockRegister).toHaveBeenCalledWith('firstName', expect.any(Object))
    expect(mockRegister).toHaveBeenCalledWith('lastName', expect.any(Object))
    expect(mockRegister).toHaveBeenCalledWith('email', expect.any(Object))
    expect(mockRegister).toHaveBeenCalledWith('phone', expect.any(Object))
  })

  it('should render section headers', () => {
    render(<CheckInForm {...defaultProps} />)

    expect(screen.getByText('Personal Details')).toBeInTheDocument()
    expect(screen.getByText('Emergency Contact')).toBeInTheDocument()
    expect(screen.getByText('Purpose of Visit')).toBeInTheDocument()
    expect(screen.getByText('Additional Guests')).toBeInTheDocument()
  })

  it('should render with Hindi translations when language is hi', () => {
    render(<CheckInForm {...defaultProps} language="hi" />)

    // Check that English toggle is shown (since current language is Hindi)
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('should handle additional guests section', () => {
    render(<CheckInForm {...defaultProps} />)

    // Check for add guest button
    expect(screen.getByText('Add Guest')).toBeInTheDocument()
    
    // Check for no guests message
    expect(screen.getByText('No additional guests added')).toBeInTheDocument()
  })

  it('should disable submit button when isSubmitting is true', () => {
    render(<CheckInForm {...defaultProps} isSubmitting={true} />)

    const submitButton = screen.getByRole('button', { name: /submitting/i })
    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveClass('disabled:bg-gray-400')
  })

  it('should render terms and conditions checkbox', () => {
    render(<CheckInForm {...defaultProps} />)

    expect(screen.getByText('I accept the terms and conditions *')).toBeInTheDocument()
    expect(screen.getByText('I consent to receive marketing communications')).toBeInTheDocument()
  })

  it('should call reset when initialData changes', () => {
    const { rerender } = render(<CheckInForm {...defaultProps} />)
    
    const newInitialData = { ...mockCheckInFormData, firstName: 'Updated' }
    rerender(<CheckInForm {...defaultProps} initialData={newInitialData} />)

    expect(mockReset).toHaveBeenCalled()
  })
})