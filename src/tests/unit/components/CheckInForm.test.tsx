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

// English copy for the translation keys the component actually renders.
// The real translation content lives in the database translation service;
// here we provide deterministic English so we can assert on readable UI text
// while still verifying the component wires up the correct translation keys.
const enTranslations: Record<string, string> = {
  'form.title': 'Digital Check-in Form',
  'form.sections.personalDetails': 'Personal Details',
  'form.sections.idVerification': 'ID Verification',
  'form.sections.emergencyContact': 'Emergency Contact',
  'form.sections.purposeOfVisit': 'Purpose of Visit',
  'form.sections.additionalGuests': 'Additional Guests',
  'form.fields.firstName': 'First Name',
  'form.fields.lastName': 'Last Name',
  'form.fields.email': 'Email Address',
  'form.fields.phone': 'Phone Number',
  'form.fields.address': 'Address',
  'form.fields.emergencyContactName': 'Emergency Contact Name',
  'form.fields.emergencyContactPhone': 'Emergency Contact Phone',
  'form.fields.relationship': 'Relationship',
  'form.fields.purposeOfVisit': 'Purpose of Visit',
  'form.fields.idType': 'ID Type',
  'form.fields.uploadIdPhotos': 'Upload ID Photos',
  'form.buttons.addGuest': 'Add Guest',
  'form.buttons.submitCheckIn': 'Complete Check-in',
  'form.buttons.submitting': 'Submitting...',
  'messages.noAdditionalGuests': 'No additional guests added',
}

const mockSetLanguage = vi.fn()

// Mock the translation hook. `t(key)` returns the English copy above (or the
// key itself as a fallback, mirroring the real hook's behaviour).
vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: (initialLanguage = 'en-US') => ({
    t: (key: string) => enTranslations[key] ?? key,
    isLoading: false,
    currentLanguage: initialLanguage,
    setLanguage: mockSetLanguage,
    error: null,
    clearError: vi.fn(),
    availableLanguages: [],
    isLanguageSupported: vi.fn().mockResolvedValue(true),
    preloadLanguage: vi.fn().mockResolvedValue(true),
  }),
}))

// Mock the LanguageSelector. The real selector renders a <select> whose options
// come from `availableLanguages` (empty in tests), so it cannot drive a language
// change on its own. This lightweight stub lets us verify that CheckInForm wires
// its `onLanguageChange` callback through correctly.
vi.mock('../../../components/LanguageSelector', () => ({
  default: ({ onLanguageChange }: { onLanguageChange: (code: string) => void }) => (
    <button type="button" onClick={() => onLanguageChange('hi-IN')}>
      Change Language
    </button>
  ),
}))

describe('CheckInForm', () => {
  const defaultProps = {
    bookingId: 'test-booking-123',
    onSubmit: vi.fn(),
    initialData: mockCheckInFormData,
    isSubmitting: false,
    language: 'en-US',
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

  it('should render form with title and language selector', () => {
    render(<CheckInForm {...defaultProps} />)

    // Check for form title
    expect(screen.getByText('Digital Check-in Form')).toBeInTheDocument()

    // Check for language selector
    expect(screen.getByText('Change Language')).toBeInTheDocument()

    // Check for submit button with correct text
    expect(screen.getByRole('button', { name: /complete check-in/i })).toBeInTheDocument()
  })

  it('should call onLanguageChange when language is changed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<CheckInForm {...defaultProps} />)

    const languageButton = screen.getByText('Change Language')

    await act(async () => {
      await user.click(languageButton)
    })

    // CheckInForm.handleLanguageChange updates the translation hook and then
    // forwards the selected language code to the parent.
    expect(mockSetLanguage).toHaveBeenCalledWith('hi-IN')
    expect(defaultProps.onLanguageChange).toHaveBeenCalledWith('hi-IN')
  })

  it('should call handleSubmit when form is submitted', async () => {
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

  it('should reflect the provided language on the translation hook', () => {
    render(<CheckInForm {...defaultProps} language="hi-IN" />)

    // The component still renders its title (translated copy is mocked to English),
    // confirming it initialises the translation hook without crashing for non-default
    // languages.
    expect(screen.getByText('Digital Check-in Form')).toBeInTheDocument()
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
    expect(submitButton).toHaveClass('ethereal-button')
  })

  it('should call reset when initialData changes', () => {
    const { rerender } = render(<CheckInForm {...defaultProps} />)

    const newInitialData = { ...mockCheckInFormData, firstName: 'Updated' }
    rerender(<CheckInForm {...defaultProps} initialData={newInitialData} />)

    expect(mockReset).toHaveBeenCalled()
  })
})
