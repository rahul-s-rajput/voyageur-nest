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

// Derive the same totals the booking_financials view produces, but from the
// charges/payments the UI already has in hand — avoids an extra (aggregating)
// round-trip when those lists are already loaded. Mirrors the view's rules:
// discounts/taxes are neutered to 0; gross = sum of non-voided charges.
export function computeFinancials(
  charges: Array<{ chargeType: string; amount: number; isVoided?: boolean }>,
  payments: Array<{ paymentType: string; amount: number; isVoided?: boolean }>,
  propertyId: string,
  bookingId: string,
): BookingFinancials {
  const num = (n: any) => (typeof n === 'number' ? n : parseFloat(String(n)) || 0);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const chargesTotal = charges
    .filter(c => !c.isVoided && c.chargeType !== 'discount' && c.chargeType !== 'tax')
    .reduce((s, c) => s + num(c.amount), 0);
  const grossTotal = chargesTotal;
  const paymentsTotal = payments
    .filter(p => !p.isVoided && p.paymentType === 'payment')
    .reduce((s, p) => s + num(p.amount), 0);
  const refundsTotal = payments
    .filter(p => !p.isVoided && p.paymentType === 'refund')
    .reduce((s, p) => s + num(p.amount), 0);
  const netPaid = paymentsTotal - refundsTotal;
  const balanceDue = round2(grossTotal - netPaid);

  let statusDerived: BookingFinancialStatus;
  if (grossTotal <= 0) statusDerived = 'no-charges';
  else if (balanceDue <= 0.001) statusDerived = 'paid';
  else if (netPaid > 0) statusDerived = 'partial';
  else statusDerived = 'unpaid';

  return {
    bookingId,
    propertyId,
    chargesTotal: round2(chargesTotal),
    discountsTotal: 0,
    taxesTotal: 0,
    grossTotal: round2(grossTotal),
    paymentsTotal: round2(paymentsTotal),
    refundsTotal: round2(refundsTotal),
    balanceDue,
    statusDerived,
    lastActivityAt: '',
  };
}

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
