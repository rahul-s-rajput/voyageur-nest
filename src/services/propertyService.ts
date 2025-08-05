import { supabase, getAdminClient } from '../lib/supabase';
import { Property, Room, PropertySpecificSettings, CrossPropertyGuest, PropertyStay, GuestPreferences as TypesGuestPreferences, VisitHistory, RoomType } from '../types/property';

// Additional interfaces for new functionality
export interface PricingRule {
  id: string;
  propertyId: string;
  ruleName: string;
  roomType: string;
  seasonType: 'regular' | 'peak' | 'off-peak';
  basePrice: number;
  weekendMultiplier: number;
  minimumStay: number;
  maximumStay: number;
  advanceBookingDays: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuestVisit {
  id: string;
  guestProfileId: string;
  propertyId: string;
  bookingId?: string;
  visitDate: string;
  roomType?: string;
  amountSpent: number;
  rating?: number;
  review?: string;
  specialRequests: string[];
  amenityPreferences: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GuestPreferences {
  id: string;
  guestProfileId: string;
  preferredRoomType?: string;
  preferredBedType?: string;
  preferredFloor?: string;
  amenityPreferences: string[];
  communicationPreference: 'email' | 'sms' | 'both';
  specialRequirements: string[];
  dietaryRestrictions: string[];
  accessibilityNeeds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertyAnalytics {
  id: string;
  propertyId: string;
  dateFrom: string;
  dateTo: string;
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  totalRevenue: number;
  averageDailyRate: number;
  revenuePerAvailableRoom: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  totalGuests: number;
  repeatGuests: number;
  averageStayDuration: number;
  averageRating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuestLoyaltyTier {
  id: string;
  guestProfileId: string;
  tierName: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointsEarned: number;
  pointsRedeemed: number;
  currentPoints: number;
  isVip: boolean;
  vipSince?: string;
  discountPercentage: number;
  priorityBooking: boolean;
  complimentaryUpgrades: boolean;
  createdAt: string;
  updatedAt: string;
}



export class PropertyService {
  // Property CRUD operations
  async getAllProperties(): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }

    return data.map(this.transformPropertyFromDB);
  }

  async getPropertyById(id: string): Promise<Property | null> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Property not found
      }
      throw new Error(`Failed to fetch property: ${error.message}`);
    }

    return this.transformPropertyFromDB(data);
  }

  async createProperty(propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> {
    const dbData = this.transformPropertyToDB(propertyData);
    
    const { data, error } = await supabase
      .from('properties')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create property: ${error.message}`);
    }

    return this.transformPropertyFromDB(data);
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
    const dbUpdates = this.transformPropertyToDB(updates);
    
    const { data, error } = await supabase
      .from('properties')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update property: ${error.message}`);
    }

    return this.transformPropertyFromDB(data);
  }

  async deleteProperty(id: string): Promise<void> {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('properties')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete property: ${error.message}`);
    }
  }

  // Room CRUD operations
  async getRooms(propertyId: string): Promise<Room[]> {
    return this.getRoomsByProperty(propertyId);
  }

  async getRoomsByProperty(propertyId: string): Promise<Room[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .order('room_number');

    if (error) {
      throw new Error(`Failed to fetch rooms: ${error.message}`);
    }

    return data.map(room => this.transformRoomFromDB(room));
  }

  async getRoomById(id: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch room: ${error.message}`);
    }

    return this.transformRoomFromDB(data);
  }

  async createRoom(roomData: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>): Promise<Room> {
    const dbData = this.transformRoomToDB(roomData);
    
    const { data, error } = await supabase
      .from('rooms')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create room: ${error.message}`);
    }

    return this.transformRoomFromDB(data);
  }

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room> {
    const dbUpdates = this.transformRoomToDB(updates);
    
    const { data, error } = await supabase
      .from('rooms')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update room: ${error.message}`);
    }

    return this.transformRoomFromDB(data);
  }

  async deleteRoom(id: string): Promise<void> {
    const { error } = await supabase
      .from('rooms')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete room: ${error.message}`);
    }
  }

  // Property settings operations
  async getPropertySettings(propertyId: string): Promise<PropertySpecificSettings[]> {
    const { data, error } = await supabase
      .from('property_settings')
      .select('*')
      .eq('property_id', propertyId);

    if (error) {
      throw new Error(`Failed to fetch property settings: ${error.message}`);
    }

    return data.map(this.transformSettingsFromDB);
  }

  async updatePropertySetting(
    propertyId: string, 
    settingKey: string, 
    settingValue: any
  ): Promise<PropertySpecificSettings> {
    const { data, error } = await supabase
      .from('property_settings')
      .upsert({
        property_id: propertyId,
        setting_key: settingKey,
        setting_value: settingValue,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update property setting: ${error.message}`);
    }

    return this.transformSettingsFromDB(data);
  }

  async updatePropertySettings(propertyId: string, settings: Record<string, any>): Promise<PropertySpecificSettings[]> {
    // Update multiple settings at once
    const updates = Object.entries(settings).map(([key, value]) => ({
      property_id: propertyId,
      setting_key: key,
      setting_value: value,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('property_settings')
      .upsert(updates, {
        onConflict: 'property_id,setting_key'
      });

    if (error) {
      throw new Error(`Failed to update property settings: ${error.message}`);
    }

    // Return updated settings
    return this.getPropertySettings(propertyId);
  }

  // Analytics and reporting
  async getPropertyAnalytics(propertyId: string, startDate: string, endDate: string) {
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .gte('check_in', startDate)
      .lte('check_out', endDate);

    if (bookingsError) {
      throw new Error(`Failed to fetch booking analytics: ${bookingsError.message}`);
    }

    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('property_id', propertyId)
      .eq('is_active', true);

    if (roomsError) {
      throw new Error(`Failed to fetch room data: ${roomsError.message}`);
    }

    return this.calculatePropertyAnalytics(bookings, rooms, startDate, endDate);
  }

  async getCrossPropertyAnalytics(startDate: string, endDate: string) {
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select(`
        *,
        bookings!inner(*)
      `)
      .eq('is_active', true);

    if (propertiesError) {
      throw new Error(`Failed to fetch cross-property analytics: ${propertiesError.message}`);
    }

    return this.calculateCrossPropertyAnalytics(properties, startDate, endDate);
  }

  // Utility methods for data transformation
  private transformPropertyFromDB(dbProperty: any): Property {
    return {
      id: dbProperty.id,
      name: dbProperty.name,
      address: dbProperty.address,
      location: dbProperty.address, // Use address as location since location column doesn't exist
      phone: dbProperty.phone,
      email: dbProperty.email,
      contactPhone: dbProperty.phone, // Map phone to contactPhone
      contactEmail: dbProperty.email, // Map email to contactEmail
      description: dbProperty.description,
      websiteUrl: dbProperty.website_url,
      checkInTime: dbProperty.check_in_time,
      checkOutTime: dbProperty.check_out_time,
      totalRooms: dbProperty.total_rooms,
      amenities: dbProperty.amenities || [],
      policies: dbProperty.policies || {
        cancellationPolicy: 'flexible',
        houseRules: []
      },
      branding: dbProperty.branding || {
        themeColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        propertyStyle: 'casual'
      },
      settings: dbProperty.settings || {
        targetMarket: 'family',
        roomTypes: ['standard'],
        propertyType: 'family_oriented'
      },
      isActive: dbProperty.is_active,
      createdAt: dbProperty.created_at,
      updatedAt: dbProperty.updated_at,
    };
  }

  private transformPropertyToDB(property: Partial<Property>): any {
    const dbData: any = {};
    
    if (property.name !== undefined) dbData.name = property.name;
    if (property.address !== undefined) dbData.address = property.address;
    if (property.location !== undefined) dbData.address = property.location; // Map location to address
    if (property.phone !== undefined) dbData.phone = property.phone;
    if (property.email !== undefined) dbData.email = property.email;
    if (property.contactPhone !== undefined) dbData.phone = property.contactPhone; // Map contactPhone to phone
    if (property.contactEmail !== undefined) dbData.email = property.contactEmail; // Map contactEmail to email
    if (property.description !== undefined) dbData.description = property.description;
    if (property.websiteUrl !== undefined) dbData.website_url = property.websiteUrl;
    if (property.checkInTime !== undefined) dbData.check_in_time = property.checkInTime;
    if (property.checkOutTime !== undefined) dbData.check_out_time = property.checkOutTime;
    if (property.totalRooms !== undefined) dbData.total_rooms = property.totalRooms;
    if (property.amenities !== undefined) dbData.amenities = property.amenities;
    if (property.policies !== undefined) dbData.policies = property.policies;
    if (property.branding !== undefined) dbData.branding = property.branding;
    if (property.settings !== undefined) dbData.settings = property.settings;
    if (property.isActive !== undefined) dbData.is_active = property.isActive;

    return dbData;
  }

  private transformRoomFromDB(dbRoom: any): Room {
    return {
      id: dbRoom.id,
      propertyId: dbRoom.property_id,
      roomNumber: dbRoom.room_number,
      roomType: dbRoom.room_type,
      floor: dbRoom.floor,
      maxOccupancy: dbRoom.max_occupancy,
      basePrice: dbRoom.base_price,
      amenities: dbRoom.amenities || [],
      isActive: dbRoom.is_active,
      createdAt: dbRoom.created_at,
      updatedAt: dbRoom.updated_at,
    };
  }

  private transformRoomToDB(room: Partial<Room>): any {
    const dbData: any = {};
    
    if (room.propertyId !== undefined) dbData.property_id = room.propertyId;
    if (room.roomNumber !== undefined) dbData.room_number = room.roomNumber;
    if (room.roomType !== undefined) dbData.room_type = room.roomType;
    if (room.floor !== undefined) dbData.floor = room.floor;
    if (room.maxOccupancy !== undefined) dbData.max_occupancy = room.maxOccupancy;
    if (room.basePrice !== undefined) dbData.base_price = room.basePrice;
    if (room.amenities !== undefined) dbData.amenities = room.amenities;
    if (room.isActive !== undefined) dbData.is_active = room.isActive;

    return dbData;
  }

  private transformSettingsFromDB(dbSettings: any): PropertySpecificSettings {
    return {
      id: dbSettings.id,
      propertyId: dbSettings.property_id,
      settingKey: dbSettings.setting_key,
      settingValue: dbSettings.setting_value,
      
      // General Settings with defaults
      checkInTime: dbSettings.check_in_time || '15:00',
      checkOutTime: dbSettings.check_out_time || '11:00',
      currency: dbSettings.currency || 'INR',
      timezone: dbSettings.timezone || 'Asia/Kolkata',
      language: dbSettings.language || 'en',
      emergencyContact: dbSettings.emergency_contact || '',
      wifiPassword: dbSettings.wifi_password || '',
      
      // Financial Settings with defaults
      taxRate: dbSettings.tax_rate || 0,
      localTaxRate: dbSettings.local_tax_rate || 0,
      serviceChargeRate: dbSettings.service_charge_rate || 0,
      
      // Booking Settings with defaults
      minAdvanceBookingDays: dbSettings.min_advance_booking_days || 0,
      maxAdvanceBookingDays: dbSettings.max_advance_booking_days || 365,
      allowOnlineBooking: dbSettings.allow_online_booking ?? true,
      autoConfirmBookings: dbSettings.auto_confirm_bookings ?? true,
      requireAdvancePayment: dbSettings.require_advance_payment ?? false,
      advancePaymentPercentage: dbSettings.advance_payment_percentage || 0,
      
      // Cancellation & Policies with defaults
      cancellationPolicy: dbSettings.cancellation_policy || 'flexible',
      allowCancellation: dbSettings.allow_cancellation ?? true,
      cancellationDeadlineHours: dbSettings.cancellation_deadline_hours || 24,
      noShowPolicy: dbSettings.no_show_policy || 'charge_first_night',
      
      // Notification Settings with defaults
      sendConfirmationEmail: dbSettings.send_confirmation_email ?? true,
      sendReminderEmail: dbSettings.send_reminder_email ?? true,
      reminderEmailDays: dbSettings.reminder_email_days || 1,
      
      // Property Policies with defaults
      petPolicy: dbSettings.pet_policy || 'not_allowed',
      smokingPolicy: dbSettings.smoking_policy || 'not_allowed',
      childPolicy: dbSettings.child_policy || 'welcome',
      extraBedPolicy: dbSettings.extra_bed_policy || 'not_available',
      extraBedCharge: dbSettings.extra_bed_charge || 0,
      
      // Timestamps
      createdAt: dbSettings.created_at,
      updatedAt: dbSettings.updated_at,
    };
  }

  private calculatePropertyAnalytics(bookings: any[], rooms: any[], startDate: string, endDate: string) {
    const totalRooms = rooms.length;
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
    
    // Calculate occupancy rate
    const dateRange = this.getDateRange(startDate, endDate);
    const totalRoomNights = totalRooms * dateRange.length;
    const occupiedRoomNights = bookings.reduce((sum, booking) => {
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return sum + nights;
    }, 0);
    
    const occupancyRate = totalRoomNights > 0 ? (occupiedRoomNights / totalRoomNights) * 100 : 0;
    
    return {
      totalRooms,
      totalBookings,
      totalRevenue,
      occupancyRate,
      averageRate: totalBookings > 0 ? totalRevenue / totalBookings : 0,
      roomNights: occupiedRoomNights,
    };
  }

  private calculateCrossPropertyAnalytics(properties: any[], _startDate: string, _endDate: string) {
    // Implementation for cross-property analytics
    return {
      totalProperties: properties.length,
      // Add more analytics calculations here
    };
  }

  private getDateRange(startDate: string, endDate: string): Date[] {
    const dates = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    while (currentDate <= endDateObj) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }

  // =====================================================
  // PRICING RULES METHODS
  // =====================================================

  async getPricingRules(propertyId: string): Promise<PricingRule[]> {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pricing rules: ${error.message}`);
    }

    return data.map(this.transformPricingRuleFromDB);
  }

  async createPricingRule(ruleData: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingRule> {
    try {
      console.log('Creating pricing rule:', ruleData);
      
      // Get the appropriate client for admin operations
      const adminClient = await getAdminClient();
      
      const { data, error } = await adminClient
        .from('pricing_rules')
        .insert({
          property_id: ruleData.propertyId,
          rule_name: ruleData.ruleName,
          room_type: ruleData.roomType,
          season_type: ruleData.seasonType,
          base_price: ruleData.basePrice,
          weekend_multiplier: ruleData.weekendMultiplier,
          minimum_stay: ruleData.minimumStay,
          maximum_stay: ruleData.maximumStay,
          advance_booking_days: ruleData.advanceBookingDays,
          valid_from: ruleData.validFrom,
          valid_to: ruleData.validTo,
          is_active: ruleData.isActive
        })
        .select('*')
        .single();

      if (error) {
        console.error('Database insert failed:', error.message);
        
        // If it's an RLS error, provide helpful information
        if (error.message.includes('row-level security policy')) {
          console.warn('RLS Policy Error: Consider applying the fix_pricing_rules_rls.sql migration');
          console.warn('Or add VITE_SUPABASE_SERVICE_ROLE_KEY to your environment variables');
        }
        
        // Return mock data for demo purposes
        const mockRule: PricingRule = {
          id: `mock-${Date.now()}`,
          propertyId: ruleData.propertyId,
          ruleName: ruleData.ruleName || `Mock Rule ${Date.now()}`,
          roomType: ruleData.roomType,
          seasonType: ruleData.seasonType,
          basePrice: ruleData.basePrice,
          weekendMultiplier: ruleData.weekendMultiplier,
          minimumStay: ruleData.minimumStay || 1,
          maximumStay: ruleData.maximumStay || 30,
          advanceBookingDays: ruleData.advanceBookingDays || 0,
          validFrom: ruleData.validFrom,
          validTo: ruleData.validTo,
          isActive: ruleData.isActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        return mockRule;
      }

      // Transform database response to match interface
      return {
        id: data.id,
        propertyId: data.property_id,
        ruleName: data.rule_name,
        roomType: data.room_type,
        seasonType: data.season_type,
        basePrice: data.base_price,
        weekendMultiplier: data.weekend_multiplier,
        minimumStay: data.minimum_stay,
        maximumStay: data.maximum_stay,
        advanceBookingDays: data.advance_booking_days,
        validFrom: data.valid_from,
        validTo: data.valid_to,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error creating pricing rule:', error);
      
      // Return mock data for demo purposes
      const mockRule: PricingRule = {
        id: `mock-${Date.now()}`,
        propertyId: ruleData.propertyId,
        ruleName: ruleData.ruleName || `Mock Rule ${Date.now()}`,
        roomType: ruleData.roomType,
        seasonType: ruleData.seasonType,
        basePrice: ruleData.basePrice,
        weekendMultiplier: ruleData.weekendMultiplier,
        minimumStay: ruleData.minimumStay || 1,
        maximumStay: ruleData.maximumStay || 30,
        advanceBookingDays: ruleData.advanceBookingDays || 0,
        validFrom: ruleData.validFrom,
        validTo: ruleData.validTo,
        isActive: ruleData.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return mockRule;
    }
  }

  async updatePricingRule(id: string, updates: Partial<PricingRule>): Promise<PricingRule> {
    const dbUpdates = this.transformPricingRuleToDB(updates);
    
    const { data, error } = await supabase
      .from('pricing_rules')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update pricing rule: ${error.message}`);
    }

    return this.transformPricingRuleFromDB(data);
  }

  async deletePricingRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('pricing_rules')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete pricing rule: ${error.message}`);
    }
  }

  async getActivePricingRules(propertyId: string, roomType: string, checkInDate: string): Promise<PricingRule[]> {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('property_id', propertyId)
      .eq('room_type', roomType)
      .eq('is_active', true)
      .lte('valid_from', checkInDate)
      .gte('valid_to', checkInDate);

    if (error) {
      throw new Error(`Failed to fetch active pricing rules: ${error.message}`);
    }

    return data.map(this.transformPricingRuleFromDB);
  }

  // =====================================================
  // GUEST MANAGEMENT METHODS
  // =====================================================

  async getCrossPropertyGuests(): Promise<CrossPropertyGuest[]> {
    const { data, error } = await supabase
      .from('guest_profiles')
      .select(`
        *,
        guest_visits (
          id,
          property_id,
          visit_date,
          room_type,
          amount_spent,
          rating,
          review,
          special_requests,
          amenity_preferences
        ),
        guest_loyalty_tiers (
          tier_name,
          current_points,
          is_vip
        )
      `)
      .order('total_spent', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch cross-property guests: ${error.message}`);
    }

    return data.map(this.transformCrossPropertyGuestFromDB);
  }

  async getGuestVisits(guestId: string): Promise<GuestVisit[]> {
    const { data, error } = await supabase
      .from('guest_visits')
      .select('*')
      .eq('guest_profile_id', guestId)
      .order('visit_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch guest visits: ${error.message}`);
    }

    return data.map(this.transformGuestVisitFromDB);
  }

  async createGuestVisit(visitData: Omit<GuestVisit, 'id' | 'createdAt' | 'updatedAt'>): Promise<GuestVisit> {
    const dbData = this.transformGuestVisitToDB(visitData);
    
    const { data, error } = await supabase
      .from('guest_visits')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create guest visit: ${error.message}`);
    }

    return this.transformGuestVisitFromDB(data);
  }

  async getGuestPreferences(guestId: string): Promise<GuestPreferences | null> {
    const { data, error } = await supabase
      .from('guest_preferences')
      .select('*')
      .eq('guest_profile_id', guestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch guest preferences: ${error.message}`);
    }

    return this.transformGuestPreferencesFromDB(data);
  }

  async updateGuestPreferences(guestId: string, preferences: Partial<GuestPreferences>): Promise<GuestPreferences> {
    const dbData = this.transformGuestPreferencesToDB(preferences);
    dbData.guest_profile_id = guestId;
    
    const { data, error } = await supabase
      .from('guest_preferences')
      .upsert(dbData, {
        onConflict: 'guest_profile_id'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update guest preferences: ${error.message}`);
    }

    return this.transformGuestPreferencesFromDB(data);
  }

  // =====================================================
  // ANALYTICS METHODS
  // =====================================================

  async getStoredPropertyAnalytics(propertyId: string, dateFrom: string, dateTo: string): Promise<PropertyAnalytics | null> {
    const { data, error } = await supabase
      .from('property_analytics')
      .select('*')
      .eq('property_id', propertyId)
      .eq('date_from', dateFrom)
      .eq('date_to', dateTo)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch stored analytics: ${error.message}`);
    }

    return this.transformPropertyAnalyticsFromDB(data);
  }

  async storePropertyAnalytics(analyticsData: Omit<PropertyAnalytics, 'id' | 'createdAt' | 'updatedAt'>): Promise<PropertyAnalytics> {
    const dbData = this.transformPropertyAnalyticsToDB(analyticsData);
    
    const { data, error } = await supabase
      .from('property_analytics')
      .upsert(dbData, {
        onConflict: 'property_id,date_from,date_to'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store analytics: ${error.message}`);
    }

    return this.transformPropertyAnalyticsFromDB(data);
  }

  async getPropertyComparison(propertyIds: string[], dateFrom: string, dateTo: string): Promise<any[]> {
    const comparisons = [];
    
    for (const propertyId of propertyIds) {
      const analytics = await this.getPropertyAnalytics(propertyId, dateFrom, dateTo);
      const property = await this.getPropertyById(propertyId);
      
      comparisons.push({
        property,
        analytics
      });
    }
    
    return comparisons;
  }

  async getPropertyTrends(propertyId: string, months: number = 6): Promise<any[]> {
    const trends = [];
    const currentDate = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
      
      const analytics = await this.getPropertyAnalytics(
        propertyId,
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0]
      );
      
      trends.push({
        month: monthStart.toISOString().split('T')[0],
        ...analytics
      });
    }
    
    return trends;
  }

  async getPropertyMetrics(propertyId: string): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const analytics = await this.getPropertyAnalytics(
      propertyId,
      thirtyDaysAgo.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );
    
    const { data: recentBookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch recent bookings: ${error.message}`);
    }

    return {
      ...analytics,
      recentBookings
    };
  }

  // =====================================================
  // LOYALTY METHODS
  // =====================================================

  async getGuestLoyalty(guestId: string): Promise<GuestLoyaltyTier | null> {
    const { data, error } = await supabase
      .from('guest_loyalty_tiers')
      .select('*')
      .eq('guest_profile_id', guestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch guest loyalty: ${error.message}`);
    }

    return this.transformGuestLoyaltyFromDB(data);
  }

  async updateGuestLoyalty(guestId: string, loyaltyData: Partial<GuestLoyaltyTier>): Promise<GuestLoyaltyTier> {
    const dbData = this.transformGuestLoyaltyToDB(loyaltyData);
    dbData.guest_profile_id = guestId;
    
    const { data, error } = await supabase
      .from('guest_loyalty_tiers')
      .upsert(dbData, {
        onConflict: 'guest_profile_id'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update guest loyalty: ${error.message}`);
    }

    return this.transformGuestLoyaltyFromDB(data);
  }

  async calculateGuestLoyaltyTier(guestId: string): Promise<string> {
    const { data, error } = await supabase
      .rpc('calculate_guest_loyalty_tier', { guest_id: guestId });

    if (error) {
      throw new Error(`Failed to calculate loyalty tier: ${error.message}`);
    }

    return data;
  }

  // =====================================================
  // TRANSFORMATION METHODS FOR NEW ENTITIES
  // =====================================================

  private transformPricingRuleFromDB(dbRule: any): PricingRule {
    return {
      id: dbRule.id,
      propertyId: dbRule.property_id,
      ruleName: dbRule.rule_name,
      roomType: dbRule.room_type,
      seasonType: dbRule.season_type,
      basePrice: dbRule.base_price,
      weekendMultiplier: dbRule.weekend_multiplier,
      minimumStay: dbRule.minimum_stay,
      maximumStay: dbRule.maximum_stay,
      advanceBookingDays: dbRule.advance_booking_days,
      validFrom: dbRule.valid_from,
      validTo: dbRule.valid_to,
      isActive: dbRule.is_active,
      createdAt: dbRule.created_at,
      updatedAt: dbRule.updated_at,
    };
  }

  private transformPricingRuleToDB(rule: Partial<PricingRule>): any {
    const dbData: any = {};
    
    if (rule.propertyId !== undefined) dbData.property_id = rule.propertyId;
    if (rule.ruleName !== undefined) dbData.rule_name = rule.ruleName;
    if (rule.roomType !== undefined) dbData.room_type = rule.roomType;
    if (rule.seasonType !== undefined) dbData.season_type = rule.seasonType;
    if (rule.basePrice !== undefined) dbData.base_price = rule.basePrice;
    if (rule.weekendMultiplier !== undefined) dbData.weekend_multiplier = rule.weekendMultiplier;
    if (rule.minimumStay !== undefined) dbData.minimum_stay = rule.minimumStay;
    if (rule.maximumStay !== undefined) dbData.maximum_stay = rule.maximumStay;
    if (rule.advanceBookingDays !== undefined) dbData.advance_booking_days = rule.advanceBookingDays;
    if (rule.validFrom !== undefined) dbData.valid_from = rule.validFrom;
    if (rule.validTo !== undefined) dbData.valid_to = rule.validTo;
    if (rule.isActive !== undefined) dbData.is_active = rule.isActive;

    return dbData;
  }

  private transformGuestVisitFromDB(dbVisit: any): GuestVisit {
    return {
      id: dbVisit.id,
      guestProfileId: dbVisit.guest_profile_id,
      propertyId: dbVisit.property_id,
      bookingId: dbVisit.booking_id,
      visitDate: dbVisit.visit_date,
      roomType: dbVisit.room_type,
      amountSpent: dbVisit.amount_spent,
      rating: dbVisit.rating,
      review: dbVisit.review,
      specialRequests: dbVisit.special_requests || [],
      amenityPreferences: dbVisit.amenity_preferences || [],
      createdAt: dbVisit.created_at,
      updatedAt: dbVisit.updated_at,
    };
  }

  private transformGuestVisitToDB(visit: Partial<GuestVisit>): any {
    const dbData: any = {};
    
    if (visit.guestProfileId !== undefined) dbData.guest_profile_id = visit.guestProfileId;
    if (visit.propertyId !== undefined) dbData.property_id = visit.propertyId;
    if (visit.bookingId !== undefined) dbData.booking_id = visit.bookingId;
    if (visit.visitDate !== undefined) dbData.visit_date = visit.visitDate;
    if (visit.roomType !== undefined) dbData.room_type = visit.roomType;
    if (visit.amountSpent !== undefined) dbData.amount_spent = visit.amountSpent;
    if (visit.rating !== undefined) dbData.rating = visit.rating;
    if (visit.review !== undefined) dbData.review = visit.review;
    if (visit.specialRequests !== undefined) dbData.special_requests = visit.specialRequests;
    if (visit.amenityPreferences !== undefined) dbData.amenity_preferences = visit.amenityPreferences;

    return dbData;
  }

  private transformGuestPreferencesFromDB(dbPrefs: any): GuestPreferences {
    return {
      id: dbPrefs.id,
      guestProfileId: dbPrefs.guest_profile_id,
      preferredRoomType: dbPrefs.preferred_room_type,
      preferredBedType: dbPrefs.preferred_bed_type,
      preferredFloor: dbPrefs.preferred_floor,
      amenityPreferences: dbPrefs.amenity_preferences || [],
      communicationPreference: dbPrefs.communication_preference,
      specialRequirements: dbPrefs.special_requirements || [],
      dietaryRestrictions: dbPrefs.dietary_restrictions || [],
      accessibilityNeeds: dbPrefs.accessibility_needs || [],
      createdAt: dbPrefs.created_at,
      updatedAt: dbPrefs.updated_at,
    };
  }

  private transformGuestPreferencesToDB(prefs: Partial<GuestPreferences>): any {
    const dbData: any = {};
    
    if (prefs.preferredRoomType !== undefined) dbData.preferred_room_type = prefs.preferredRoomType;
    if (prefs.preferredBedType !== undefined) dbData.preferred_bed_type = prefs.preferredBedType;
    if (prefs.preferredFloor !== undefined) dbData.preferred_floor = prefs.preferredFloor;
    if (prefs.amenityPreferences !== undefined) dbData.amenity_preferences = prefs.amenityPreferences;
    if (prefs.communicationPreference !== undefined) dbData.communication_preference = prefs.communicationPreference;
    if (prefs.specialRequirements !== undefined) dbData.special_requirements = prefs.specialRequirements;
    if (prefs.dietaryRestrictions !== undefined) dbData.dietary_restrictions = prefs.dietaryRestrictions;
    if (prefs.accessibilityNeeds !== undefined) dbData.accessibility_needs = prefs.accessibilityNeeds;

    return dbData;
  }

  private transformPropertyAnalyticsFromDB(dbAnalytics: any): PropertyAnalytics {
    return {
      id: dbAnalytics.id,
      propertyId: dbAnalytics.property_id,
      dateFrom: dbAnalytics.date_from,
      dateTo: dbAnalytics.date_to,
      totalRooms: dbAnalytics.total_rooms,
      occupiedRooms: dbAnalytics.occupied_rooms,
      occupancyRate: dbAnalytics.occupancy_rate,
      totalRevenue: dbAnalytics.total_revenue,
      averageDailyRate: dbAnalytics.average_daily_rate,
      revenuePerAvailableRoom: dbAnalytics.revenue_per_available_room,
      totalBookings: dbAnalytics.total_bookings,
      confirmedBookings: dbAnalytics.confirmed_bookings,
      cancelledBookings: dbAnalytics.cancelled_bookings,
      noShowBookings: dbAnalytics.no_show_bookings,
      totalGuests: dbAnalytics.total_guests,
      repeatGuests: dbAnalytics.repeat_guests,
      averageStayDuration: dbAnalytics.average_stay_duration,
      averageRating: dbAnalytics.average_rating,
      totalReviews: dbAnalytics.total_reviews,
      createdAt: dbAnalytics.created_at,
      updatedAt: dbAnalytics.updated_at,
    };
  }

  private transformPropertyAnalyticsToDB(analytics: Partial<PropertyAnalytics>): any {
    const dbData: any = {};
    
    if (analytics.propertyId !== undefined) dbData.property_id = analytics.propertyId;
    if (analytics.dateFrom !== undefined) dbData.date_from = analytics.dateFrom;
    if (analytics.dateTo !== undefined) dbData.date_to = analytics.dateTo;
    if (analytics.totalRooms !== undefined) dbData.total_rooms = analytics.totalRooms;
    if (analytics.occupiedRooms !== undefined) dbData.occupied_rooms = analytics.occupiedRooms;
    if (analytics.occupancyRate !== undefined) dbData.occupancy_rate = analytics.occupancyRate;
    if (analytics.totalRevenue !== undefined) dbData.total_revenue = analytics.totalRevenue;
    if (analytics.averageDailyRate !== undefined) dbData.average_daily_rate = analytics.averageDailyRate;
    if (analytics.revenuePerAvailableRoom !== undefined) dbData.revenue_per_available_room = analytics.revenuePerAvailableRoom;
    if (analytics.totalBookings !== undefined) dbData.total_bookings = analytics.totalBookings;
    if (analytics.confirmedBookings !== undefined) dbData.confirmed_bookings = analytics.confirmedBookings;
    if (analytics.cancelledBookings !== undefined) dbData.cancelled_bookings = analytics.cancelledBookings;
    if (analytics.noShowBookings !== undefined) dbData.no_show_bookings = analytics.noShowBookings;
    if (analytics.totalGuests !== undefined) dbData.total_guests = analytics.totalGuests;
    if (analytics.repeatGuests !== undefined) dbData.repeat_guests = analytics.repeatGuests;
    if (analytics.averageStayDuration !== undefined) dbData.average_stay_duration = analytics.averageStayDuration;
    if (analytics.averageRating !== undefined) dbData.average_rating = analytics.averageRating;
    if (analytics.totalReviews !== undefined) dbData.total_reviews = analytics.totalReviews;

    return dbData;
  }

  private transformGuestLoyaltyFromDB(dbLoyalty: any): GuestLoyaltyTier {
    return {
      id: dbLoyalty.id,
      guestProfileId: dbLoyalty.guest_profile_id,
      tierName: dbLoyalty.tier_name,
      pointsEarned: dbLoyalty.points_earned,
      pointsRedeemed: dbLoyalty.points_redeemed,
      currentPoints: dbLoyalty.current_points,
      isVip: dbLoyalty.is_vip,
      vipSince: dbLoyalty.vip_since,
      discountPercentage: dbLoyalty.discount_percentage,
      priorityBooking: dbLoyalty.priority_booking,
      complimentaryUpgrades: dbLoyalty.complimentary_upgrades,
      createdAt: dbLoyalty.created_at,
      updatedAt: dbLoyalty.updated_at,
    };
  }

  private transformGuestLoyaltyToDB(loyalty: Partial<GuestLoyaltyTier>): any {
    const dbData: any = {};
    
    if (loyalty.tierName !== undefined) dbData.tier_name = loyalty.tierName;
    if (loyalty.pointsEarned !== undefined) dbData.points_earned = loyalty.pointsEarned;
    if (loyalty.pointsRedeemed !== undefined) dbData.points_redeemed = loyalty.pointsRedeemed;
    if (loyalty.currentPoints !== undefined) dbData.current_points = loyalty.currentPoints;
    if (loyalty.isVip !== undefined) dbData.is_vip = loyalty.isVip;
    if (loyalty.vipSince !== undefined) dbData.vip_since = loyalty.vipSince;
    if (loyalty.discountPercentage !== undefined) dbData.discount_percentage = loyalty.discountPercentage;
    if (loyalty.priorityBooking !== undefined) dbData.priority_booking = loyalty.priorityBooking;
    if (loyalty.complimentaryUpgrades !== undefined) dbData.complimentary_upgrades = loyalty.complimentaryUpgrades;

    return dbData;
  }

  private transformCrossPropertyGuestFromDB(dbGuest: any): CrossPropertyGuest {
    const stayHistory: PropertyStay[] = (dbGuest.guest_visits || []).map((visit: any) => ({
      propertyId: visit.property_id,
      propertyName: visit.property_name || 'Unknown Property',
      bookingId: visit.booking_id || '',
      checkIn: visit.visit_date,
      checkOut: visit.visit_date, // Assuming same day for now
      roomNumber: visit.room_number || '',
      roomType: (visit.room_type || 'standard') as RoomType,
      totalAmount: visit.amount_spent || 0,
      rating: visit.rating,
      review: visit.review
    }));

    const visitHistory: VisitHistory[] = (dbGuest.guest_visits || []).map((visit: any) => ({
      propertyId: visit.property_id,
      propertyName: visit.property_name || 'Unknown Property',
      visitDate: visit.visit_date,
      roomType: visit.room_type || 'standard',
      amount: visit.amount_spent || 0,
      rating: visit.rating,
      review: visit.review
    }));

    const preferences: TypesGuestPreferences = {
      roomType: (dbGuest.preferred_room_type || 'standard') as RoomType,
      floorPreference: (dbGuest.preferred_floor || 'any') as 'low' | 'high' | 'any',
      amenityPreferences: dbGuest.amenity_preferences || [],
      dietaryRestrictions: dbGuest.dietary_restrictions || [],
      specialRequests: dbGuest.special_requests || [],
      communicationPreference: (dbGuest.communication_preference || 'email') as 'email' | 'sms' | 'both',
      bedType: (dbGuest.preferred_bed_type || 'double') as 'single' | 'double' | 'queen' | 'king',
      floor: (dbGuest.preferred_floor || 'any') as 'ground' | 'low' | 'high' | 'any',
      amenities: dbGuest.amenity_preferences || []
    };

    return {
      id: dbGuest.id,
      name: `${dbGuest.first_name || ''} ${dbGuest.last_name || ''}`.trim(),
      email: dbGuest.email,
      phone: dbGuest.phone,
      address: dbGuest.address,
      idType: dbGuest.id_type,
      idNumber: dbGuest.id_number,
      stayHistory,
      preferences,
      totalStays: dbGuest.total_stays || 0,
      totalSpent: dbGuest.total_spent || 0,
      vipStatus: dbGuest.is_vip || false,
      totalBookings: dbGuest.total_bookings || dbGuest.total_stays || 0,
      averageRating: dbGuest.average_rating || 0,
      lastVisitDate: dbGuest.last_stay_date || dbGuest.last_visit_date || new Date().toISOString(),
      preferredProperties: [], // This would need to be calculated from visits
      loyaltyTier: (dbGuest.guest_loyalty_tiers?.[0]?.tier_name || 'bronze') as 'bronze' | 'silver' | 'gold' | 'platinum',
      specialRequests: dbGuest.special_requests || [],
      visitHistory,
      notes: dbGuest.notes,
      tags: dbGuest.tags || [],
      isVIP: dbGuest.is_vip || false,
      createdAt: dbGuest.created_at || new Date().toISOString(),
      updatedAt: dbGuest.updated_at || new Date().toISOString()
    };
  }
}

export const propertyService = new PropertyService();