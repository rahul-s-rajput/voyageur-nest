import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bookingChargesService } from '../../../services/bookingChargesService';

// Mock Supabase generic query builder
const mockSupabaseResponse = vi.fn();

const queryMock = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn(() => mockSupabaseResponse()),
  single: vi.fn(() => mockSupabaseResponse()),
};

vi.mock('../../../lib/supabase/index', () => ({
  supabase: {
    from: vi.fn(() => queryMock),
  }
}));

describe('bookingChargesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listByBooking returns non-voided charges mapped to domain', async () => {
    const row = {
      id: 'c1',
      property_id: 'p1',
      booking_id: 'b1',
      charge_type: 'fnb',
      description: 'Lunch',
      quantity: '2',
      unit_amount: '150.00',
      amount: '300.00',
      is_voided: false,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    mockSupabaseResponse.mockResolvedValueOnce({ data: [row], error: null });

    const res = await bookingChargesService.listByBooking('p1', 'b1');
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      id: 'c1',
      propertyId: 'p1',
      bookingId: 'b1',
      chargeType: 'fnb',
      quantity: 2,
      unitAmount: 150,
      amount: 300,
      isVoided: false,
    });
  });

  it('createFoodCharge validates scope and computes amount', async () => {
    // verifyBookingScope
    mockSupabaseResponse.mockResolvedValueOnce({ data: { id: 'b1' }, error: null });
    // insert
    const inserted = {
      id: 'c2',
      property_id: 'p1',
      booking_id: 'b1',
      charge_type: 'fnb',
      description: 'Dinner',
      quantity: 3,
      unit_amount: 100,
      amount: 300,
      is_voided: false,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    mockSupabaseResponse.mockResolvedValueOnce({ data: inserted, error: null });

    const res = await bookingChargesService.createFoodCharge('p1', 'b1', { description: 'Dinner', quantity: 3, unitAmount: 100 });
    expect(res.amount).toBe(300);
    expect(res.chargeType).toBe('fnb');
  });

  it('update recomputes amount when only unitAmount provided', async () => {
    // verify scope
    mockSupabaseResponse.mockResolvedValueOnce({ data: { id: 'b1' }, error: null });
    // fetch current
    mockSupabaseResponse.mockResolvedValueOnce({ data: { quantity: '2', unit_amount: '100' }, error: null });
    // update result
    const updated = {
      id: 'c3',
      property_id: 'p1',
      booking_id: 'b1',
      charge_type: 'misc',
      description: 'Amenity',
      quantity: 2,
      unit_amount: 125,
      amount: 250,
      is_voided: false,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:10:00Z',
    };
    mockSupabaseResponse.mockResolvedValueOnce({ data: updated, error: null });

    const res = await bookingChargesService.update('p1', 'b1', 'c3', { unitAmount: 125 });
    expect(res.amount).toBe(250);
    expect(res.unitAmount).toBe(125);
  });

  it('void marks charge as voided', async () => {
    // verify scope
    mockSupabaseResponse.mockResolvedValueOnce({ data: { id: 'b1' }, error: null });
    // update result
    const voided = {
      id: 'c4',
      property_id: 'p1',
      booking_id: 'b1',
      charge_type: 'misc',
      description: null,
      quantity: 1,
      unit_amount: 0,
      amount: 0,
      is_voided: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:10:00Z',
    };
    mockSupabaseResponse.mockResolvedValueOnce({ data: voided, error: null });

    const res = await bookingChargesService.void('p1', 'b1', 'c4');
    expect(res.isVoided).toBe(true);
  });
});
