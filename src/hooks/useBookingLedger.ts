import { useQuery } from '@tanstack/react-query';
import { bookingChargesService, type BookingCharge } from '../services/bookingChargesService';
import { bookingPaymentsService, type BookingPayment } from '../services/bookingPaymentsService';

export interface BookingLedger {
  charges: BookingCharge[];
  payments: BookingPayment[];
}

export const ledgerQueryKey = (propertyId?: string, bookingId?: string) =>
  ['bookingLedger', propertyId ?? '', bookingId ?? ''] as const;

/**
 * Cached charges + payments for a booking. Re-opening the same booking shows the
 * cached ledger instantly; totals are derived from this client-side.
 */
export function useBookingLedger(propertyId?: string, bookingId?: string) {
  return useQuery<BookingLedger>({
    queryKey: ledgerQueryKey(propertyId, bookingId),
    queryFn: async () => {
      const [charges, payments] = await Promise.all([
        bookingChargesService.listByBooking(propertyId as string, bookingId as string),
        bookingPaymentsService.listByBooking(propertyId as string, bookingId as string),
      ]);
      return { charges, payments };
    },
    enabled: Boolean(propertyId && bookingId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
