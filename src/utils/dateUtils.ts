import { format } from 'date-fns';

/**
 * Formats a date to YYYY-MM-DD string in local timezone
 * This avoids timezone conversion issues when using toISOString()
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateLocal(date: Date): string {
  // Use date-fns format which preserves local timezone
  return format(date, 'yyyy-MM-dd');
}

/**
 * Alternative manual method to format date in local timezone
 * Use this if date-fns is not available
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateLocalManual(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates a date at start of day in local timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object at 00:00:00 local time
 */
export function createLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Ensures a date has time set to start of day in local timezone
 * @param date - The date to normalize
 * @returns Date object at 00:00:00 local time
 */
export function startOfDayLocal(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Ensures a date has time set to end of day in local timezone
 * @param date - The date to normalize
 * @returns Date object at 23:59:59.999 local time
 */
export function endOfDayLocal(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}
