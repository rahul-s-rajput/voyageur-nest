import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bookingPaymentsService } from '../../../services/bookingPaymentsService';

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

describe('bookingPaymentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listByBooking returns non-voided payments mapped to domain', async () => {
    const row = {
      id: 'p1',
      property_id: 'prop1',
      booking_id: 'b1',
      payment_type: 'payment',
      method: 'cash',
      reference_no: 'R-001',
      amount: '500.00',
      is_voided: false,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    mockSupabaseResponse.mockResolvedValueOnce({ data: [row], error: null });

    const res = await bookingPaymentsService.listByBooking('prop1', 'b1');
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      id: 'p1',
      propertyId: 'prop1',
      bookingId: 'b1',
      paymentType: 'payment',
      method: 'cash',
      referenceNo: 'R-001',
      amount: 500,
      isVoided: false,
    });
  });

  it('addPayment validates scope and inserts payment', async () => {
    // verifyBookingScope
    mockSupabaseResponse.mockResolvedValueOnce({ data: { id: 'b1' }, error: null });
    // insert payment
    const inserted = {
      id: 'p2',
      property_id: 'prop1',
      booking_id: 'b1',
      payment_type: 'payment',
      method: 'upi',
      reference_no: 'UPI-123',
      amount: 750,
      is_voided: false,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    mockSupabaseResponse.mockResolvedValueOnce({ data: inserted, error: null });

    const res = await bookingPaymentsService.addPayment('prop1', 'b1', { method: 'upi', referenceNo: 'UPI-123', amount: 750 });
    expect(res.amount).toBe(750);
    expect(res.paymentType).toBe('payment');
  });

  it('addRefund validates scope and inserts refund', async () => {
    // verifyBookingScope
    mockSupabaseResponse.mockResolvedValueOnce({ data: { id: 'b1' }, error: null });
    // insert refund
    const inserted = {
      id: 'p3',
      property_id: 'prop1',
      booking_id: 'b1',
      payment_type: 'refund',
      method: 'cash',
      reference_no: 'RF-1',
      amount: 100,
      is_voided: false,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    mockSupabaseResponse.mockResolvedValueOnce({ data: inserted, error: null });

    const res = await bookingPaymentsService.addRefund('prop1', 'b1', { method: 'cash', referenceNo: 'RF-1', amount: 100 });
    expect(res.amount).toBe(100);
    expect(res.paymentType).toBe('refund');
  });

  it('void marks payment/refund as voided', async () => {
    // verify scope
    mockSupabaseResponse.mockResolvedValueOnce({ data: { id: 'b1' }, error: null });
    // update result
    const voided = {
      id: 'p4',
      property_id: 'prop1',
      booking_id: 'b1',
      payment_type: 'payment',
      method: 'cash',
      reference_no: 'V-1',
      amount: 0,
      is_voided: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:10:00Z',
    };
    mockSupabaseResponse.mockResolvedValueOnce({ data: voided, error: null });

    const res = await bookingPaymentsService.void('prop1', 'b1', 'p4');
    expect(res.isVoided).toBe(true);
  });
});
