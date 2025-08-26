import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type BookingPayment = {
  id: string;
  property_id: string;
  booking_id: string;
  payment_type: "payment" | "refund" | "adjustment";
  method: "cash" | "card" | "upi" | "bank" | "other";
  amount: number;
  reference_no: string | null;
  is_voided: boolean;
  created_at: string;
  updated_at: string;
};

export async function listBookingPayments(
  supabase: SupabaseClient,
  propertyId: string,
  bookingId: string,
  limit = 5,
  offset = 0,
  includeVoided = false,
): Promise<BookingPayment[]> {
  const q = supabase
    .from("booking_payments")
    .select("id, property_id, booking_id, payment_type, method, amount, reference_no, is_voided, created_at, updated_at")
    .eq("property_id", propertyId)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (!includeVoided) q.eq("is_voided", false);
  const { data } = await q;
  return (data || []) as BookingPayment[];
}

export async function createBookingPayment(
  supabase: SupabaseClient,
  payload: Omit<BookingPayment, "id" | "created_at" | "updated_at" | "is_voided"> & { is_voided?: boolean },
): Promise<BookingPayment | null> {
  const { data, error } = await supabase
    .from("booking_payments")
    .insert({ ...payload })
    .select("id, property_id, booking_id, payment_type, method, amount, reference_no, is_voided, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as BookingPayment;
}

export async function voidBookingPayment(
  supabase: SupabaseClient,
  propertyId: string,
  paymentId: string,
): Promise<void> {
  const { error } = await supabase
    .from("booking_payments")
    .update({ is_voided: true })
    .eq("id", paymentId)
    .eq("property_id", propertyId);
  if (error) throw error;
}
