import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../lib/supabase';
import type { Booking } from '../types/booking';

export const bookingsQueryKey = (propertyId?: string) => ['bookings', propertyId ?? 'all'] as const;

/**
 * Cached booking list for a property. With a stale time, re-mounting the bookings
 * screen (e.g. switching admin tabs and back) shows the cached list instantly and
 * revalidates in the background instead of blocking on a fresh fetch.
 */
export function useBookings(propertyId?: string) {
  return useQuery<Booking[]>({
    queryKey: bookingsQueryKey(propertyId),
    queryFn: () => bookingService.getBookings({ propertyId }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
