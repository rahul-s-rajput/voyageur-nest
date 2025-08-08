/**
 * Utility to clear corrupted localStorage data
 * Run this in the browser console if the calendar dates are stuck or incorrect:
 * localStorage.removeItem('gridCalendarSettings');
 * Then refresh the page.
 */

export function clearGridCalendarSettings() {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('gridCalendarSettings');
    console.log('Grid calendar settings cleared. Please refresh the page.');
    return true;
  }
  return false;
}

/**
 * Validate and fix grid calendar settings in localStorage
 */
export function validateGridCalendarSettings() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  const savedSettings = localStorage.getItem('gridCalendarSettings');
  if (!savedSettings) {
    return true; // No settings to validate
  }

  try {
    const parsed = JSON.parse(savedSettings);
    const startDate = new Date(parsed.dateRange.start);
    const endDate = new Date(parsed.dateRange.end);
    
    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn('Invalid dates in grid calendar settings, clearing...');
      clearGridCalendarSettings();
      return false;
    }
    
    // Check if date range makes sense
    if (endDate <= startDate) {
      console.warn('End date is before start date, clearing settings...');
      clearGridCalendarSettings();
      return false;
    }
    
    // Check for week view with wrong number of days
    if (parsed.viewType === 'week') {
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff !== 6) {
        console.warn(`Week view should have 7 days but has ${daysDiff + 1} days, clearing settings...`);
        clearGridCalendarSettings();
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to parse grid calendar settings:', error);
    clearGridCalendarSettings();
    return false;
  }
}

// Auto-validate on module load in development
if (process.env.NODE_ENV === 'development') {
  validateGridCalendarSettings();
}
