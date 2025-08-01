import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Test utilities
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 100))
}

export const mockLocalStorage = () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  })
  return localStorageMock
}

export const mockSessionStorage = () => {
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock
  })
  return sessionStorageMock
}

// Mock window.matchMedia
export const mockMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// Mock IntersectionObserver
export const mockIntersectionObserver = () => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

// Mock ResizeObserver
export const mockResizeObserver = () => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

// Helper to create mock form data
export const createMockFormData = (overrides: Record<string, any> = {}) => {
  return {
    guest_name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    address: '123 Main St, City, Country',
    id_type: 'passport',
    id_number: 'P123456789',
    emergency_contact_name: 'Jane Doe',
    emergency_contact_phone: '+0987654321',
    emergency_contact_relation: 'Spouse',
    additional_guests: [],
    special_requests: '',
    arrival_time: '14:00',
    ...overrides
  }
}

// Helper to create mock booking data
export const createMockBooking = (overrides: Record<string, any> = {}) => {
  return {
    id: 'test-booking-123',
    guest_name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    check_in_date: '2024-01-15',
    check_out_date: '2024-01-20',
    room_number: '101',
    folio_number: 'F123456',
    status: 'confirmed',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
    ...overrides
  }
}

// Helper to simulate async operations
export const flushPromises = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Helper to create mock API responses
export const createMockApiResponse = (data: any, error: any = null) => {
  return {
    data,
    error,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK'
  }
}

// Helper for testing error boundaries
export const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Helper to mock console methods
export const mockConsole = () => {
  const originalConsole = { ...console }
  console.log = vi.fn()
  console.error = vi.fn()
  console.warn = vi.fn()
  console.info = vi.fn()
  
  return {
    restore: () => {
      Object.assign(console, originalConsole)
    }
  }
}