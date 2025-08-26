import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type BookingFinancials = {
  property_id: string;
  booking_id: string;
  total_charges: number;
  total_discounts: number;
  total_taxes: number;
  total_payments: number;
  total_refunds: number;
  gross_total: number;
  balance_due: number;
  status_derived: string;
  updated_at?: string | null;
};

export async function getBookingFinancials(
  supabase: SupabaseClient,
  propertyId: string,
  bookingId: string,
): Promise<BookingFinancials | null> {
  const { data, error } = await supabase
    .from("booking_financials")
    .select(
      "property_id, booking_id, total_charges:charges_total, total_discounts:discounts_total, total_taxes:taxes_total, total_payments:payments_total, total_refunds:refunds_total, gross_total, balance_due, status_derived, updated_at:last_activity_at",
    )
    .eq("property_id", propertyId)
    .eq("booking_id", bookingId)
    .single();
  if (error) throw error;
  if (!data) return null;
  // Normalize numeric-like fields to numbers
  const toNum = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    property_id: (data as any).property_id,
    booking_id: (data as any).booking_id,
    total_charges: toNum((data as any).total_charges),
    total_discounts: toNum((data as any).total_discounts),
    total_taxes: toNum((data as any).total_taxes),
    total_payments: toNum((data as any).total_payments),
    total_refunds: toNum((data as any).total_refunds),
    gross_total: toNum((data as any).gross_total),
    balance_due: toNum((data as any).balance_due),
    status_derived: String((data as any).status_derived ?? "unknown"),
    updated_at: (data as any).updated_at ?? null,
  } as BookingFinancials;
}
