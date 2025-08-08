import { RoomPricing, SeasonalAdjustment } from '../types/property';
import { isWeekend } from 'date-fns';

export interface PriceVariation {
  type: 'increase' | 'decrease' | 'none';
  percentage: number;
  amount: number;
}

/**
 * Calculate the effective price for a room on a specific date
 */
export function calculateEffectivePrice(pricing: RoomPricing, date: Date): number {
  let effectivePrice = pricing.basePrice;

  // Apply seasonal adjustments
  if (pricing.seasonalAdjustments) {
    for (const adjustment of pricing.seasonalAdjustments) {
      if (isAdjustmentApplicable(adjustment, date)) {
        if (adjustment.type === 'percentage') {
          effectivePrice += (effectivePrice * adjustment.value) / 100;
        } else {
          effectivePrice += adjustment.value;
        }
      }
    }
  }

  // Apply weekend multiplier
  if (isWeekend(date) && pricing.weekendMultiplier && pricing.weekendMultiplier !== 1) {
    effectivePrice *= pricing.weekendMultiplier;
  }

  return Math.max(0, effectivePrice);
}

/**
 * Calculate the final price with adjustment
 */
export function calculateFinalPrice(
  basePrice: number, 
  adjustmentType: 'percentage' | 'fixed', 
  adjustmentValue: number
): number {
  if (adjustmentType === 'percentage') {
    return basePrice + (basePrice * adjustmentValue) / 100;
  }
  return basePrice + adjustmentValue;
}

/**
 * Get price variation compared to base price
 */
export function getPriceVariation(pricing: RoomPricing, date: Date): PriceVariation {
  const effectivePrice = calculateEffectivePrice(pricing, date);
  const basePrice = pricing.basePrice;
  
  if (effectivePrice === basePrice) {
    return { type: 'none', percentage: 0, amount: 0 };
  }

  const amount = effectivePrice - basePrice;
  const percentage = Math.round((amount / basePrice) * 100);

  return {
    type: amount > 0 ? 'increase' : 'decrease',
    percentage,
    amount
  };
}

/**
 * Check if a seasonal adjustment applies to a specific date
 */
function isAdjustmentApplicable(adjustment: SeasonalAdjustment, date: Date): boolean {
  // Check if adjustment is active
  if (adjustment.isActive === false) {
    return false;
  }

  // Check date range
  if (adjustment.startDate && adjustment.endDate) {
    const adjustmentStart = new Date(adjustment.startDate);
    const adjustmentEnd = new Date(adjustment.endDate);
    
    if (date < adjustmentStart || date > adjustmentEnd) {
      return false;
    }
  }

  // Check days of week
  if (adjustment.daysOfWeek && adjustment.daysOfWeek.length > 0) {
    const dayOfWeek = date.getDay();
    if (!adjustment.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate pricing update
 */
export function validatePricingUpdate(pricing: RoomPricing): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate base price
  if (pricing.basePrice <= 0) {
    errors.push('Base price must be greater than 0');
  }

  if (pricing.basePrice > 100000) {
    errors.push('Base price cannot exceed ₹1,00,000');
  }

  // Validate weekend multiplier
  if (pricing.weekendMultiplier && (pricing.weekendMultiplier < 0.1 || pricing.weekendMultiplier > 10)) {
    errors.push('Weekend multiplier must be between 0.1 and 10');
  }

  // Validate seasonal adjustments
  if (pricing.seasonalAdjustments) {
    for (const adjustment of pricing.seasonalAdjustments) {
      if (adjustment.type === 'percentage' && Math.abs(adjustment.value) > 500) {
        errors.push(`Percentage adjustment "${adjustment.name}" cannot exceed ±500%`);
      }
      
      if (adjustment.type === 'fixed' && Math.abs(adjustment.value) > 50000) {
        errors.push(`Fixed adjustment "${adjustment.name}" cannot exceed ±₹50,000`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, showSymbol: boolean = true): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return showSymbol ? formatted : formatted.replace('₹', '').trim();
}

/**
 * Calculate pricing history for analytics
 */
export function calculatePricingHistory(
  pricing: RoomPricing,
  startDate: Date,
  endDate: Date
): Array<{ date: Date; price: number; variation: PriceVariation }> {
  const history: Array<{ date: Date; price: number; variation: PriceVariation }> = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const price = calculateEffectivePrice(pricing, currentDate);
    const variation = getPriceVariation(pricing, currentDate);
    
    history.push({
      date: new Date(currentDate),
      price,
      variation
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return history;
}

/**
 * Get optimal pricing suggestions based on demand patterns
 */
export function getOptimalPricingSuggestions(
  occupancyRate: number,
  seasonalDemand: 'low' | 'medium' | 'high'
): { suggestedMultiplier: number; reasoning: string } {
  let suggestedMultiplier = 1;
  let reasoning = '';

  // Base suggestions on occupancy rate
  if (occupancyRate > 0.9) {
    suggestedMultiplier = 1.2;
    reasoning = 'High occupancy suggests room for price increase';
  } else if (occupancyRate < 0.3) {
    suggestedMultiplier = 0.8;
    reasoning = 'Low occupancy suggests price reduction may increase bookings';
  }

  // Adjust for seasonal demand
  switch (seasonalDemand) {
    case 'high':
      suggestedMultiplier *= 1.15;
      reasoning += ' (Peak season adjustment)';
      break;
    case 'low':
      suggestedMultiplier *= 0.9;
      reasoning += ' (Off-season adjustment)';
      break;
  }

  return {
    suggestedMultiplier: Math.round(suggestedMultiplier * 100) / 100,
    reasoning: reasoning || 'Current pricing appears optimal'
  };
}