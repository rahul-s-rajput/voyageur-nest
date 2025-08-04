import { supabase } from '../lib/supabase';
import type { 
  GuestProfile, 
  CreateGuestProfileData, 
  UpdateGuestProfileData, 
  GuestProfileFilters,
  GuestProfileStats,
  GuestBookingHistory,
  PrivacySettings
} from '../types/guest';

export class GuestProfileService {
  /**
   * Create a new guest profile
   */
  static async createGuestProfile(data: CreateGuestProfileData): Promise<GuestProfile> {
    try {
      const { data: profile, error } = await supabase
        .from('guest_profiles')
        .insert([{
          ...data,
          country: data.country || 'India',
          email_marketing_consent: data.email_marketing_consent ?? true,
          sms_marketing_consent: data.sms_marketing_consent ?? true,
          data_retention_consent: data.data_retention_consent ?? true,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating guest profile:', error);
        throw new Error(`Failed to create guest profile: ${error.message}`);
      }

      return profile;
    } catch (error) {
      console.error('Error in createGuestProfile:', error);
      throw error;
    }
  }

  /**
   * Get guest profile by ID
   */
  static async getGuestProfile(id: string): Promise<GuestProfile | null> {
    try {
      const { data: profile, error } = await supabase
        .from('guest_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Profile not found
        }
        console.error('Error fetching guest profile:', error);
        throw new Error(`Failed to fetch guest profile: ${error.message}`);
      }

      return profile;
    } catch (error) {
      console.error('Error in getGuestProfile:', error);
      throw error;
    }
  }

  /**
   * Update guest profile
   */
  static async updateGuestProfile(data: UpdateGuestProfileData): Promise<GuestProfile> {
    try {
      const { id, ...updateData } = data;
      
      const { data: profile, error } = await supabase
        .from('guest_profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating guest profile:', error);
        throw new Error(`Failed to update guest profile: ${error.message}`);
      }

      return profile;
    } catch (error) {
      console.error('Error in updateGuestProfile:', error);
      throw error;
    }
  }

  /**
   * Delete guest profile (GDPR compliance)
   */
  static async deleteGuestProfile(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('guest_profiles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting guest profile:', error);
        throw new Error(`Failed to delete guest profile: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteGuestProfile:', error);
      throw error;
    }
  }

  /**
   * Search guest profiles with filters
   */
  static async searchGuestProfiles(filters: GuestProfileFilters = {}): Promise<GuestProfile[]> {
    try {
      let query = supabase
        .from('guest_profiles')
        .select('*');

      // Apply search filter
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      // Apply location filters
      if (filters.city) {
        query = query.eq('city', filters.city);
      }
      if (filters.state) {
        query = query.eq('state', filters.state);
      }
      if (filters.country) {
        query = query.eq('country', filters.country);
      }

      // Apply statistics filters
      if (filters.minStays) {
        query = query.gte('total_stays', filters.minStays);
      }
      if (filters.minSpent) {
        query = query.gte('total_spent', filters.minSpent);
      }

      // Apply date filters
      if (filters.lastStayAfter) {
        query = query.gte('last_stay_date', filters.lastStayAfter);
      }
      if (filters.lastStayBefore) {
        query = query.lte('last_stay_date', filters.lastStayBefore);
      }

      // Apply contact filters
      if (filters.hasEmail !== undefined) {
        if (filters.hasEmail) {
          query = query.not('email', 'is', null);
        } else {
          query = query.is('email', null);
        }
      }
      if (filters.hasPhone !== undefined) {
        if (filters.hasPhone) {
          query = query.not('phone', 'is', null);
        } else {
          query = query.is('phone', null);
        }
      }

      // Apply marketing consent filter
      if (filters.marketingConsent !== undefined) {
        query = query.eq('email_marketing_consent', filters.marketingConsent);
      }

      // Order by last stay date (most recent first), then by name
      query = query.order('last_stay_date', { ascending: false, nullsFirst: false })
                   .order('name', { ascending: true });

      const { data: profiles, error } = await query;

      if (error) {
        console.error('Error searching guest profiles:', error);
        throw new Error(`Failed to search guest profiles: ${error.message}`);
      }

      return profiles || [];
    } catch (error) {
      console.error('Error in searchGuestProfiles:', error);
      throw error;
    }
  }

  /**
   * Find guest profile by email or phone
   */
  static async findGuestByContact(email?: string, phone?: string): Promise<GuestProfile | null> {
    try {
      if (!email && !phone) {
        return null;
      }

      let query = supabase
        .from('guest_profiles')
        .select('*');

      if (email && phone) {
        query = query.or(`email.eq.${email},phone.eq.${phone}`);
      } else if (email) {
        query = query.eq('email', email);
      } else if (phone) {
        query = query.eq('phone', phone);
      }

      const { data: profiles, error } = await query.limit(1);

      if (error) {
        console.error('Error finding guest by contact:', error);
        throw new Error(`Failed to find guest by contact: ${error.message}`);
      }

      return profiles && profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      console.error('Error in findGuestByContact:', error);
      throw error;
    }
  }

  /**
   * Get guest booking history
   */
  static async getGuestBookingHistory(guestId: string): Promise<GuestBookingHistory[]> {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          guest_name,
          room_no,
          check_in,
          check_out,
          no_of_pax,
          total_amount,
          payment_status,
          status,
          special_requests,
          created_at
        `)
        .eq('guest_profile_id', guestId)
        .order('check_in', { ascending: false });

      if (error) {
        console.error('Error fetching guest booking history:', error);
        throw new Error(`Failed to fetch booking history: ${error.message}`);
      }

      return (bookings || []).map(booking => ({
        ...booking,
        booking_id: booking.id
      }));
    } catch (error) {
      console.error('Error in getGuestBookingHistory:', error);
      throw error;
    }
  }

  /**
   * Get guest profile statistics
   */
  static async getGuestProfileStats(): Promise<GuestProfileStats> {
    try {
      // Get total profiles count
      const { count: totalProfiles, error: countError } = await supabase
        .from('guest_profiles')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Failed to get profiles count: ${countError.message}`);
      }

      // Get aggregated statistics
      const { data: stats, error: statsError } = await supabase
        .from('guest_profiles')
        .select('total_stays, total_spent')
        .not('total_stays', 'is', null)
        .not('total_spent', 'is', null);

      if (statsError) {
        throw new Error(`Failed to get profile stats: ${statsError.message}`);
      }

      // Calculate statistics
      const totalStays = stats?.reduce((sum, profile) => sum + profile.total_stays, 0) || 0;
      const totalRevenue = stats?.reduce((sum, profile) => sum + profile.total_spent, 0) || 0;
      const averageStaysPerGuest = totalProfiles ? totalStays / totalProfiles : 0;
      const averageSpendPerGuest = totalProfiles ? totalRevenue / totalProfiles : 0;
      const repeatGuests = stats?.filter(profile => profile.total_stays > 1).length || 0;
      const repeatGuestPercentage = totalProfiles ? (repeatGuests / totalProfiles) * 100 : 0;

      // Get top cities and states
      const { data: locations, error: locError } = await supabase
        .from('guest_profiles')
        .select('city, state')
        .not('city', 'is', null)
        .not('state', 'is', null);

      if (locError) {
        console.warn('Error fetching location data:', locError);
      }

      // Process location data
      const cityCount: Record<string, number> = {};
      const stateCount: Record<string, number> = {};

      locations?.forEach(location => {
        if (location.city) {
          cityCount[location.city] = (cityCount[location.city] || 0) + 1;
        }
        if (location.state) {
          stateCount[location.state] = (stateCount[location.state] || 0) + 1;
        }
      });

      const topCities = Object.entries(cityCount)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topStates = Object.entries(stateCount)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalProfiles: totalProfiles || 0,
        totalStays,
        totalRevenue,
        averageStaysPerGuest: Math.round(averageStaysPerGuest * 100) / 100,
        averageSpendPerGuest: Math.round(averageSpendPerGuest * 100) / 100,
        repeatGuestPercentage: Math.round(repeatGuestPercentage * 100) / 100,
        topCities,
        topStates
      };
    } catch (error) {
      console.error('Error in getGuestProfileStats:', error);
      throw error;
    }
  }

  /**
   * Update privacy settings for a guest
   */
  static async updatePrivacySettings(guestId: string, settings: Partial<PrivacySettings>): Promise<void> {
    try {
      const { error } = await supabase
        .from('guest_profiles')
        .update({
          email_marketing_consent: settings.email_marketing_consent,
          sms_marketing_consent: settings.sms_marketing_consent,
          data_retention_consent: settings.data_retention_consent,
        })
        .eq('id', guestId);

      if (error) {
        console.error('Error updating privacy settings:', error);
        throw new Error(`Failed to update privacy settings: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in updatePrivacySettings:', error);
      throw error;
    }
  }

  /**
   * Link guest profile to booking
   */
  static async linkGuestToBooking(bookingId: string, guestProfileId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ guest_profile_id: guestProfileId })
        .eq('id', bookingId);

      if (error) {
        console.error('Error linking guest to booking:', error);
        throw new Error(`Failed to link guest to booking: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in linkGuestToBooking:', error);
      throw error;
    }
  }

  /**
   * Create or update guest profile from check-in data
   */
  static async createOrUpdateFromCheckIn(checkInData: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    marketingConsent?: boolean;
  }): Promise<GuestProfile> {
    try {
      const fullName = `${checkInData.firstName} ${checkInData.lastName}`.trim();
      
      // Try to find existing guest by email or phone
      const existingGuest = await this.findGuestByContact(checkInData.email, checkInData.phone);
      
      if (existingGuest) {
        // Update existing guest with new information
        const updateData: UpdateGuestProfileData = {
          id: existingGuest.id,
          name: fullName,
          email: checkInData.email || existingGuest.email,
          phone: checkInData.phone || existingGuest.phone,
          address: checkInData.address || existingGuest.address,
          city: checkInData.city || existingGuest.city,
          state: checkInData.state || existingGuest.state,
          country: checkInData.country || existingGuest.country,
        };
        
        return await this.updateGuestProfile(updateData);
      } else {
        // Create new guest profile
        const createData: CreateGuestProfileData = {
          name: fullName,
          email: checkInData.email,
          phone: checkInData.phone,
          address: checkInData.address,
          city: checkInData.city,
          state: checkInData.state,
          country: checkInData.country || 'India',
          email_marketing_consent: checkInData.marketingConsent ?? true,
          sms_marketing_consent: checkInData.marketingConsent ?? true,
          data_retention_consent: true,
        };
        
        return await this.createGuestProfile(createData);
      }
    } catch (error) {
      console.error('Error in createOrUpdateFromCheckIn:', error);
      throw error;
    }
  }
}

// Export a default instance for easier importing
export const guestProfileService = GuestProfileService;
export default guestProfileService;