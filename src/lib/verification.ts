import { supabase } from './supabase';
import { CheckInData } from '../types/checkin';

export interface VerificationUpdateData {
  id_verification_status: 'verified' | 'rejected' | 'requires_review';
  verification_notes?: string;
  verified_by: string;
  verified_at: string;
}

export class VerificationService {
  /**
   * Update the verification status of a check-in record
   */
  async updateVerificationStatus(
    checkInId: string,
    status: 'verified' | 'rejected' | 'requires_review',
    staffId: string,
    staffName: string,
    notes?: string
  ): Promise<void> {
    try {
      const updateData: VerificationUpdateData = {
        id_verification_status: status,
        verification_notes: notes || null,
        verified_by: `${staffName} (${staffId})`,
        verified_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('checkin_data')
        .update(updateData)
        .eq('id', checkInId);

      if (error) {
        throw new Error(`Failed to update verification status: ${error.message}`);
      }

      console.log(`Verification status updated for check-in ${checkInId}: ${status}`);
    } catch (error) {
      console.error('Error updating verification status:', error);
      throw error;
    }
  }

  /**
   * Get all check-ins pending verification
   */
  async getPendingVerifications(): Promise<CheckInData[]> {
    try {
      const { data, error } = await supabase
        .from('checkin_data')
        .select('*')
        .or('id_verification_status.is.null,id_verification_status.eq.pending,id_verification_status.eq.requires_review')
        .order('form_completed_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch pending verifications: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      throw error;
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(): Promise<{
    pending: number;
    verified: number;
    rejected: number;
    requiresReview: number;
    total: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('checkin_data')
        .select('id_verification_status');

      if (error) {
        throw new Error(`Failed to fetch verification stats: ${error.message}`);
      }

      const stats = {
        pending: 0,
        verified: 0,
        rejected: 0,
        requiresReview: 0,
        total: data?.length || 0,
      };

      data?.forEach((record) => {
        const status = record.id_verification_status;
        switch (status) {
          case 'verified':
            stats.verified++;
            break;
          case 'rejected':
            stats.rejected++;
            break;
          case 'requires_review':
            stats.requiresReview++;
            break;
          default:
            stats.pending++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error fetching verification stats:', error);
      throw error;
    }
  }

  /**
   * Get check-in data by ID for verification review
   */
  async getCheckInForVerification(checkInId: string): Promise<CheckInData | null> {
    try {
      const { data, error } = await supabase
        .from('checkin_data')
        .select('*')
        .eq('id', checkInId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Record not found
        }
        throw new Error(`Failed to fetch check-in data: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching check-in for verification:', error);
      throw error;
    }
  }

  /**
   * Search check-ins by guest information
   */
  async searchCheckIns(query: string): Promise<CheckInData[]> {
    try {
      const { data, error } = await supabase
        .from('checkin_data')
        .select('*')
        .or(`firstName.ilike.%${query}%,lastName.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('form_completed_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(`Failed to search check-ins: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error searching check-ins:', error);
      throw error;
    }
  }

  /**
   * Get verification history for a specific check-in
   */
  async getVerificationHistory(checkInId: string): Promise<any[]> {
    // This would require a separate verification_history table
    // For now, we'll return the current verification data
    try {
      const checkIn = await this.getCheckInForVerification(checkInId);
      if (!checkIn) return [];

      const history = [];
      if (checkIn.verified_at) {
        history.push({
          id: 1,
          checkInId: checkIn.id,
          status: checkIn.id_verification_status,
          notes: checkIn.verification_notes,
          verifiedBy: checkIn.verified_by,
          verifiedAt: checkIn.verified_at,
        });
      }

      return history;
    } catch (error) {
      console.error('Error fetching verification history:', error);
      throw error;
    }
  }

  /**
   * Bulk update verification status for multiple check-ins
   */
  async bulkUpdateVerificationStatus(
    checkInIds: string[],
    status: 'verified' | 'rejected' | 'requires_review',
    staffId: string,
    staffName: string,
    notes?: string
  ): Promise<void> {
    try {
      const updateData: VerificationUpdateData = {
        id_verification_status: status,
        verification_notes: notes || null,
        verified_by: `${staffName} (${staffId})`,
        verified_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('checkin_data')
        .update(updateData)
        .in('id', checkInIds);

      if (error) {
        throw new Error(`Failed to bulk update verification status: ${error.message}`);
      }

      console.log(`Bulk verification status updated for ${checkInIds.length} check-ins: ${status}`);
    } catch (error) {
      console.error('Error bulk updating verification status:', error);
      throw error;
    }
  }
}

export default VerificationService;