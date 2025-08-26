import { supabase } from '../lib/supabase/index';

export type BookingFinancialStatus = 'no-charges' | 'paid' | 'partial' | 'unpaid';

export interface BookingFinancials {
  bookingId: string;
  propertyId: string;
  chargesTotal: number;
  discountsTotal: number;
  taxesTotal: number;
  grossTotal: number;
  paymentsTotal: number;
  refundsTotal: number;
  balanceDue: number;
  statusDerived: BookingFinancialStatus;
  lastActivityAt: string;
}

const toDomain = (row: any): BookingFinancials => ({
  bookingId: row.booking_id,
  propertyId: row.property_id,
  chargesTotal: parseFloat(row.charges_total ?? 0),
  discountsTotal: parseFloat(row.discounts_total ?? 0),
  taxesTotal: parseFloat(row.taxes_total ?? 0),
  grossTotal: parseFloat(row.gross_total ?? 0),
  paymentsTotal: parseFloat(row.payments_total ?? 0),
  refundsTotal: parseFloat(row.refunds_total ?? 0),
  balanceDue: parseFloat(row.balance_due ?? 0),
  statusDerived: row.status_derived as BookingFinancialStatus,
  lastActivityAt: row.last_activity_at,
});

export const bookingFinancialsService = {
  async getByBooking(propertyId: string, bookingId: string): Promise<BookingFinancials> {
    const { data, error } = await supabase
      .from('booking_financials')
      .select('*')
      .eq('property_id', propertyId)
      .eq('booking_id', bookingId)
      .single();
    if (error) throw error;
    if (!data) throw new Error('Financials not found');
    return toDomain(data);
  },
};
