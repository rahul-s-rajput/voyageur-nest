import React, { useState } from 'react';
import { Room, RoomPricing } from '../../types/property';
import { QuickPricingEdit } from '../pricing/QuickPricingEdit';
import { AnimatePresence } from 'framer-motion';

interface RoomRowWithPricingProps {
  room: Room;
  dates: Date[];
  showPricing: boolean;
  onPricingUpdate?: (room: Room, date: Date, pricing: RoomPricing) => void;
  renderBookingCell: (room: Room, date: Date, dateIndex: number, onPriceClick?: (room: Room, date: Date) => void) => React.ReactNode;
}

export const RoomRowWithPricing: React.FC<RoomRowWithPricingProps> = ({
  room,
  dates,
  showPricing,
  onPricingUpdate,
  renderBookingCell
}) => {
  const [editingPrice, setEditingPrice] = useState<{ room: Room; date: Date } | null>(null);

  const handlePriceClick = (room: Room, date: Date) => {
    if (onPricingUpdate) {
      setEditingPrice({ room, date });
    }
  };

  const handlePricingUpdate = async (pricing: RoomPricing) => {
    if (editingPrice && onPricingUpdate) {
      await onPricingUpdate(editingPrice.room, editingPrice.date, pricing);
      setEditingPrice(null);
    }
  };

  const getCurrentPricing = (): RoomPricing => {
    return room.pricing || {
      basePrice: room.basePrice,
      weekendMultiplier: 1,
      seasonalAdjustments: [],
      lastUpdated: new Date(),
      updatedBy: 'system'
    };
  };

  return (
    <div className="relative">
      <div className={`grid grid-cols-[200px_repeat(${dates.length},minmax(128px,1fr))] border-b border-gray-200 hover:bg-gray-50`}>
        {/* Room Info Column - Fixed width to match header */}
        <div className="p-4 bg-gray-50 border-r border-gray-200">
          <div className="font-semibold text-gray-900">{room.roomNumber}</div>
          <div className="text-sm text-gray-600 capitalize">{room.roomType.replace('_', ' ')}</div>
          <div className="text-xs text-gray-500">Max: {room.maxOccupancy}</div>
        </div>

        {/* Calendar Cells - Grid layout to match header */}
        {dates.map((date, index) => (
          <div key={index} className="relative border-r border-gray-200 last:border-r-0">
            {/* Booking Cell with integrated pricing */}
            <div className="h-20">
              {renderBookingCell(room, date, index, handlePriceClick)}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Pricing Edit Modal */}
      <AnimatePresence>
        {editingPrice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <QuickPricingEdit
              room={editingPrice.room}
              date={editingPrice.date}
              currentPricing={getCurrentPricing()}
              onUpdate={handlePricingUpdate}
              onCancel={() => setEditingPrice(null)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};