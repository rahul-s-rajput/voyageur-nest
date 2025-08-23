 import { supabase } from '../lib/supabase/index';

export type PaymentType = 'payment' | 'refund' | 'adjustment';

export interface BookingPayment {
  id: string;
  propertyId: string;
  bookingId: string;
  paymentType: PaymentType;
  method?: string;
  referenceNo?: string;
  amount: number;
  isVoided: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddPaymentInput {
  method?: string;
  referenceNo?: string;
  amount: number; // > 0
}

const ALLOWED_PAYMENT_TYPES: PaymentType[] = ['payment', 'refund', 'adjustment'];

const toDomain = (row: any): BookingPayment => ({
  id: row.id,
  propertyId: row.property_id,
  bookingId: row.booking_id,
  paymentType: row.payment_type,
  method: row.method || undefined,
  referenceNo: row.reference_no || undefined,
  amount: parseFloat(row.amount),
  isVoided: !!row.is_voided,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function verifyBookingScope(propertyId: string, bookingId: string): Promise<void> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('property_id', propertyId)
    .single();
  if (error || !data) {
    throw new Error('Booking not found for given property');
  }
}

function validateAmount(amount: number) {
  if (!(amount > 0)) throw new Error('Amount must be > 0');
}

export const bookingPaymentsService = {
  // List non-voided payments for a booking
  async listByBooking(propertyId: string, bookingId: string): Promise<BookingPayment[]> {
    const { data, error } = await supabase
      .from('booking_payments')
      .select('*')
      .eq('property_id', propertyId)
      .eq('booking_id', bookingId)
      .eq('is_voided', false)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(toDomain);
  },

  // Add a payment
  async addPayment(propertyId: string, bookingId: string, input: AddPaymentInput): Promise<BookingPayment> {
    await verifyBookingScope(propertyId, bookingId);
    validateAmount(input.amount);

    const payload = {
      property_id: propertyId,
      booking_id: bookingId,
      payment_type: 'payment' as const,
      method: input.method ?? null,
      reference_no: input.referenceNo ?? null,
      amount: input.amount,
    };

    const { data, error } = await supabase
      .from('booking_payments')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return toDomain(data);
  },

  // Add a refund
  async addRefund(propertyId: string, bookingId: string, input: AddPaymentInput): Promise<BookingPayment> {
    await verifyBookingScope(propertyId, bookingId);
    validateAmount(input.amount);

    const payload = {
      property_id: propertyId,
      booking_id: bookingId,
      payment_type: 'refund' as const,
      method: input.method ?? null,
      reference_no: input.referenceNo ?? null,
      amount: input.amount,
    };

    const { data, error } = await supabase
      .from('booking_payments')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return toDomain(data);
  },

  // Soft-void a payment/refund
  async void(propertyId: string, bookingId: string, id: string): Promise<BookingPayment> {
    await verifyBookingScope(propertyId, bookingId);
    const { data, error } = await supabase
      .from('booking_payments')
      .update({ is_voided: true })
      .eq('id', id)
      .eq('property_id', propertyId)
      .eq('booking_id', bookingId)
      .select('*')
      .single();
    if (error) throw error;
    return toDomain(data);
  },

  ALLOWED_PAYMENT_TYPES,
};
