import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
// You'll get these after creating your Supabase project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database functions for invoice counter
export const invoiceCounterService = {
  // Get current counter value
  async getCounter(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('invoice_counter')
        .select('value')
        .eq('id', 1)
        .single()

      if (error) {
        // If counter doesn't exist, create it with default value
        if (error.code === 'PGRST116') {
          await this.initializeCounter()
          return 391
        }
        console.error('Error fetching counter:', error)
        return 391
      }

      return data?.value || 391
    } catch (error) {
      console.error('Error in getCounter:', error)
      return 391
    }
  },

  // Update counter value
  async updateCounter(newValue: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoice_counter')
        .upsert({ id: 1, value: newValue })

      if (error) {
        console.error('Error updating counter:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateCounter:', error)
      return false
    }
  },

  // Initialize counter with default value
  async initializeCounter(): Promise<void> {
    try {
      const { error } = await supabase
        .from('invoice_counter')
        .insert({ id: 1, value: 391 })

      if (error && error.code !== '23505') { // Ignore duplicate key error
        console.error('Error initializing counter:', error)
      }
    } catch (error) {
      console.error('Error in initializeCounter:', error)
    }
  },

  // Real-time subscription to counter changes
  subscribeToCounter(callback: (value: number) => void) {
    return supabase
      .channel('invoice_counter_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'invoice_counter' 
        }, 
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'value' in payload.new) {
            callback(payload.new.value as number)
          }
        }
      )
      .subscribe()
  }
} 