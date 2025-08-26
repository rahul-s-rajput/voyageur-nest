import { supabase } from '../lib/supabase/index';

export type ViolationType =
  | 'check-in-today'
  | 'check-out-today'
  | 'overdue-check-in'
  | 'overdue-check-out';

export interface BookingEnforcementViolation {
  id: string;
  propertyId: string;
  guestName: string;
  roomNo: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: string | null;
  cancelled: boolean;
  violationType: ViolationType;
  createdAt: string;
  updatedAt: string;
}

const toDomain = (row: any): BookingEnforcementViolation => ({
  id: row.id,
  propertyId: row.property_id,
  guestName: row.guest_name,
  roomNo: row.room_no ?? null,
  checkIn: row.check_in ?? null,
  checkOut: row.check_out ?? null,
  status: row.status ?? null,
  cancelled: !!row.cancelled,
  violationType: row.violation_type as ViolationType,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const bookingComplianceService = {
  async getTodayCount(propertyId: string): Promise<number> {
    const { count, error } = await supabase
      .from('booking_enforcement_violations_today')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId);
    if (error) throw error;
    return count ?? 0;
  },

  async getOverdueCount(propertyId: string): Promise<number> {
    const { count, error } = await supabase
      .from('booking_enforcement_violations_overdue')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId);
    if (error) throw error;
    return count ?? 0;
  },

  async listToday(propertyId: string): Promise<BookingEnforcementViolation[]> {
    const { data, error } = await supabase
      .from('booking_enforcement_violations_today')
      .select('*')
      .eq('property_id', propertyId)
      .order('check_in', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toDomain);
  },

  async listOverdue(propertyId: string): Promise<BookingEnforcementViolation[]> {
    const { data, error } = await supabase
      .from('booking_enforcement_violations_overdue')
      .select('*')
      .eq('property_id', propertyId)
      .order('check_in', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toDomain);
  },
};
