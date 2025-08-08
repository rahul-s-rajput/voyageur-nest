import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Room, RoomPricing, SeasonalAdjustment } from '../../types/room';
import { PricingTooltip } from './PricingTooltip';
import { calculateEffectivePrice, getPriceVariation } from '../../utils/pricingUtils';

interface PricingDisplayProps {
  room: Room;
  date: Date;
  pricing?: RoomPricing; // Optional override for testing
  showDetails?: boolean;
  compact?: boolean;
  onPriceClick?: (room: Room, date: Date) => void;
}

export const PricingDisplay: React.FC<PricingDisplayProps> = ({
  room,
  date,
  pricing: externalPricing,
  showDetails = false,
  compact = false,
  onPriceClick,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Use external pricing if provided, otherwise room.pricing, or create basic pricing from basePrice
  const pricing = externalPricing || room.pricing || {
    basePrice: room.basePrice || 0,
    weekendMultiplier: 1,
    seasonalAdjustments: [],
    lastUpdated: new Date(),
    updatedBy: 'system'
  };
  
  const effectivePrice = calculateEffectivePrice(pricing, date);
  const priceVariation = getPriceVariation(pricing, date);

  return (
    <div className="relative">
      <div
        className={`
          inline-flex items-center cursor-pointer
          transition-all duration-200 hover:bg-gray-50
          ${compact ? 'space-x-1 px-2 py-1 text-xs' : 'space-x-2 px-3 py-2'}
          rounded-lg
          ${priceVariation.type === 'increase' ? 'bg-green-50 hover:bg-green-100' : 
            priceVariation.type === 'decrease' ? 'bg-red-50 hover:bg-red-100' : 
            'bg-gray-50 hover:bg-gray-100'}
        `}
        onClick={() => onPriceClick?.(room, date)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className={`flex items-center space-x-1 font-semibold ${
          priceVariation.type === 'increase' ? 'text-red-600' :
          priceVariation.type === 'decrease' ? 'text-green-600' :
          'text-gray-900'
        }`}>
          <span>₹{effectivePrice.toFixed(0)}</span>
          {priceVariation.percentage !== 0 && (
            <span className={`text-xs px-1 py-0.5 rounded ${
              priceVariation.percentage > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {priceVariation.percentage > 0 ? '+' : ''}
              {priceVariation.percentage}%
            </span>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="mt-2 space-y-1 text-xs text-gray-600">
          <div>Base: ₹{pricing.basePrice}</div>
          {pricing.seasonalAdjustments?.map((adj: SeasonalAdjustment) => (
            <div key={adj.id} className="flex justify-between">
              <span>{adj.name}:</span>
              <span>{adj.type === 'percentage' ? `${adj.value}%` : `₹${adj.value}`}</span>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showTooltip && (
          <PricingTooltip 
            pricing={pricing}
            date={date}
            effectivePrice={effectivePrice}
          />
        )}
      </AnimatePresence>
    </div>
  );
};