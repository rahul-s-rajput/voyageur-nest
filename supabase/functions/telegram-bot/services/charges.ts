import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type BookingCharge = {
  id: string;
  property_id: string;
  booking_id: string;
  charge_type: "room" | "fnb" | "misc" | "discount" | "tax" | "service_fee";
  description: string | null;
  quantity: number;
  unit_amount: number;
  amount: number;
  is_voided: boolean;
  created_at: string;
  updated_at: string;
};

export async function listBookingCharges(
  supabase: SupabaseClient,
  propertyId: string,
  bookingId: string,
  limit = 5,
  offset = 0,
  includeVoided = false,
): Promise<BookingCharge[]> {
  const q = supabase
    .from("booking_charges")
    .select("id, property_id, booking_id, charge_type, description, quantity, unit_amount, amount, is_voided, created_at, updated_at")
    .eq("property_id", propertyId)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (!includeVoided) q.eq("is_voided", false);
  const { data } = await q;
  return (data || []) as BookingCharge[];
}

export async function createBookingCharge(
  supabase: SupabaseClient,
  payload: Omit<BookingCharge, "id" | "created_at" | "updated_at" | "is_voided"> & { is_voided?: boolean },
): Promise<BookingCharge | null> {
  const { data, error } = await supabase
    .from("booking_charges")
    .insert({ ...payload })
    .select("id, property_id, booking_id, charge_type, description, quantity, unit_amount, amount, is_voided, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as BookingCharge;
}

export async function voidBookingCharge(
  supabase: SupabaseClient,
  propertyId: string,
  chargeId: string,
): Promise<void> {
  const { error } = await supabase
    .from("booking_charges")
    .update({ is_voided: true })
    .eq("id", chargeId)
    .eq("property_id", propertyId);
  if (error) throw error;
}
