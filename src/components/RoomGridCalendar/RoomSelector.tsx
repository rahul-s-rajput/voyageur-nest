import React from 'react';
import { ChevronDownIcon, HomeIcon } from '@heroicons/react/24/outline';
import { Room, RoomType } from '../../types/property';

interface RoomSelectorProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onRoomSelect: (room: Room | null) => void;
  selectedRoomType?: RoomType | null;
  onRoomTypeSelect?: (type: RoomType | null) => void;
}

export const RoomSelector: React.FC<RoomSelectorProps> = ({
  rooms,
  selectedRoom,
  onRoomSelect,
  selectedRoomType = null,
  onRoomTypeSelect,
}) => {
  const roomTypes: RoomType[] = Array.from(new Set(rooms.map(r => r.roomType))) as RoomType[];
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Room or Type
      </label>
      
      <div className="relative">
        <select
          value={selectedRoom?.id || ''}
          onChange={(e) => {
            const roomId = e.target.value;
            const room = rooms.find(r => r.id === roomId) || null;
            onRoomSelect(room);
            if (!room && onRoomTypeSelect) onRoomTypeSelect(null);
          }}
          className="
            w-full pl-10 pr-10 py-3 text-base border border-gray-300 
            rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            bg-white appearance-none cursor-pointer
          "
        >
          <option value="">All rooms</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              Room {room.roomNumber} - {room.roomType} (Max {room.maxOccupancy})
              {room.basePrice && ` - ₹${room.basePrice.toLocaleString()}`}
            </option>
          ))}
        </select>

        {/* Home Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <HomeIcon className="h-5 w-5 text-gray-400" />
        </div>

        {/* Dropdown Arrow */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Quick type chips */}
      {roomTypes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {roomTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`px-2 py-1 rounded-full text-xs border ${selectedRoomType === type ? 'bg-blue-100 border-blue-300 text-blue-800' : 'border-gray-300 text-gray-600'}`}
              onClick={() => {
                onRoomSelect(null);
                onRoomTypeSelect?.(type);
              }}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
          <button
            type="button"
            className={`px-2 py-1 rounded-full text-xs border ${selectedRoomType === null ? 'bg-blue-100 border-blue-300 text-blue-800' : 'border-gray-300 text-gray-600'}`}
            onClick={() => {
              onRoomSelect(null);
              onRoomTypeSelect?.(null);
            }}
          >
            All
          </button>
        </div>
      )}

      {/* Selected Room Info - simplified on mobile */}
      {selectedRoom && (
        <div className="mt-2 text-xs text-gray-500">
          Room {selectedRoom.roomNumber} • {selectedRoom.roomType} • Max {selectedRoom.maxOccupancy}
        </div>
      )}
    </div>
  );
};