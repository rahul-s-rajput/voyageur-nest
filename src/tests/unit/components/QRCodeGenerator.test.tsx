import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QRCodeGenerator } from '../../../components/QRCodeGenerator'

// Mock qrcode.react
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, size }: { value: string; size: number }) => (
    <div data-testid="qr-code-svg" data-value={value} data-size={size}>
      QR Code for: {value}
    </div>
  ),
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
})

// Mock alert
global.alert = vi.fn()

// Mock document methods for fallback
Object.defineProperty(document, 'execCommand', {
  value: vi.fn(),
  writable: true,
})

describe('QRCodeGenerator', () => {
  const defaultProps = {
    bookingId: 'test-booking-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render QR code with correct URL', () => {
    render(<QRCodeGenerator {...defaultProps} />)

    const qrCode = screen.getByTestId('qr-code-svg')
    expect(qrCode).toBeInTheDocument()
    expect(qrCode).toHaveAttribute('data-value', 'http://localhost:3000/checkin/test-booking-123')
  })

  it('should display the check-in URL in input field', () => {
    render(<QRCodeGenerator {...defaultProps} />)

    const urlInput = screen.getByDisplayValue('http://localhost:3000/checkin/test-booking-123')
    expect(urlInput).toBeInTheDocument()
    expect(urlInput).toHaveAttribute('readonly')
  })

  it('should copy URL to clipboard when copy button is clicked', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined)
    navigator.clipboard.writeText = mockWriteText

    render(<QRCodeGenerator {...defaultProps} />)

    const copyButton = screen.getByText('Copy Link')
    fireEvent.click(copyButton)

    expect(mockWriteText).toHaveBeenCalledWith('http://localhost:3000/checkin/test-booking-123')
  })

  it('should show success message after copying', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined)
    navigator.clipboard.writeText = mockWriteText

    render(<QRCodeGenerator {...defaultProps} />)

    const copyButton = screen.getByText('Copy Link')
    fireEvent.click(copyButton)

    // Wait for the async operation
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(global.alert).toHaveBeenCalledWith('Check-in link copied to clipboard!')
  })

  it('should handle clipboard copy failure gracefully', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard not available'))
    navigator.clipboard.writeText = mockWriteText
    
    // Mock document methods for fallback
    const mockExecCommand = vi.fn()
    document.execCommand = mockExecCommand

    render(<QRCodeGenerator {...defaultProps} />)

    const copyButton = screen.getByText('Copy Link')
    fireEvent.click(copyButton)

    // Wait for the async operation
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(global.alert).toHaveBeenCalledWith('Check-in link copied to clipboard!')
  })

  it('should render download button', () => {
    render(<QRCodeGenerator {...defaultProps} />)

    const downloadButton = screen.getByText('Download QR')
    expect(downloadButton).toBeInTheDocument()
  })

  it('should use custom size when provided', () => {
    render(<QRCodeGenerator {...defaultProps} size={300} />)

    const qrCode = screen.getByTestId('qr-code-svg')
    expect(qrCode).toHaveAttribute('data-size', '300')
  })

  it('should use default size when not provided', () => {
    render(<QRCodeGenerator {...defaultProps} />)

    const qrCode = screen.getByTestId('qr-code-svg')
    expect(qrCode).toHaveAttribute('data-size', '200')
  })

  it('should apply custom className', () => {
    render(<QRCodeGenerator {...defaultProps} className="custom-class" />)

    const container = screen.getByText('Copy Link').closest('.qr-code-container')
    expect(container).toHaveClass('custom-class')
  })

  it('should display usage instructions', () => {
    render(<QRCodeGenerator {...defaultProps} />)

    expect(screen.getByText('Scan this QR code or use the link below for digital check-in:')).toBeInTheDocument()
  })

  it('should have readonly input field', () => {
    render(<QRCodeGenerator {...defaultProps} />)

    const urlInput = screen.getByDisplayValue('http://localhost:3000/checkin/test-booking-123')
    expect(urlInput).toHaveAttribute('readonly')
    expect(urlInput).toHaveClass('bg-gray-50')
  })

  it('should render action buttons with correct styling', () => {
    render(<QRCodeGenerator {...defaultProps} />)

    const copyButton = screen.getByText('Copy Link')
    const downloadButton = screen.getByText('Download QR')

    expect(copyButton).toHaveClass('bg-blue-500')
    expect(downloadButton).toHaveClass('bg-green-500')
  })
})