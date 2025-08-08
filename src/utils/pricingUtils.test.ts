import {
  calculateEffectivePrice,
  calculateFinalPrice,
  getPriceVariation,
  validatePricingUpdate,
  formatCurrency,
  calculatePricingHistory,
  getOptimalPricingSuggestions
} from './pricingUtils';
import { RoomPricing } from '../types/property';

describe('pricingUtils', () => {
  const basePricing: RoomPricing = {
    basePrice: 1000,
    weekendMultiplier: 1.2,
    seasonalAdjustments: [
      {
        id: '1',
        name: 'Summer Peak',
        type: 'percentage',
        value: 20,
        startDate: new Date(2024, 5, 1), // June 1, 2024
        endDate: new Date(2024, 7, 31),   // August 31, 2024
        isActive: true
      },
      {
        id: '2',
        name: 'Holiday Surcharge',
        type: 'fixed',
        value: 500,
        startDate: new Date(2024, 11, 20), // December 20, 2024
        endDate: new Date(2024, 11, 31),   // December 31, 2024
        isActive: true
      }
    ],
    lastUpdated: new Date(),
    updatedBy: 'admin'
  };

  describe('calculateEffectivePrice', () => {
    it('calculates base price correctly', () => {
      const winterDate = new Date(2024, 0, 15); // January 15, 2024 (Monday)
      const price = calculateEffectivePrice(basePricing, winterDate);
      expect(price).toBe(1000); // Base price only
    });

    it('applies seasonal percentage adjustment', () => {
      const summerDate = new Date(2024, 6, 15); // July 15, 2024 (Monday)
      const price = calculateEffectivePrice(basePricing, summerDate);
      expect(price).toBe(1200); // 1000 + 20%
    });

    it('applies seasonal fixed adjustment', () => {
      const holidayDate = new Date(2024, 11, 25); // December 25, 2024
      const price = calculateEffectivePrice(basePricing, holidayDate);
      expect(price).toBe(1500); // 1000 + 500
    });

    it('applies weekend multiplier', () => {
      const weekendDate = new Date(2024, 0, 13); // January 13, 2024 (Saturday)
      const price = calculateEffectivePrice(basePricing, weekendDate);
      expect(price).toBe(1200); // 1000 * 1.2
    });

    it('combines seasonal adjustment and weekend multiplier', () => {
      const summerWeekendDate = new Date(2024, 6, 13); // July 13, 2024 (Saturday)
      const price = calculateEffectivePrice(basePricing, summerWeekendDate);
      expect(price).toBe(1440); // (1000 + 20%) * 1.2
    });
  });

  describe('calculateFinalPrice', () => {
    it('calculates percentage adjustment correctly', () => {
      const price = calculateFinalPrice(1000, 'percentage', 15);
      expect(price).toBe(1150);
    });

    it('calculates fixed adjustment correctly', () => {
      const price = calculateFinalPrice(1000, 'fixed', 200);
      expect(price).toBe(1200);
    });

    it('handles negative adjustments', () => {
      const price = calculateFinalPrice(1000, 'percentage', -10);
      expect(price).toBe(900);
    });
  });

  describe('getPriceVariation', () => {
    it('detects price increase', () => {
      const summerDate = new Date(2024, 6, 15); // July 15, 2024 (Monday)
      const variation = getPriceVariation(basePricing, summerDate);
      
      expect(variation.type).toBe('increase');
      expect(variation.percentage).toBe(20);
      expect(variation.amount).toBe(200);
    });

    it('detects no variation', () => {
      const winterDate = new Date(2024, 0, 15); // January 15, 2024 (Monday)
      const variation = getPriceVariation(basePricing, winterDate);
      
      expect(variation.type).toBe('none');
      expect(variation.percentage).toBe(0);
      expect(variation.amount).toBe(0);
    });
  });

  describe('validatePricingUpdate', () => {
    it('validates correct pricing', () => {
      const result = validatePricingUpdate(basePricing);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects negative base price', () => {
      const invalidPricing = { ...basePricing, basePrice: -100 };
      const result = validatePricingUpdate(invalidPricing);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Base price must be greater than 0');
    });

    it('rejects excessive base price', () => {
      const invalidPricing = { ...basePricing, basePrice: 150000 };
      const result = validatePricingUpdate(invalidPricing);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Base price cannot exceed ₹1,00,000');
    });

    it('rejects excessive percentage adjustments', () => {
      const invalidPricing = {
        ...basePricing,
        seasonalAdjustments: [{
          id: '1',
          name: 'Invalid',
          type: 'percentage' as const,
          value: 600,
          isActive: true
        }]
      };
      const result = validatePricingUpdate(invalidPricing);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('cannot exceed ±500%');
    });
  });

  describe('formatCurrency', () => {
    it('formats currency with symbol', () => {
      const formatted = formatCurrency(1500);
      expect(formatted).toBe('₹1,500');
    });

    it('formats currency without symbol', () => {
      const formatted = formatCurrency(1500, false);
      expect(formatted).toBe('1,500');
    });
  });

  describe('calculatePricingHistory', () => {
    it('generates pricing history for date range', () => {
      const startDate = new Date(2024, 6, 10); // July 10, 2024
      const endDate = new Date(2024, 6, 12);   // July 12, 2024
      
      const history = calculatePricingHistory(basePricing, startDate, endDate);
      
      expect(history).toHaveLength(3);
      expect(history[0].price).toBe(1200); // Summer pricing
      expect(history[0].variation.type).toBe('increase');
    });
  });

  describe('getOptimalPricingSuggestions', () => {
    it('suggests price increase for high occupancy', () => {
      const suggestion = getOptimalPricingSuggestions(0.95, 'high');
      
      expect(suggestion.suggestedMultiplier).toBeGreaterThan(1);
      expect(suggestion.reasoning).toContain('High occupancy');
    });

    it('suggests price decrease for low occupancy', () => {
      const suggestion = getOptimalPricingSuggestions(0.2, 'low');
      
      expect(suggestion.suggestedMultiplier).toBeLessThan(1);
      expect(suggestion.reasoning).toContain('Low occupancy');
    });

    it('considers seasonal demand', () => {
      const highSeasonSuggestion = getOptimalPricingSuggestions(0.5, 'high');
      const lowSeasonSuggestion = getOptimalPricingSuggestions(0.5, 'low');
      
      expect(highSeasonSuggestion.suggestedMultiplier).toBeGreaterThan(lowSeasonSuggestion.suggestedMultiplier);
    });
  });
});