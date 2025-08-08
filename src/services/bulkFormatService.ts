import { OTABooking, OTAPlatform, ChecklistItem } from '../types/ota';
import { format, parseISO, differenceInDays } from 'date-fns';

// Type definitions for bulk format system
export interface BulkFormatGenerator {
  platform: 'booking.com' | 'gommt';
  format: 'csv' | 'excel' | 'json' | 'calendar-grid';
  generateBulkUpdate(bookings: OTABooking[]): BulkUpdateFormat;
  validateFormat(data: any): ValidationResult;
}

export interface BulkUpdateFormat {
  data: any;
  instructions: string[];
  estimatedTime: number; // in minutes
  copyPasteReady: boolean;
  format: string;
  platform: string;
  metadata: BulkFormatMetadata;
}

export interface BulkFormatMetadata {
  totalBookings: number;
  dateRange: {
    start: string;
    end: string;
  };
  roomTypes: string[];
  generatedAt: string;
  version: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BookingComCalendarRow {
  date: string;
  roomType: string;
  rate: number;
  availability: number;
  restrictions: string;
  minStay: number;
  maxStay: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
}

export interface GoMMTUpdateData {
  propertyId: string;
  roomTypeId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  rates: Array<{
    date: string;
    baseRate: number;
    extraAdultRate?: number;
    extraChildRate?: number;
  }>;
  availability: Array<{
    date: string;
    available: number;
    sold: number;
  }>;
  restrictions: Array<{
    date: string;
    minStay?: number;
    maxStay?: number;
    cta?: boolean; // closed to arrival
    ctd?: boolean; // closed to departure
  }>;
}

// Base abstract class for bulk format generators
abstract class BaseBulkFormatGenerator implements BulkFormatGenerator {
  abstract platform: 'booking.com' | 'gommt';
  abstract format: 'csv' | 'excel' | 'json' | 'calendar-grid';

  abstract generateBulkUpdate(bookings: OTABooking[]): BulkUpdateFormat;
  abstract validateFormat(data: any): ValidationResult;

  protected calculateEstimatedTime(bookings: OTABooking[]): number {
    // Base estimation: 30 seconds per booking + 2 minutes setup
    const baseTime = 2; // minutes for setup
    const perBookingTime = 0.5; // minutes per booking
    return Math.ceil(baseTime + (bookings.length * perBookingTime));
  }

  protected getDateRange(bookings: OTABooking[]): { start: string; end: string } {
    if (bookings.length === 0) {
      const today = new Date();
      return {
        start: format(today, 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd')
      };
    }

    const dates = bookings.flatMap(booking => [
      booking.check_in,
      booking.check_out
    ]);

    const sortedDates = dates.sort();
    return {
      start: sortedDates[0],
      end: sortedDates[sortedDates.length - 1]
    };
  }

  protected getRoomTypes(bookings: OTABooking[]): string[] {
    const roomTypes = new Set(bookings.map(booking => booking.room_no));
    return Array.from(roomTypes);
  }

  protected generateMetadata(bookings: OTABooking[]): BulkFormatMetadata {
    return {
      totalBookings: bookings.length,
      dateRange: this.getDateRange(bookings),
      roomTypes: this.getRoomTypes(bookings),
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}

// Booking.com CSV Format Generator
export class BookingComCSVGenerator extends BaseBulkFormatGenerator {
  platform: 'booking.com' = 'booking.com';
  format: 'csv' = 'csv';

  generateBulkUpdate(bookings: OTABooking[]): BulkUpdateFormat {
    const calendarRows = this.convertToCalendarRows(bookings);
    const csvData = this.generateCSV(calendarRows);
    
    return {
      data: csvData,
      instructions: this.getBookingComInstructions(),
      estimatedTime: this.calculateEstimatedTime(bookings),
      copyPasteReady: true,
      format: 'csv',
      platform: 'booking.com',
      metadata: this.generateMetadata(bookings)
    };
  }

  validateFormat(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'string') {
      errors.push('CSV data must be a string');
    }

    if (data && !data.includes('Date,Room Type,Rate,Availability')) {
      errors.push('CSV must contain required headers');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private convertToCalendarRows(bookings: OTABooking[]): BookingComCalendarRow[] {
    const rows: BookingComCalendarRow[] = [];
    
    bookings.forEach(booking => {
      const checkIn = parseISO(booking.check_in);
      const checkOut = parseISO(booking.check_out);
      const nights = differenceInDays(checkOut, checkIn);
      
      for (let i = 0; i < nights; i++) {
        const currentDate = new Date(checkIn);
        currentDate.setDate(currentDate.getDate() + i);
        
        rows.push({
          date: format(currentDate, 'yyyy-MM-dd'),
          roomType: booking.room_no,
          rate: booking.total_amount / nights, // Average rate per night
          availability: 1, // Assuming 1 room booked
          restrictions: '',
          minStay: 1,
          maxStay: 30,
          closedToArrival: false,
          closedToDeparture: false
        });
      }
    });

    return rows;
  }

  private generateCSV(rows: BookingComCalendarRow[]): string {
    const headers = [
      'Date',
      'Room Type',
      'Rate',
      'Availability',
      'Restrictions',
      'Min Stay',
      'Max Stay',
      'Closed to Arrival',
      'Closed to Departure'
    ];

    const csvRows = [
      headers.join(','),
      ...rows.map(row => [
        row.date,
        `"${row.roomType}"`,
        row.rate.toFixed(2),
        row.availability,
        `"${row.restrictions}"`,
        row.minStay,
        row.maxStay,
        row.closedToArrival ? 'Yes' : 'No',
        row.closedToDeparture ? 'Yes' : 'No'
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  private getBookingComInstructions(): string[] {
    return [
      '1. Log in to your Booking.com Extranet',
      '2. Navigate to Rates & Availability > Calendar',
      '3. Select the date range and room type',
      '4. Click on "Bulk Edit" or "Import" option',
      '5. Copy the CSV data below and paste it into the bulk edit form',
      '6. Review the data for accuracy',
      '7. Click "Save" to apply the changes',
      '8. Verify the updates in your calendar view',
      '',
      'Note: Ensure your CSV format matches Booking.com requirements',
      'Contact Booking.com support if you encounter formatting issues'
    ];
  }
}

// Booking.com Calendar Grid Generator
export class BookingComCalendarGridGenerator extends BaseBulkFormatGenerator {
  platform: 'booking.com' = 'booking.com';
  format: 'calendar-grid' = 'calendar-grid';

  generateBulkUpdate(bookings: OTABooking[]): BulkUpdateFormat {
    const gridData = this.generateCalendarGrid(bookings);
    
    return {
      data: gridData,
      instructions: this.getCalendarGridInstructions(),
      estimatedTime: this.calculateEstimatedTime(bookings) * 0.7, // Faster than CSV
      copyPasteReady: true,
      format: 'calendar-grid',
      platform: 'booking.com',
      metadata: this.generateMetadata(bookings)
    };
  }

  validateFormat(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Calendar grid data must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private generateCalendarGrid(bookings: OTABooking[]): any {
    const grid: { [date: string]: { [roomType: string]: any } } = {};
    
    bookings.forEach(booking => {
      const checkIn = parseISO(booking.check_in);
      const checkOut = parseISO(booking.check_out);
      const nights = differenceInDays(checkOut, checkIn);
      
      for (let i = 0; i < nights; i++) {
        const currentDate = new Date(checkIn);
        currentDate.setDate(currentDate.getDate() + i);
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        
        if (!grid[dateKey]) {
          grid[dateKey] = {};
        }
        
        if (!grid[dateKey][booking.room_no]) {
          grid[dateKey][booking.room_no] = {
            rate: booking.total_amount / nights,
            availability: 0,
            bookings: []
          };
        }
        
        grid[dateKey][booking.room_no].availability += 1;
        grid[dateKey][booking.room_no].bookings.push({
          id: booking.id,
          guestName: booking.guest_name,
          status: booking.status
        });
      }
    });

    return {
      grid,
      summary: {
        totalDates: Object.keys(grid).length,
        roomTypes: this.getRoomTypes(bookings),
        totalBookings: bookings.length
      }
    };
  }

  private getCalendarGridInstructions(): string[] {
    return [
      '1. Open your Booking.com Extranet calendar',
      '2. Navigate to the calendar view for the specified date range',
      '3. Use the grid data below to manually update each date/room combination',
      '4. For each date and room type, update:',
      '   - Rate: Set the daily rate',
      '   - Availability: Reduce available rooms by booking count',
      '5. Save changes after each update',
      '6. Verify all bookings are reflected correctly',
      '',
      'Tip: Process one room type at a time for better accuracy'
    ];
  }
}

// GoMMT JSON Format Generator
export class GoMMTJSONGenerator extends BaseBulkFormatGenerator {
  platform: 'gommt' = 'gommt';
  format: 'json' = 'json';

  generateBulkUpdate(bookings: OTABooking[]): BulkUpdateFormat {
    const jsonData = this.generateGoMMTJSON(bookings);
    
    return {
      data: jsonData,
      instructions: this.getGoMMTInstructions(),
      estimatedTime: this.calculateEstimatedTime(bookings) * 0.8, // Slightly faster
      copyPasteReady: true,
      format: 'json',
      platform: 'gommt',
      metadata: this.generateMetadata(bookings)
    };
  }

  validateFormat(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('JSON data must be an object');
    }

    if (data && !data.updates) {
      errors.push('JSON must contain updates array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private generateGoMMTJSON(bookings: OTABooking[]): any {
    const updates: GoMMTUpdateData[] = [];
    const roomTypeGroups = this.groupBookingsByRoomType(bookings);
    
    Object.entries(roomTypeGroups).forEach(([roomType, roomBookings]) => {
      const dateRange = this.getDateRange(roomBookings);
      
      const updateData: GoMMTUpdateData = {
        propertyId: 'PROPERTY_ID', // Default property ID - should be configured per property
        roomTypeId: this.generateRoomTypeId(roomType),
        dateRange: {
          startDate: dateRange.start,
          endDate: dateRange.end
        },
        rates: this.generateRatesArray(roomBookings),
        availability: this.generateAvailabilityArray(roomBookings),
        restrictions: this.generateRestrictionsArray(roomBookings)
      };
      
      updates.push(updateData);
    });

    return {
      updates,
      metadata: {
        totalUpdates: updates.length,
        generatedAt: new Date().toISOString(),
        platform: 'gommt',
        version: '1.0.0'
      }
    };
  }

  private groupBookingsByRoomType(bookings: OTABooking[]): { [roomType: string]: OTABooking[] } {
    return bookings.reduce((groups, booking) => {
      if (!groups[booking.room_no]) {
        groups[booking.room_no] = [];
      }
      groups[booking.room_no].push(booking);
      return groups;
    }, {} as { [roomType: string]: OTABooking[] });
  }

  private generateRoomTypeId(roomType: string): string {
    // Convert room type to ID format
    return roomType.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  private generateRatesArray(bookings: OTABooking[]): Array<{ date: string; baseRate: number }> {
    const rates: Array<{ date: string; baseRate: number }> = [];
    
    bookings.forEach(booking => {
      const checkIn = parseISO(booking.check_in);
      const checkOut = parseISO(booking.check_out);
      const nights = differenceInDays(checkOut, checkIn);
      const ratePerNight = booking.total_amount / nights;
      
      for (let i = 0; i < nights; i++) {
        const currentDate = new Date(checkIn);
        currentDate.setDate(currentDate.getDate() + i);
        
        rates.push({
          date: format(currentDate, 'yyyy-MM-dd'),
          baseRate: Math.round(ratePerNight * 100) / 100
        });
      }
    });

    return rates;
  }

  private generateAvailabilityArray(bookings: OTABooking[]): Array<{ date: string; available: number; sold: number }> {
    const availability: Array<{ date: string; available: number; sold: number }> = [];
    const dateMap: { [date: string]: number } = {};
    
    bookings.forEach(booking => {
      const checkIn = parseISO(booking.check_in);
      const checkOut = parseISO(booking.check_out);
      const nights = differenceInDays(checkOut, checkIn);
      
      for (let i = 0; i < nights; i++) {
        const currentDate = new Date(checkIn);
        currentDate.setDate(currentDate.getDate() + i);
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        
        dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;
      }
    });

    Object.entries(dateMap).forEach(([date, sold]) => {
      availability.push({
        date,
        available: Math.max(0, 10 - sold), // Assuming 10 total rooms
        sold
      });
    });

    return availability;
  }

  private generateRestrictionsArray(bookings: OTABooking[]): Array<{ date: string; minStay?: number; maxStay?: number }> {
    const restrictions: Array<{ date: string; minStay?: number; maxStay?: number }> = [];
    const dateRange = this.getDateRange(bookings);
    
    // Generate basic restrictions for the date range
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    const days = differenceInDays(end, start);
    
    for (let i = 0; i <= days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + i);
      
      restrictions.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        minStay: 1,
        maxStay: 30
      });
    }

    return restrictions;
  }

  private getGoMMTInstructions(): string[] {
    return [
      '1. Open the GoMMT Connect app on your mobile device',
      '2. Navigate to Property Management > Rate & Availability',
      '3. Select "Bulk Update" or "Import Data" option',
      '4. Choose "JSON Format" as the import type',
      '5. Copy the JSON data below and paste it into the import field',
      '6. Review the data preview for accuracy',
      '7. Tap "Import" to process the updates',
      '8. Verify the changes in your property calendar',
      '',
      'Mobile Tips:',
      '- Use landscape mode for better visibility',
      '- Process one room type at a time if data is large',
      '- Ensure stable internet connection during import',
      '',
      'Note: Contact GoMMT support if you encounter API errors'
    ];
  }
}

// Main Bulk Format Service
export class BulkFormatService {
  private generators: Map<string, BulkFormatGenerator> = new Map();

  constructor() {
    this.initializeGenerators();
  }

  private initializeGenerators(): void {
    // Booking.com generators
    this.generators.set('booking.com-csv', new BookingComCSVGenerator());
    this.generators.set('booking.com-calendar-grid', new BookingComCalendarGridGenerator());
    
    // GoMMT generators
    this.generators.set('gommt-json', new GoMMTJSONGenerator());
  }

  generateBulkUpdate(
    platform: 'booking.com' | 'gommt',
    format: 'csv' | 'excel' | 'json' | 'calendar-grid',
    bookings: OTABooking[]
  ): BulkUpdateFormat {
    const generatorKey = `${platform}-${format}`;
    const generator = this.generators.get(generatorKey);

    if (!generator) {
      throw new Error(`No generator found for platform: ${platform}, format: ${format}`);
    }

    return generator.generateBulkUpdate(bookings);
  }

  validateFormat(
    platform: 'booking.com' | 'gommt',
    format: 'csv' | 'excel' | 'json' | 'calendar-grid',
    data: any
  ): ValidationResult {
    const generatorKey = `${platform}-${format}`;
    const generator = this.generators.get(generatorKey);

    if (!generator) {
      return {
        isValid: false,
        errors: [`No validator found for platform: ${platform}, format: ${format}`],
        warnings: []
      };
    }

    return generator.validateFormat(data);
  }

  getSupportedFormats(platform: 'booking.com' | 'gommt'): string[] {
    const formats: string[] = [];
    
    this.generators.forEach((generator, key) => {
      if (key.startsWith(platform)) {
        formats.push(generator.format);
      }
    });

    return formats;
  }

  getAllSupportedPlatforms(): string[] {
    const platforms = new Set<string>();
    
    this.generators.forEach((generator) => {
      platforms.add(generator.platform);
    });

    return Array.from(platforms);
  }
}

// Export singleton instance
export const bulkFormatService = new BulkFormatService();