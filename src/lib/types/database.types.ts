export interface Database {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string
          property_id: string | null
          guest_name: string
          room_no: string
          number_of_rooms: number | null
          check_in: string | null
          check_out: string | null
          no_of_pax: number | null
          adult_child: string | null
          status: string
          cancelled: boolean
          total_amount: string
          payment_status: string
          payment_amount: string | null
          payment_mode: string | null
          contact_phone: string | null
          contact_email: string | null
          special_requests: string | null
          booking_date: string | null
          folio_number: string | null
          source: string | null
          source_details: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          guest_name: string
          room_no: string
          number_of_rooms?: number | null
          check_in?: string | null
          check_out?: string | null
          no_of_pax?: number | null
          adult_child?: string | null
          status?: string
          cancelled?: boolean
          total_amount: string
          payment_status?: string
          payment_amount?: string | null
          payment_mode?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          special_requests?: string | null
          booking_date?: string | null
          folio_number?: string | null
          source?: string | null
          source_details?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          guest_name?: string
          room_no?: string
          number_of_rooms?: number | null
          check_in?: string | null
          check_out?: string | null
          no_of_pax?: number | null
          adult_child?: string | null
          status?: string
          cancelled?: boolean
          total_amount?: string
          payment_status?: string
          payment_amount?: string | null
          payment_mode?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          special_requests?: string | null
          booking_date?: string | null
          folio_number?: string | null
          source?: string | null
          source_details?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      guest_profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          name: string
          description: string | null
          price: string
          category_id: string | null
          is_available: boolean
          display_order: number | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: string
          category_id?: string | null
          is_available?: boolean
          display_order?: number | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: string
          category_id?: string | null
          is_available?: boolean
          display_order?: number | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      menu_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          display_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          display_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          display_order?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      room_types: {
        Row: {
          id: string
          name: string
          description: string | null
          base_price: string
          is_active: boolean
          is_bookable: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          base_price: string
          is_active?: boolean
          is_bookable?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          base_price?: string
          is_active?: boolean
          is_bookable?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          name: string
          address: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          property_id: string | null
          category: string
          amount: string
          description: string | null
          date: string
          receipt_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          category: string
          amount: string
          description?: string | null
          date: string
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          category?: string
          amount?: string
          description?: string | null
          date?: string
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      device_tokens: {
        Row: {
          id: string
          device_token: string
          device_info: any | null
          is_active: boolean
          expires_at: string
          last_used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          device_token: string
          device_info?: any | null
          is_active?: boolean
          expires_at: string
          last_used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          device_token?: string
          device_info?: any | null
          is_active?: boolean
          expires_at?: string
          last_used_at?: string | null
          created_at?: string
        }
      }
      invoice_counter: {
        Row: {
          id: number
          value: number
        }
        Insert: {
          id?: number
          value: number
        }
        Update: {
          id?: number
          value?: number
        }
      }
      checkin_data: {
        Row: {
          id: string
          booking_id: string
          guest_profile_id: string | null
          first_name: string
          last_name: string
          email: string
          phone: string
          date_of_birth: string | null
          nationality: string | null
          id_type: string
          id_number: string
          address: string
          city: string | null
          state: string | null
          country: string | null
          zip_code: string | null
          emergency_contact_name: string
          emergency_contact_phone: string
          emergency_contact_relation: string
          purpose_of_visit: string
          arrival_date: string
          departure_date: string
          room_number: string
          number_of_guests: number
          additional_guests: any[]
          special_requests: string | null
          preferences: any
          terms_accepted: boolean
          marketing_consent: boolean
          id_document_urls: string[] | null
          id_photo_urls: string[]
          id_verification_status: string
          verification_notes: string | null
          verified_by: string | null
          verified_at: string | null
          extracted_id_data: any | null
          form_completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          guest_profile_id?: string | null
          first_name: string
          last_name: string
          email: string
          phone: string
          date_of_birth?: string | null
          nationality?: string | null
          id_type: string
          id_number: string
          address: string
          city?: string | null
          state?: string | null
          country?: string | null
          zip_code?: string | null
          emergency_contact_name: string
          emergency_contact_phone: string
          emergency_contact_relation: string
          purpose_of_visit: string
          arrival_date: string
          departure_date: string
          room_number: string
          number_of_guests: number
          additional_guests?: any[]
          special_requests?: string | null
          preferences?: any
          terms_accepted?: boolean
          marketing_consent?: boolean
          id_document_urls?: string[] | null
          id_photo_urls?: string[]
          id_verification_status?: string
          verification_notes?: string | null
          verified_by?: string | null
          verified_at?: string | null
          extracted_id_data?: any | null
          form_completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          guest_profile_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          date_of_birth?: string | null
          nationality?: string | null
          id_type?: string
          id_number?: string
          address?: string
          city?: string | null
          state?: string | null
          country?: string | null
          zip_code?: string | null
          emergency_contact_name?: string
          emergency_contact_phone?: string
          emergency_contact_relation?: string
          purpose_of_visit?: string
          arrival_date?: string
          departure_date?: string
          room_number?: string
          number_of_guests?: number
          additional_guests?: any[]
          special_requests?: string | null
          preferences?: any
          terms_accepted?: boolean
          marketing_consent?: boolean
          id_document_urls?: string[] | null
          id_photo_urls?: string[]
          id_verification_status?: string
          verification_notes?: string | null
          verified_by?: string | null
          verified_at?: string | null
          extracted_id_data?: any | null
          form_completed_at?: string
          created_at?: string
        }
      }
      email_messages: {
        Row: {
          id: string
          subject: string | null
          snippet: string | null
          sender: string | null
          received_at: string | null
          processed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          subject?: string | null
          snippet?: string | null
          sender?: string | null
          received_at?: string | null
          processed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          subject?: string | null
          snippet?: string | null
          sender?: string | null
          received_at?: string | null
          processed?: boolean
          created_at?: string
        }
      }
      email_booking_imports: {
        Row: {
          id: string
          email_message_id: string
          booking_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email_message_id: string
          booking_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email_message_id?: string
          booking_id?: string | null
          created_at?: string
        }
      }
      email_parse_queue: {
        Row: {
          email_message_id: string
          status: string
          attempts: number
          last_error: string | null
          updated_at: string
        }
        Insert: {
          email_message_id: string
          status?: string
          attempts?: number
          last_error?: string | null
          updated_at?: string
        }
        Update: {
          email_message_id?: string
          status?: string
          attempts?: number
          last_error?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
