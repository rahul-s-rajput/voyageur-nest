 import { supabase } from '../lib/supabase/index';

export type ChargeType = 'room' | 'fnb' | 'misc' | 'discount' | 'tax' | 'service_fee';

export interface BookingCharge {
  id: string;
  propertyId: string;
  bookingId: string;
  chargeType: ChargeType;
  description?: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  isVoided: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChargeInput {
  description?: string;
  quantity: number; // > 0
  unitAmount: number; // >= 0
  createdAt?: string; // ISO timestamp for backdating
}

export interface UpdateChargeInput {
  description?: string;
  quantity?: number; // > 0
  unitAmount?: number; // >= 0
}

const ALLOWED_CHARGE_TYPES: ChargeType[] = ['room', 'fnb', 'misc', 'discount', 'tax', 'service_fee'];

const toDomain = (row: any): BookingCharge => ({
  id: row.id,
  propertyId: row.property_id,
  bookingId: row.booking_id,
  chargeType: row.charge_type,
  description: row.description || undefined,
  quantity: parseFloat(row.quantity),
  unitAmount: parseFloat(row.unit_amount),
  amount: parseFloat(row.amount),
  isVoided: !!row.is_voided,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const computeLineTotal = (quantity: number, unitAmount: number): number => {
  const q = Number(quantity);
  const u = Number(unitAmount);
  const total = q * u;
  return Number.isFinite(total) ? parseFloat(total.toFixed(2)) : 0;
};

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

function validateChargeValues(input: { quantity: number; unitAmount: number }) {
  if (!(input.quantity > 0)) throw new Error('Quantity must be > 0');
  if (!(input.unitAmount >= 0)) throw new Error('Unit amount must be >= 0');
}

export const bookingChargesService = {
  // List all non-voided charges for a booking
  async listByBooking(propertyId: string, bookingId: string): Promise<BookingCharge[]> {
    const { data, error } = await supabase
      .from('booking_charges')
      .select('*')
      .eq('property_id', propertyId)
      .eq('booking_id', bookingId)
      .eq('is_voided', false)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(toDomain);
  },

  // Create an FnB charge
  async createFoodCharge(propertyId: string, bookingId: string, input: CreateChargeInput & { description?: string }): Promise<BookingCharge> {
    await verifyBookingScope(propertyId, bookingId);
    validateChargeValues(input);

    const payload: any = {
      property_id: propertyId,
      booking_id: bookingId,
      charge_type: 'fnb' as const,
      description: input.description ?? null,
      quantity: input.quantity,
      unit_amount: input.unitAmount,
      amount: computeLineTotal(input.quantity, input.unitAmount),
    };
    if (input.createdAt) payload.created_at = input.createdAt;

    const { data, error } = await supabase
      .from('booking_charges')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return toDomain(data);
  },

  // Create a Misc charge
  async createMiscCharge(propertyId: string, bookingId: string, input: CreateChargeInput & { description?: string }): Promise<BookingCharge> {
    await verifyBookingScope(propertyId, bookingId);
    validateChargeValues(input);

    const payload: any = {
      property_id: propertyId,
      booking_id: bookingId,
      charge_type: 'misc' as const,
      description: input.description ?? null,
      quantity: input.quantity,
      unit_amount: input.unitAmount,
      amount: computeLineTotal(input.quantity, input.unitAmount),
    };
    if (input.createdAt) payload.created_at = input.createdAt;

    const { data, error } = await supabase
      .from('booking_charges')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return toDomain(data);
  },

  // Update an existing charge (recomputes amount when qty/unit updated)
  async update(propertyId: string, bookingId: string, id: string, updates: UpdateChargeInput): Promise<BookingCharge> {
    await verifyBookingScope(propertyId, bookingId);

    const toUpdate: any = {};
    if (updates.description !== undefined) toUpdate.description = updates.description;
    if (updates.quantity !== undefined) {
      if (!(updates.quantity > 0)) throw new Error('Quantity must be > 0');
      toUpdate.quantity = updates.quantity;
    }
    if (updates.unitAmount !== undefined) {
      if (!(updates.unitAmount >= 0)) throw new Error('Unit amount must be >= 0');
      toUpdate.unit_amount = updates.unitAmount;
    }

    // If either quantity or unit_amount is updated, recompute amount server-side
    if (updates.quantity !== undefined || updates.unitAmount !== undefined) {
      const qty = updates.quantity ?? undefined;
      const unit = updates.unitAmount ?? undefined;
      // Need current values if one is missing
      if (qty === undefined || unit === undefined) {
        const { data: current, error: err0 } = await supabase
          .from('booking_charges')
          .select('quantity, unit_amount')
          .eq('id', id)
          .eq('property_id', propertyId)
          .eq('booking_id', bookingId)
          .single();
        if (err0 || !current) throw err0 || new Error('Charge not found');
        const q = qty ?? parseFloat(current.quantity);
        const u = unit ?? parseFloat(current.unit_amount);
        toUpdate.amount = computeLineTotal(q, u);
      } else {
        toUpdate.amount = computeLineTotal(qty, unit);
      }
    }

    const { data, error } = await supabase
      .from('booking_charges')
      .update(toUpdate)
      .eq('id', id)
      .eq('property_id', propertyId)
      .eq('booking_id', bookingId)
      .select('*')
      .single();
    if (error) throw error;
    return toDomain(data);
  },

  // Soft-void a charge
  async void(propertyId: string, bookingId: string, id: string): Promise<BookingCharge> {
    await verifyBookingScope(propertyId, bookingId);
    const { data, error } = await supabase
      .from('booking_charges')
      .update({ is_voided: true })
      .eq('id', id)
      .eq('property_id', propertyId)
      .eq('booking_id', bookingId)
      .select('*')
      .single();
    if (error) throw error;
    return toDomain(data);
  },

  // Utility exported for UI calculations (display-only)
  computeLineTotal,
  ALLOWED_CHARGE_TYPES,
};
