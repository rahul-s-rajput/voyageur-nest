import { supabase } from '../lib/supabase';
import type { 
  GuestProfile, 
  CreateGuestProfileData, 
  UpdateGuestProfileData, 
  GuestProfileFilters,
  GuestProfileStats,
  GuestBookingHistory,
  GuestEmailMessage,
  PrivacySettings,
  DuplicateCandidate,
  MergeResult
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

      // Apply marketing consent filters
      if (filters.marketingConsent !== undefined) {
        query = query.eq('email_marketing_consent', filters.marketingConsent);
      }
      if (filters.emailMarketingConsent !== undefined) {
        query = query.eq('email_marketing_consent', filters.emailMarketingConsent);
      }
      if (filters.smsMarketingConsent !== undefined) {
        query = query.eq('sms_marketing_consent', filters.smsMarketingConsent);
      }

      // Sorting with alias mapping from UI to DB columns
      const sortMap: Record<string, string> = {
        created_at: 'created_at',
        name: 'name',
        last_visit_date: 'last_stay_date',
        total_bookings: 'total_stays',
      };
      const sortByKey = filters.sortBy && sortMap[filters.sortBy] ? sortMap[filters.sortBy] : 'last_stay_date';
      const ascending = filters.sortOrder === 'asc';
      query = query.order(sortByKey, { ascending, nullsFirst: !ascending });
      // Secondary order for stable sort
      if (sortByKey !== 'name') {
        query = query.order('name', { ascending: true });
      }

      // Pagination
      if (typeof filters.offset === 'number' && typeof filters.limit === 'number') {
        const from = Math.max(0, filters.offset);
        const to = from + Math.max(1, filters.limit) - 1;
        query = query.range(from, to);
      } else if (typeof filters.limit === 'number') {
        query = query.limit(filters.limit);
      }

      const { data: profiles, error } = await query;

      if (error) {
        console.error('Error searching guest profiles:', error);
        throw new Error(`Failed to search guest profiles: ${error.message}`);
      }

      const list = (profiles || []) as any[];
      // Backward-compat: add alias fields expected by some UI code/CSV
      const hydrated: GuestProfile[] = list.map((p) => ({
        ...p,
        total_bookings: p.total_stays ?? 0,
        last_visit_date: p.last_stay_date ?? null,
      }));

      return hydrated;
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
          additional_guest_names,
          total_amount,
          payment_status,
          status,
          special_requests,
          created_at,
          property_id
        `)
        .eq('guest_profile_id', guestId)
        .order('check_in', { ascending: false });

      if (error) {
        console.error('Error fetching guest booking history:', error);
        throw new Error(`Failed to fetch booking history: ${error.message}`);
      }

      const list = bookings || [];
      // Fetch property names for the involved property_ids
      const propIds = Array.from(new Set(list.map((b: any) => b.property_id).filter(Boolean)));
      let nameById: Record<string, string> = {};
      if (propIds.length > 0) {
        const { data: props, error: perr } = await supabase
          .from('properties')
          .select('id, name')
          .in('id', propIds);
        if (perr) {
          console.warn('Failed to load properties for booking history:', perr);
        } else {
          nameById = Object.fromEntries((props || []).map((p: any) => [p.id, p.name]));
        }
      }

      return list.map((booking: any) => ({
        ...booking,
        booking_id: booking.id,
        property_name: booking.property_id ? nameById[booking.property_id] : undefined,
      }));
    } catch (error) {
      console.error('Error in getGuestBookingHistory:', error);
      throw error;
    }
  }

  /**
   * Get recent communication history emails by guest email
   */
  static async getCommunicationHistoryByEmail(email: string, limit = 5): Promise<GuestEmailMessage[]> {
    try {
      if (!email) return [];

      const { data, error } = await supabase
        .from('email_messages')
        .select('id,sender,recipient,subject,snippet,received_at')
        .or(`sender.ilike.%${email}%,recipient.ilike.%${email}%`)
        .order('received_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching communication history:', error);
        throw new Error(`Failed to fetch communication history: ${error.message}`);
      }

      return (data || []) as GuestEmailMessage[];
    } catch (error) {
      console.error('Error in getCommunicationHistoryByEmail:', error);
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

  // ---------------- Duplicate detection & merge ----------------

  /**
   * Compute a simple normalized Levenshtein distance-based similarity between two names.
   * Returns a score between 0 and 1 (1 = identical).
   */
  private static nameSimilarity(a?: string | null, b?: string | null): number {
    const s1 = (a || '').trim().toLowerCase();
    const s2 = (b || '').trim().toLowerCase();
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;
    const d = (x: string, y: string) => {
      const dp: number[][] = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
      for (let i = 0; i <= x.length; i++) dp[i][0] = i;
      for (let j = 0; j <= y.length; j++) dp[0][j] = j;
      for (let i = 1; i <= x.length; i++) {
        for (let j = 1; j <= y.length; j++) {
          const cost = x[i - 1] === y[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + cost
          );
        }
      }
      return dp[x.length][y.length];
    };
    const dist = d(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    return maxLen ? 1 - dist / maxLen : 0;
  }

  private static normEmail(email?: string | null): string | null {
    const e = (email || '').trim().toLowerCase();
    return e || null;
  }

  private static normPhone(phone?: string | null): string | null {
    if (!phone) return null;
    // Keep digits only for rough matching
    const p = phone.replace(/\D+/g, '');
    return p || null;
  }

  /**
   * Find potential duplicates for a given profile ID.
   * Uses exact email/phone matches and fuzzy name similarity.
   */
  static async findDuplicatesForProfile(profileId: string): Promise<DuplicateCandidate[]> {
    try {
      const target = await this.getGuestProfile(profileId);
      if (!target) return [];

      const email = this.normEmail(target.email);
      const phone = this.normPhone(target.phone);

      // Query candidates by:
      // - Same email (case-insensitive exact)
      // - Same phone (exact raw) OR contains last 6 digits
      // - Name contains first or last token
      let orParts: string[] = [];
      if (target.email) orParts.push(`email.eq.${target.email}`);
      if (email) orParts.push(`email.ilike.${email}`);
      if (target.phone) orParts.push(`phone.eq.${target.phone}`);
      if (phone) {
        const last6 = phone.slice(-6);
        if (last6 && last6.length >= 4) {
          orParts.push(`phone.ilike.%${last6}%`);
        }
      }
      const nameTokens = (target.name || '').split(/\s+/).filter(Boolean);
      for (const t of nameTokens.slice(0, 2)) {
        if (t.length >= 3) orParts.push(`name.ilike.%${t}%`);
      }

      let query = supabase.from('guest_profiles').select('*');
      if (orParts.length) query = query.or(orParts.join(','));
      const { data: candidates, error } = await query;
      if (error) throw new Error(error.message);

      const results: DuplicateCandidate[] = [];
      (candidates || []).forEach((p: GuestProfile) => {
        if (p.id === target.id) return;
        let score = 0;
        const reasons: string[] = [];
        if (email && this.normEmail(p.email) === email) { score += 0.6; reasons.push('Same email'); }
        const pPhone = this.normPhone(p.phone);
        if (phone && pPhone === phone) { score += 0.6; reasons.push('Same phone'); }
        const nameSim = this.nameSimilarity(target.name, p.name);
        if (nameSim >= 0.8) { score += 0.3; reasons.push(`Very similar name (${(nameSim*100).toFixed(0)}%)`); }
        else if (nameSim >= 0.6) { score += 0.15; reasons.push(`Similar name (${(nameSim*100).toFixed(0)}%)`); }

        if (score >= 0.6) {
          results.push({ profile: p, reasons, score });
        }
      });

      // Sort high to low score
      results.sort((a, b) => b.score - a.score);
      return results;
    } catch (err) {
      console.error('Error in findDuplicatesForProfile:', err);
      throw err;
    }
  }

  /**
   * Scan for duplicate clusters across the dataset (basic: exact email/phone).
   */
  static async findDuplicateClusters(limit = 500): Promise<Array<{ primary: GuestProfile; duplicates: DuplicateCandidate[] }>> {
    try {
      const { data: profiles, error } = await supabase
        .from('guest_profiles')
        .select('id,name,email,phone,total_stays,created_at')
        .limit(limit);
      if (error) throw new Error(error.message);
      const list = (profiles || []) as GuestProfile[];

      const byEmail = new Map<string, GuestProfile[]>();
      const byPhone = new Map<string, GuestProfile[]>();
      for (const p of list) {
        const e = this.normEmail(p.email);
        const ph = this.normPhone(p.phone);
        if (e) byEmail.set(e, [...(byEmail.get(e) || []), p]);
        if (ph) byPhone.set(ph, [...(byPhone.get(ph) || []), p]);
      }

      const clusters: GuestProfile[][] = [];
      const seen = new Set<string>();

      const collect = (groups: Map<string, GuestProfile[]>) => {
        for (const [_key, arr] of groups.entries()) {
          const uniq = Array.from(new Map(arr.map(g => [g.id, g])).values());
          if (uniq.length <= 1) continue;
          // Skip if already fully covered
          const ids = uniq.map(u => u.id);
          if (ids.every(id => seen.has(id))) continue;
          uniq.forEach(u => seen.add(u.id));
          clusters.push(uniq);
        }
      };

      collect(byEmail);
      collect(byPhone);

      // Build result with a default primary (highest total_stays, then oldest created)
      const results: Array<{ primary: GuestProfile; duplicates: DuplicateCandidate[] }> = clusters.map(group => {
        const sorted = [...group].sort((a, b) => {
          const stays = (b.total_stays || 0) - (a.total_stays || 0);
          if (stays !== 0) return stays;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        const primary = sorted[0];
        const dups: DuplicateCandidate[] = sorted.slice(1).map(p => ({
          profile: p,
          reasons: [
            this.normEmail(p.email) && this.normEmail(p.email) === this.normEmail(primary.email) ? 'Same email' : 'Same phone'
          ],
          score: 0.7
        }));
        return { primary, duplicates: dups };
      });

      return results;
    } catch (err) {
      console.error('Error in findDuplicateClusters:', err);
      throw err;
    }
  }

  /**
   * Merge duplicate guest profiles into a primary profile.
   * - Reassign bookings from duplicates to primary
   * - Optionally backfill missing contact fields on primary
   * - Delete duplicate profiles
   */
  static async mergeGuestProfiles(primaryId: string, duplicateIds: string[]): Promise<MergeResult> {
    if (!primaryId || !duplicateIds?.length) {
      throw new Error('Primary ID and at least one duplicate ID are required');
    }
    try {
      // Get primary & duplicates
      const [primary, dupFetch] = await Promise.all([
        this.getGuestProfile(primaryId),
        supabase.from('guest_profiles').select('*').in('id', duplicateIds),
      ]);
      if (!primary) throw new Error('Primary guest profile not found');
      if (dupFetch.error) throw new Error(dupFetch.error.message);
      const duplicates = (dupFetch.data || []) as GuestProfile[];

      // Reassign bookings
      const { data: updatedBookings, error: updErr } = await supabase
        .from('bookings')
        .update({ guest_profile_id: primaryId })
        .in('guest_profile_id', duplicateIds)
        .select('id');
      if (updErr) throw new Error(`Failed to reassign bookings: ${updErr.message}`);

      // Backfill primary fields if missing
      let profileUpdated = false;
      const newPrimary: UpdateGuestProfileData = { id: primaryId };
      for (const d of duplicates) {
        if (!primary.email && d.email) { newPrimary.email = d.email; profileUpdated = true; }
        if (!primary.phone && d.phone) { newPrimary.phone = d.phone; profileUpdated = true; }
        if (!primary.name && d.name) { newPrimary.name = d.name; profileUpdated = true; }
        if (!primary.city && d.city) { newPrimary.city = d.city; profileUpdated = true; }
        if (!primary.state && d.state) { newPrimary.state = d.state; profileUpdated = true; }
        if (!primary.country && d.country) { newPrimary.country = d.country; profileUpdated = true; }
        if (!primary.address && d.address) { newPrimary.address = d.address; profileUpdated = true; }
      }
      if (profileUpdated) {
        await this.updateGuestProfile(newPrimary);
      } else {
        // Touch updated_at to trigger stats-related processes if any
        await supabase.from('guest_profiles').update({ updated_at: new Date().toISOString() }).eq('id', primaryId);
      }

      // Delete duplicates
      const { error: delErr } = await supabase
        .from('guest_profiles')
        .delete()
        .in('id', duplicateIds);
      if (delErr) throw new Error(`Failed to delete duplicate profiles: ${delErr.message}`);

      return {
        primary: (await this.getGuestProfile(primaryId)) as GuestProfile,
        mergedIds: duplicateIds,
        bookingsReassigned: updatedBookings?.length || 0,
        profileUpdated,
      } as MergeResult;
    } catch (err) {
      console.error('Error in mergeGuestProfiles:', err);
      throw err;
    }
  }
}

// Export a default instance for easier importing
export const guestProfileService = GuestProfileService;
export default guestProfileService;