import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Unified Supabase client - handles both public and authenticated access via RLS
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable session persistence for admin users
    persistSession: true,
    // Enable automatic token refresh
    autoRefreshToken: true,
    // Enable session detection for auth callbacks
    detectSessionInUrl: true,
    // Use localStorage for session persistence
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Use PKCE flow for enhanced security
    flowType: 'pkce'
  },
  realtime: {
    // Moderate realtime usage
    params: {
      eventsPerSecond: 5
    }
  },
  global: {
    headers: {
      'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0'
    }
  },
  db: {
    schema: 'public'
  }
})

// API helper functions that work with RLS policies
export const api = {
  // Public operations (work without authentication due to RLS policies)
  async getMenuItems() {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .is('deleted_at', null)
      .order('display_order')
    
    if (error) {
      console.error('Error fetching menu items:', error)
      throw new Error('Failed to load menu items')
    }
    
    return data
  },

  async getMenuCategories() {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
    
    if (error) {
      console.error('Error fetching menu categories:', error)
      throw new Error('Failed to load menu categories')
    }
    
    return data
  },

  async getRoomTypes() {
    const { data, error } = await supabase
      .from('room_types')
      .select('*')
      .eq('is_active', true)
      .eq('is_bookable', true)
      .order('base_price')
    
    if (error) {
      console.error('Error fetching room types:', error)
      throw new Error('Failed to load room types')
    }
    
    return data
  },

  async getProperties() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (error) {
      console.error('Error fetching properties:', error)
      throw new Error('Failed to load properties')
    }
    
    return data
  },

  // Booking operations (public can create, admin can modify via RLS)
  async createBooking(bookingData: any) {
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating booking:', error)
      throw new Error('Failed to create booking')
    }
    
    return data
  },

  async createGuestProfile(guestData: any) {
    const { data, error } = await supabase
      .from('guest_profiles')
      .insert(guestData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating guest profile:', error)
      throw new Error('Failed to create guest profile')
    }
    
    return data
  },

  // Admin operations (require authentication, enforced by RLS)
  async getAllBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        guest_profiles(*),
        room_types(*),
        properties(*)
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching bookings:', error)
      throw new Error('Failed to load bookings')
    }
    
    return data
  },

  async getAllExpenses() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
    
    if (error) {
      console.error('Error fetching expenses:', error)
      throw new Error('Failed to load expenses')
    }
    
    return data
  },

  async createExpense(expenseData: any) {
    const { data, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating expense:', error)
      throw new Error('Failed to create expense')
    }
    
    return data
  }
}

// Authentication helpers
export const auth = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('Sign in error:', error)
      throw new Error(error.message)
    }
    
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Sign out error:', error)
      throw new Error('Failed to sign out')
    }
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Get user error:', error)
      return null
    }
    
    return user
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Get session error:', error)
      return null
    }
    
    return session
  }
}

// Error handling wrapper for API calls
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      // Log error for monitoring
      console.error('API Error:', {
        function: fn.name,
        args: args,
        error: error
      })
      
      // Re-throw with user-friendly message
      if (error instanceof Error) {
        throw error
      }
      
      throw new Error('An unexpected error occurred')
    }
  }
}

// TypeScript types for better development experience
export type SupabaseClient = typeof supabase

// Re-export commonly used types
export type { Database } from '../types/database.types'
export type { User, Session, AuthError } from '@supabase/supabase-js'

// Default export for convenience
export default supabase
