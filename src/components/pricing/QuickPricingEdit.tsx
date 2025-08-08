import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Room, RoomPricing } from '../../types/room';
import { calculateFinalPrice } from '../../utils/pricingUtils';

interface QuickPricingEditProps {
  room: Room;
  date: Date;
  currentPricing: RoomPricing;
  onUpdate: (pricing: RoomPricing) => void;
  onCancel: () => void;
}

export const QuickPricingEdit: React.FC<QuickPricingEditProps> = ({
  room,
  date,
  currentPricing,
  onUpdate,
  onCancel
}) => {
  const [basePrice, setBasePrice] = useState(currentPricing.basePrice);
  const [adjustmentType, setAdjustmentType] = useState<'percentage' | 'fixed'>('percentage');
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Calculate the final price based on base price and adjustment
      const finalPrice = calculateFinalPrice(basePrice, adjustmentType, adjustmentValue);
      
      // Create updated pricing with the calculated final price as base price
      // This ensures the final price is what gets stored for this specific date
      const updatedPricing: RoomPricing = {
        ...currentPricing,
        basePrice: finalPrice, // Use the calculated final price
        seasonalAdjustments: adjustmentValue !== 0 ? [
          {
            id: `quick-edit-${Date.now()}`,
            name: `Quick Edit - ${format(date, 'MMM dd')}`,
            type: adjustmentType,
            value: adjustmentValue,
            startDate: date,
            endDate: date,
            daysOfWeek: [date.getDay()],
            isActive: true
          }
        ] : [] // Only add adjustment if there's actually an adjustment value
      };

      await onUpdate(updatedPricing);
    } catch (error) {
      console.error('Failed to update pricing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold text-gray-900">Edit Pricing</h4>
        <span className="text-sm text-gray-500">
          {room.roomNumber} - {format(date, 'MMM dd, yyyy')}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
          <input
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment</label>
          <div className="flex space-x-2">
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as 'percentage' | 'fixed')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
            <input
              type="number"
              value={adjustmentValue}
              onChange={(e) => setAdjustmentValue(Number(e.target.value))}
              placeholder={adjustmentType === 'percentage' ? '±%' : '±₹'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
          <span className="text-sm font-medium text-gray-700">Final Price:</span>
          <span className="text-lg font-bold text-green-600">
            ₹{calculateFinalPrice(basePrice, adjustmentType, adjustmentValue)}
          </span>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button 
          onClick={onCancel} 
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button 
          onClick={handleSave} 
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </motion.div>
  );
};