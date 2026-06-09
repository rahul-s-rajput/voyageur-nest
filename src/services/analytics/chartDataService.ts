import { supabase } from '../../lib/supabase';
import { AnalyticsFilters } from '../../types/analytics';
import { addMonths, format, startOfMonth, endOfMonth } from 'date-fns';

export interface OccupancyTrendData {
  month: string;
  [propertyName: string]: string | number;
}

export interface SourceAnalysisData {
  source: string;
  bookings: number;
  revenue: number;
}

export interface GuestDemographicsData {
  region: string;
  percentage: number;
  bookings: number;
}

export interface CancellationTrendData {
  month: string;
  cancellations: number;
  noShows: number;
  total: number;
}

export interface PropertyComparisonData {
  propertyId: string;
  propertyName: string;
  occupancyRate: number;
  adr: number;
  revpar: number;
  bookings: number;
  avgStay: number;
  cancellationRate: number;
  conversionRate: number | null;
  repeatGuestRate: number;
}

export interface RevenueTrendData {
  month: string;
  revenue: number;
}

export const chartDataService = {
  // Get occupancy trends for the last 5 months by property
  async getOccupancyTrends(filters: AnalyticsFilters): Promise<OccupancyTrendData[]> {
    try {
      if (!filters?.propertyId || !filters?.start || !filters?.end) {
        console.warn('getOccupancyTrends called without valid filters', filters);
        return [];
      }
      // Get last 5 months including current
      const endDate = new Date(filters.end);
      const months = [];
      for (let i = 4; i >= 0; i--) {
        const month = addMonths(startOfMonth(endDate), -i);
        months.push({
          month: format(month, 'MMM'),
          start: startOfMonth(month).toISOString(),
          end: endOfMonth(month).toISOString()
        });
      }

      // For single property view, create simulated multi-property data or focus on current property
      const currentProperty = await supabase
        .from('properties')
        .select('id, name, total_rooms')
        .eq('id', filters.propertyId)
        .single();

      if (!currentProperty.data) {
        console.log('No property found for ID:', filters.propertyId);
        return [];
      }

      // Get all active properties for comparison (limit to 3 for chart readability)
      const { data: allProperties } = await supabase
        .from('properties')
        .select('id, name, total_rooms')
        .eq('is_active', true)
        .limit(3);

      const properties = allProperties || [currentProperty.data];
      const result: OccupancyTrendData[] = [];

      for (const monthData of months) {
        const row: OccupancyTrendData = { month: monthData.month };

        for (const property of properties) {
          // Get bookings for this property and month
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('check_in, check_out, number_of_rooms')
            .eq('property_id', property.id)
            .eq('cancelled', false)
            .gte('check_in', monthData.start)
            .lt('check_out', monthData.end); // Changed from check_in to check_out for better coverage

          if (bookingsError) {
            console.error('Bookings query error:', bookingsError);
            continue;
          }

          // Calculate total room nights sold
          const totalRoomNights = (bookings || []).reduce((sum, booking) => {
            const checkIn = new Date(booking.check_in);
            const checkOut = new Date(booking.check_out);
            const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
            return sum + (nights * (booking.number_of_rooms || 1));
          }, 0);

          // Calculate days in month
          const monthStart = new Date(monthData.start);
          const monthEnd = new Date(monthData.end);
          const daysInMonth = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));

          const totalRoomNightsAvailable = property.total_rooms * daysInMonth;
          const occupancyRate = totalRoomNightsAvailable > 0 
            ? Math.round((totalRoomNights / totalRoomNightsAvailable) * 100) 
            : 0;

          // Use consistent property key format for charts
          const propertyKey = property.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          row[propertyKey] = occupancyRate;

          console.log(`${property.name} ${monthData.month}: ${totalRoomNights}/${totalRoomNightsAvailable} nights = ${occupancyRate}%`);
        }

        result.push(row);
      }

      // No real occupancy data → return empty so the UI shows its empty state
      // rather than a fabricated curve.
      if (result.every(row => Object.keys(row).length === 1)) {
        return [];
      }

      return result;
    } catch (error) {
      console.error('Error fetching occupancy trends:', error);
      return [];
    }
  },

  // Get booking source analysis
  async getSourceAnalysis(filters: AnalyticsFilters): Promise<SourceAnalysisData[]> {
    try {
      if (!filters?.propertyId || !filters?.start || !filters?.end) {
        console.warn('getSourceAnalysis called without valid filters', filters);
        return [];
      }
      let query = supabase
        .from('bookings')
        .select('source, total_amount')
        .eq('property_id', filters.propertyId)
        .eq('cancelled', false)
        .gte('check_in', filters.start)
        .lte('check_out', filters.end);

      const { data: bookings } = await query;

      if (!bookings) return [];

      // Group by source
      const sourceMap: Record<string, { bookings: number; revenue: number }> = {};

      bookings.forEach(booking => {
        const source = booking.source || 'Direct';
        if (!sourceMap[source]) {
          sourceMap[source] = { bookings: 0, revenue: 0 };
        }
        sourceMap[source].bookings++;
        sourceMap[source].revenue += parseFloat(booking.total_amount || '0');
      });

      return Object.entries(sourceMap)
        .map(([source, data]) => ({
          source,
          bookings: data.bookings,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      console.error('Error fetching source analysis:', error);
      return [];
    }
  },

  // Get guest demographics (simplified - based on guest profiles if available)
  async getGuestDemographics(filters: AnalyticsFilters): Promise<GuestDemographicsData[]> {
    try {
      if (!filters?.propertyId || !filters?.start || !filters?.end) {
        console.warn('getGuestDemographics called without valid filters', filters);
        return [];
      }
      // Try to get guest profile data first
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          guest_profile_id,
          guest_profiles (
            state
          )
        `)
        .eq('property_id', filters.propertyId)
        .eq('cancelled', false)
        .gte('check_in', filters.start)
        .lte('check_out', filters.end);

      if (!bookings) return [];

      // Group by state/region
      const regionMap: Record<string, number> = {};
      let totalBookings = 0;

      bookings.forEach(booking => {
        totalBookings++;
        const region = (booking as any).guest_profiles?.state || 'Unknown';
        regionMap[region] = (regionMap[region] || 0) + 1;
      });

      return Object.entries(regionMap)
        .map(([region, count]) => ({
          region,
          bookings: count,
          percentage: Math.round((count / totalBookings) * 100)
        }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 6); // Top 6 regions
    } catch (error) {
      console.error('Error fetching guest demographics:', error);
      // Return empty rather than fabricated regions; the UI shows an empty state.
      return [];
    }
  },

  // Get cancellation trends
  async getCancellationTrends(filters: AnalyticsFilters): Promise<CancellationTrendData[]> {
    try {
      if (!filters?.propertyId || !filters?.start || !filters?.end) {
        console.warn('getCancellationTrends called without valid filters', filters);
        return [];
      }
      // Get last 5 months including current
      const endDate = new Date(filters.end);
      const months = [];
      for (let i = 4; i >= 0; i--) {
        const month = addMonths(startOfMonth(endDate), -i);
        months.push({
          month: format(month, 'MMM'),
          start: startOfMonth(month).toISOString(),
          end: endOfMonth(month).toISOString()
        });
      }

      const result: CancellationTrendData[] = [];

      for (const monthData of months) {
        // Get all bookings for this month
        const { data: allBookings } = await supabase
          .from('bookings')
          .select('cancelled, status')
          .eq('property_id', filters.propertyId)
          .gte('check_in', monthData.start)
          .lt('check_in', monthData.end);

        if (allBookings) {
          const total = allBookings.length;
          const cancellations = allBookings.filter(b => b.cancelled).length;
          // No-shows aren't tracked in the data model, so report 0 rather than
          // estimating a fabricated figure.
          const noShows = 0;

          result.push({
            month: monthData.month,
            cancellations,
            noShows,
            total
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Error fetching cancellation trends:', error);
      return [];
    }
  },

  // Real revenue per month ("MMM yyyy") for the last `monthCount` months,
  // attributed by check-in month. Keys match getExpenseTrends so the two can be
  // merged into a single revenue-vs-expenses trend chart.
  async getRevenueTrends(filters: AnalyticsFilters, monthCount = 6): Promise<RevenueTrendData[]> {
    try {
      if (!filters?.propertyId) {
        return [];
      }
      const endDate = new Date();
      const result: RevenueTrendData[] = [];
      for (let i = monthCount - 1; i >= 0; i--) {
        const monthDate = addMonths(startOfMonth(endDate), -i);
        const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
        const monthKey = format(monthDate, 'MMM yyyy');
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('total_amount')
          .eq('property_id', filters.propertyId)
          .eq('cancelled', false)
          .gte('check_in', monthStart)
          .lte('check_in', monthEnd);
        if (error) {
          console.error('Revenue trends query error:', error);
        }
        const revenue = (bookings || []).reduce(
          (sum, b: any) => sum + parseFloat(b.total_amount || '0'),
          0
        );
        result.push({ month: monthKey, revenue: Math.round(revenue) });
      }
      return result;
    } catch (error) {
      console.error('Error fetching revenue trends:', error);
      return [];
    }
  },

  // Get cross-property comparison data
  async getPropertyComparison(dateRange: { start: string; end: string }): Promise<PropertyComparisonData[]> {
    try {
      if (!dateRange?.start || !dateRange?.end) {
        console.warn('getPropertyComparison called without valid dateRange', dateRange);
        return [];
      }
      const { data: properties } = await supabase
        .from('properties')
        .select('id, name, total_rooms')
        .eq('is_active', true);

      if (!properties) return [];

      const result: PropertyComparisonData[] = [];

      for (const property of properties) {
        // Get all bookings for this property
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('property_id', property.id)
          .gte('check_in', dateRange.start)
          .lte('check_out', dateRange.end);

        if (bookings) {
          const totalBookings = bookings.length;
          const nonCancelledBookings = bookings.filter(b => !b.cancelled);
          const cancelledBookings = bookings.filter(b => b.cancelled);
          const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
          const pendingBookings = bookings.filter(b => b.status === 'pending');

          // Calculate metrics
          const totalRevenue = nonCancelledBookings.reduce((sum, b) => sum + parseFloat(b.total_amount || '0'), 0);
          const totalRoomNights = nonCancelledBookings.reduce((sum, booking) => {
            const nights = Math.ceil(
              (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + (nights * (booking.number_of_rooms || 1));
          }, 0);

          const daysInPeriod = Math.ceil(
            (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)
          );
          const totalRoomNightsAvailable = property.total_rooms * daysInPeriod;

          const occupancyRate = totalRoomNightsAvailable > 0 ? (totalRoomNights / totalRoomNightsAvailable) * 100 : 0;
          const adr = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0;
          const revpar = totalRoomNightsAvailable > 0 ? totalRevenue / totalRoomNightsAvailable : 0;
          const avgStay = nonCancelledBookings.length > 0 
            ? totalRoomNights / nonCancelledBookings.length / (nonCancelledBookings.reduce((sum, b) => sum + (b.number_of_rooms || 1), 0) / nonCancelledBookings.length)
            : 0;
          const cancellationRate = totalBookings > 0 ? (cancelledBookings.length / totalBookings) * 100 : 0;
          const conversionRate = (confirmedBookings.length + pendingBookings.length) > 0 
            ? (confirmedBookings.length / (confirmedBookings.length + pendingBookings.length)) * 100 
            : null;

          // Repeat-guest rate: share of distinct guests with more than one stay in
          // the period, keyed by profile/phone/email/name (best available identifier).
          const guestKey = (b: any) =>
            b.guest_profile_id || b.contact_phone || b.contact_email ||
            (b.guest_name ? String(b.guest_name).trim().toLowerCase() : '');
          const guestStayCounts = new Map<string, number>();
          for (const b of nonCancelledBookings) {
            const k = guestKey(b);
            if (!k) continue;
            guestStayCounts.set(k, (guestStayCounts.get(k) || 0) + 1);
          }
          const uniqueGuests = guestStayCounts.size;
          const repeatGuests = Array.from(guestStayCounts.values()).filter(c => c > 1).length;
          const repeatGuestRate = uniqueGuests > 0 ? (repeatGuests / uniqueGuests) * 100 : 0;

          result.push({
            propertyId: property.id,
            propertyName: property.name,
            occupancyRate: Math.round(occupancyRate * 10) / 10,
            adr: Math.round(adr),
            revpar: Math.round(revpar),
            bookings: nonCancelledBookings.length,
            avgStay: Math.round(avgStay * 10) / 10,
            cancellationRate: Math.round(cancellationRate * 10) / 10,
            conversionRate: conversionRate ? Math.round(conversionRate * 10) / 10 : null,
            repeatGuestRate: Math.round(repeatGuestRate * 10) / 10
          });
        }
      }

      return result.sort((a, b) => b.occupancyRate - a.occupancyRate);
    } catch (error) {
      console.error('Error fetching property comparison:', error);
      return [];
    }
  }
};
