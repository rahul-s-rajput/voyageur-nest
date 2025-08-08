import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { RoomPricing, SeasonalAdjustment } from '../../types/room';

interface PricingTooltipProps {
  pricing: RoomPricing;
  date: Date;
  effectivePrice: number;
}

export const PricingTooltip: React.FC<PricingTooltipProps> = ({
  pricing,
  date,
  effectivePrice
}) => {
  return (
    <motion.div
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64 -top-2 left-full ml-2"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      <div className="space-y-2">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
          <span className="text-sm font-medium text-gray-700">
            {format(date, 'MMM dd, yyyy')}
          </span>
          <span className="text-lg font-bold text-green-600">
            ₹{effectivePrice.toFixed(0)}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base Price:</span>
            <span className="font-medium">₹{pricing.basePrice}</span>
          </div>

          {pricing.seasonalAdjustments?.map((adjustment: SeasonalAdjustment) => (
            <div key={adjustment.id} className="flex justify-between text-sm">
              <span className="text-gray-600">{adjustment.name}:</span>
              <span className={`font-medium ${
                adjustment.value > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {adjustment.type === 'percentage' 
                  ? `${adjustment.value > 0 ? '+' : ''}${adjustment.value}%`
                  : `${adjustment.value > 0 ? '+' : ''}₹${adjustment.value}`
                }
              </span>
            </div>
          ))}
        </div>

        {pricing.weekendMultiplier && pricing.weekendMultiplier !== 1 && (
          <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
            <span className="text-gray-600">Weekend Rate:</span>
            <span className="font-medium text-blue-600">
              {pricing.weekendMultiplier}x
            </span>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-2">
          Click to edit pricing
        </div>
      </div>

      {/* Arrow pointing to the pricing display */}
      <div className="absolute top-3 -left-1 w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
    </motion.div>
  );
};