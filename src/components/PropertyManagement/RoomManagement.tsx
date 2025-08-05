import React, { useState, useEffect } from 'react';
import { useProperty } from '../../contexts/PropertyContext';
import { propertyService } from '../../services/propertyService';
import { Room, RoomType, Property } from '../../types/property';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  HomeIcon,
  UserGroupIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface RoomManagementProps {
  property?: Property;
}

const RoomManagement: React.FC<RoomManagementProps> = ({ property: propProperty }) => {
  const { currentProperty } = useProperty();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Use prop property if provided, otherwise use currentProperty from context
  const activeProperty = propProperty || currentProperty;

  useEffect(() => {
    if (activeProperty) {
      loadRooms();
    }
  }, [activeProperty]);

  const loadRooms = async () => {
    if (!activeProperty) return;
    
    try {
      setLoading(true);
      const rooms = await propertyService.getRoomsByProperty(activeProperty.id);
      setRooms(rooms);
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = () => {
    setEditingRoom(null);
    setShowAddForm(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setShowAddForm(true);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    try {
      await propertyService.deleteRoom(roomId);
      setRooms(rooms.filter(room => room.id !== roomId));
      toast.success('Room deleted successfully');
    } catch (error) {
      toast.error('Failed to delete room');
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingRoom) {
        const updatedRoom = await propertyService.updateRoom(editingRoom.id, formData);
        setRooms(rooms.map(room => room.id === editingRoom.id ? updatedRoom : room));
        toast.success('Room updated successfully');
      } else {
        const newRoom = await propertyService.createRoom({
          ...formData,
          propertyId: activeProperty!.id,
          isActive: true
        });
        setRooms([...rooms, newRoom]);
        toast.success('Room added successfully');
      }
      setShowAddForm(false);
      setEditingRoom(null);
    } catch (error) {
      toast.error(editingRoom ? 'Failed to update room' : 'Failed to add room');
    }
  };

  const getRoomTypeColor = (roomType: RoomType) => {
    const colors = {
      standard: 'bg-blue-100 text-blue-800',
      deluxe: 'bg-purple-100 text-purple-800',
      twin_single: 'bg-green-100 text-green-800',
      suite: 'bg-yellow-100 text-yellow-800',
      dormitory: 'bg-gray-100 text-gray-800',
    };
    return colors[roomType] || 'bg-gray-100 text-gray-800';
  };

  const getRoomTypeLabel = (roomType: RoomType) => {
    const labels = {
      standard: 'Standard',
      deluxe: 'Deluxe',
      twin_single: 'Twin Single',
      suite: 'Suite',
      dormitory: 'Dormitory',
    };
    return labels[roomType] || roomType;
  };

  if (!activeProperty) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Please select a property to manage rooms</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
          <p className="text-gray-600">{activeProperty.name}</p>
        </div>
        <button
          onClick={handleAddRoom}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Room
        </button>
      </div>

      {/* Room Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <HomeIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{rooms.length}</div>
              <div className="text-sm text-gray-600">Total Rooms</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {rooms.filter(room => room.isActive).length}
              </div>
              <div className="text-sm text-gray-600">Active Rooms</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {rooms.reduce((sum, room) => sum + room.maxOccupancy, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Capacity</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CurrencyRupeeIcon className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ₹{Math.round(rooms.reduce((sum, room) => sum + room.basePrice, 0) / rooms.length || 0)}
              </div>
              <div className="text-sm text-gray-600">Avg. Price</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rooms List */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Rooms</h2>
        </div>
        
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="p-6 text-center">
            <HomeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500">No rooms found</div>
            <button
              onClick={handleAddRoom}
              className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first room
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rooms.map((room) => (
              <div key={room.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <HomeIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          Room {room.roomNumber}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoomTypeColor(room.roomType)}`}>
                          {getRoomTypeLabel(room.roomType)}
                        </span>
                        {!room.isActive && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>Floor {room.floor || 'N/A'}</span>
                        <span>Max {room.maxOccupancy} guests</span>
                        <span>₹{room.basePrice}/night</span>
                      </div>
                      {room.amenities.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {room.amenities.slice(0, 3).map((amenity, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                                {amenity}
                              </span>
                            ))}
                            {room.amenities.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                                +{room.amenities.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditRoom(room)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Room Modal */}
      {showAddForm && (
        <RoomForm
          room={editingRoom}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowAddForm(false);
            setEditingRoom(null);
          }}
        />
      )}
    </div>
  );
};

// Room Form Component
interface RoomFormProps {
  room: Room | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const RoomForm: React.FC<RoomFormProps> = ({ room, onSubmit, onCancel }) => {
  const getDefaultMaxOccupancy = (roomType: RoomType) => {
    const defaults = {
      standard: 2,
      deluxe: 2,
      twin_single: 2, // Twin single beds can accommodate 2 guests
      suite: 4,
      dormitory: 6,
    };
    return defaults[roomType] || 2;
  };

  const [formData, setFormData] = useState({
    roomNumber: room?.roomNumber || '',
    roomType: room?.roomType || 'standard' as RoomType,
    floor: room?.floor || 1,
    maxOccupancy: room?.maxOccupancy || getDefaultMaxOccupancy(room?.roomType || 'standard'),
    basePrice: room?.basePrice || 1000,
    amenities: room?.amenities || [],
  });

  const roomTypes: { value: RoomType; label: string }[] = [
    { value: 'standard', label: 'Standard' },
    { value: 'deluxe', label: 'Deluxe' },
    { value: 'twin_single', label: 'Twin Single' },
    { value: 'suite', label: 'Suite' },
    { value: 'dormitory', label: 'Dormitory' },
  ];

  const commonAmenities = [
    'WiFi', 'AC', 'TV', 'Mini Fridge', 'Balcony', 'Mountain View', 
    'River View', 'Attached Bathroom', 'Hot Water', 'Room Service'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleRoomTypeChange = (roomType: RoomType) => {
    setFormData(prev => ({
      ...prev,
      roomType,
      maxOccupancy: getDefaultMaxOccupancy(roomType)
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {room ? 'Edit Room' : 'Add New Room'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Number
                </label>
                <input
                  type="text"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, roomNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Type
                </label>
                <select
                value={formData.roomType}
                onChange={(e) => handleRoomTypeChange(e.target.value as RoomType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                  {roomTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor
                </label>
                <input
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData(prev => ({ ...prev, floor: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Occupancy
                </label>
                <input
                  type="number"
                  value={formData.maxOccupancy}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxOccupancy: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price (₹/night)
                </label>
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amenities
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonAmenities.map(amenity => (
                  <label key={amenity} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {room ? 'Update Room' : 'Add Room'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomManagement;