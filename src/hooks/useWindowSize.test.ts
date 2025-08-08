import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useWindowSize, useBreakpoint } from './useWindowSize';

// Mock window.innerWidth and window.innerHeight
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

// Mock addEventListener and removeEventListener
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  configurable: true,
  value: mockAddEventListener,
});

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  configurable: true,
  value: mockRemoveEventListener,
});

describe('useWindowSize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  it('returns initial window size', () => {
    const { result } = renderHook(() => useWindowSize());
    
    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
  });

  it('adds resize event listener on mount', () => {
    renderHook(() => useWindowSize());
    
    expect(mockAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('removes resize event listener on unmount', () => {
    const { unmount } = renderHook(() => useWindowSize());
    
    unmount();
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('updates size when window is resized', () => {
    const { result } = renderHook(() => useWindowSize());
    
    // Get the resize handler
    const resizeHandler = mockAddEventListener.mock.calls[0][1];
    
    // Change window size
    window.innerWidth = 800;
    window.innerHeight = 600;
    
    // Trigger resize
    act(() => {
      resizeHandler();
    });
    
    expect(result.current.width).toBe(800);
    expect(result.current.height).toBe(600);
  });
});

describe('useBreakpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  it('returns desktop breakpoint for large screens', () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useBreakpoint());
    
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.width).toBe(1024);
  });

  it('returns tablet breakpoint for medium screens', () => {
    window.innerWidth = 768;
    const { result } = renderHook(() => useBreakpoint());
    
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.width).toBe(768);
  });

  it('returns mobile breakpoint for small screens', () => {
    window.innerWidth = 375;
    const { result } = renderHook(() => useBreakpoint());
    
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.width).toBe(375);
  });

  it('updates breakpoint when window is resized', () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useBreakpoint());
    
    // Initially desktop
    expect(result.current.isDesktop).toBe(true);
    
    // Get the resize handler
    const resizeHandler = mockAddEventListener.mock.calls[0][1];
    
    // Change to mobile size
    window.innerWidth = 375;
    
    // Trigger resize
    act(() => {
      resizeHandler();
    });
    
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('handles edge cases at breakpoint boundaries', () => {
    // Test exactly at mobile/tablet boundary (640px)
    window.innerWidth = 640;
    const { result } = renderHook(() => useBreakpoint());
    
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
    
    // Test exactly at tablet/desktop boundary (1024px)
    const resizeHandler = mockAddEventListener.mock.calls[0][1];
    window.innerWidth = 1024;
    
    act(() => {
      resizeHandler();
    });
    
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isTablet).toBe(false);
  });
});