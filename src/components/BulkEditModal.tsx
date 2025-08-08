import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, ToggleLeft, ToggleRight, AlertTriangle, CheckCircle, Eye, Save } from 'lucide-react';
import { BulkEditOptions, BulkEditPreview, BulkEditResult } from '../types/bulkEdit';
import { RoomType } from '../types/property';
import { BulkEditService } from '../services/bulkEditService';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: BulkEditResult) => void;
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { currentProperty } = useProperty();
  const [step, setStep] = useState<'configure' | 'preview' | 'applying'>('configure');
  const [options, setOptions] = useState<BulkEditOptions>({
    selectionType: 'roomType',
    dateRange: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    updatePricing: false,
    updateAvailability: false
  });
  const [preview, setPreview] = useState<BulkEditPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);

  // Room types available for selection
  const roomTypes: RoomType[] = ['standard', 'deluxe', 'twin_single', 'suite', 'dormitory'];

  useEffect(() => {
    if (isOpen && currentProperty) {
      fetchAvailableRooms();
    }
  }, [isOpen, currentProperty]);

  const fetchAvailableRooms = async () => {
    if (!currentProperty) return;
    
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('room_number')
        .eq('property_id', currentProperty.id)
        .eq('is_active', true)
        .order('room_number');

      if (error) {
        console.error('Error fetching rooms:', error);
        return;
      }

      const roomNumbers = data?.map(room => room.room_number) || [];
      setAvailableRooms(roomNumbers);
    } catch (error) {
      console.error('Error fetching available rooms:', error);
    }
  };

  const handleGeneratePreview = async () => {
    if (!currentProperty) return;

    setLoading(true);
    setError(null);

    try {
      const previewData = await BulkEditService.getBulkEditPreview(currentProperty.id, options);
      setPreview(previewData);
      setStep('preview');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!currentProperty) return;

    setLoading(true);
    setStep('applying');

    try {
      const result = await BulkEditService.applyBulkEdit(currentProperty.id, options);

      // After successful local updates, generate manual update checklists for OTAs
      try {
        const { ManualUpdateService } = await import('../services/manualUpdateService');
        await ManualUpdateService.createBulkEditChecklistsForProperty(
          currentProperty.id,
          options,
          ['booking.com', 'gommt']
        );
      } catch (e) {
        console.error('Failed to generate manual update checklists for OTAs:', e);
      }

      onSuccess(result);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to apply changes');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('configure');
    setPreview(null);
    setError(null);
  };

  const isConfigurationValid = () => {
    if (!options.updatePricing && !options.updateAvailability) return false;
    if (options.selectionType === 'roomType' && !options.selectedRoomType) return false;
    if (options.selectionType === 'roomNumber' && (!options.selectedRoomNumbers || options.selectedRoomNumbers.length === 0)) return false;
    if (options.updatePricing && !options.pricingUpdate) return false;
    if (options.updateAvailability && !options.availabilityUpdate) return false;
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Bulk Edit Rooms - {currentProperty?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step === 'configure' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'configure' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="ml-2 font-medium">Configure</span>
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className={`flex items-center ${step === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Preview</span>
            </div>
            <div className="flex-1 h-px bg-gray-300"></div>
            <div className={`flex items-center ${step === 'applying' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'applying' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <span className="ml-2 font-medium">Apply</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {step === 'configure' && (
            <div className="space-y-6">
              {/* Room Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Rooms</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="selectionType"
                        value="roomType"
                        checked={options.selectionType === 'roomType'}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          selectionType: e.target.value as 'roomType' | 'roomNumber',
                          selectedRoomType: undefined,
                          selectedRoomNumbers: undefined
                        }))}
                        className="mr-2"
                      />
                      By Room Type
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="selectionType"
                        value="roomNumber"
                        checked={options.selectionType === 'roomNumber'}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          selectionType: e.target.value as 'roomType' | 'roomNumber',
                          selectedRoomType: undefined,
                          selectedRoomNumbers: undefined
                        }))}
                        className="mr-2"
                      />
                      By Room Number
                    </label>
                  </div>

                  {options.selectionType === 'roomType' && (
                    <select
                      value={options.selectedRoomType || ''}
                      onChange={(e) => setOptions(prev => ({ 
                        ...prev, 
                        selectedRoomType: e.target.value as RoomType 
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Room Type</option>
                      {roomTypes.map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  )}

                  {options.selectionType === 'roomNumber' && (
                    <div className="grid grid-cols-3 gap-2">
                      {availableRooms.map(roomNo => (
                        <label key={roomNo} className="flex items-center p-2 border rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={options.selectedRoomNumbers?.includes(roomNo) || false}
                            onChange={(e) => {
                              const currentRooms = options.selectedRoomNumbers || [];
                              if (e.target.checked) {
                                setOptions(prev => ({ 
                                  ...prev, 
                                  selectedRoomNumbers: [...currentRooms, roomNo] 
                                }));
                              } else {
                                setOptions(prev => ({ 
                                  ...prev, 
                                  selectedRoomNumbers: currentRooms.filter(r => r !== roomNo) 
                                }));
                              }
                            }}
                            className="mr-2"
                          />
                          Room {roomNo}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Date Range
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={options.dateRange.startDate}
                      onChange={(e) => setOptions(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, startDate: e.target.value } 
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={options.dateRange.endDate}
                      onChange={(e) => setOptions(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, endDate: e.target.value } 
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Update Options */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Update Options</h3>
                <div className="space-y-4">
                  {/* Pricing Update */}
                  <div className="border rounded-lg p-4">
                    <label className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        checked={options.updatePricing}
                        onChange={(e) => {
                          setOptions(prev => ({ 
                            ...prev, 
                            updatePricing: e.target.checked,
                            pricingUpdate: e.target.checked ? {
                              type: 'percentage',
                              value: 0
                            } : undefined
                          }));
                        }}
                        className="mr-2"
                      />
                      <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                      Update Pricing
                    </label>

                    {options.updatePricing && (
                      <div className="space-y-3 ml-7">
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="pricingType"
                              value="percentage"
                              checked={options.pricingUpdate?.type === 'percentage'}
                              onChange={() => setOptions(prev => ({ 
                                ...prev, 
                                pricingUpdate: { ...prev.pricingUpdate!, type: 'percentage' } 
                              }))}
                              className="mr-2"
                            />
                            Percentage Change
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="pricingType"
                              value="fixed"
                              checked={options.pricingUpdate?.type === 'fixed'}
                              onChange={() => setOptions(prev => ({ 
                                ...prev, 
                                pricingUpdate: { ...prev.pricingUpdate!, type: 'fixed' } 
                              }))}
                              className="mr-2"
                            />
                            Fixed Price
                          </label>
                        </div>

                        <div className="flex items-center space-x-2">
                          {options.pricingUpdate?.type === 'percentage' && (
                            <>
                              <input
                                type="number"
                                value={options.pricingUpdate.value}
                                onChange={(e) => setOptions(prev => ({ 
                                  ...prev, 
                                  pricingUpdate: { ...prev.pricingUpdate!, value: parseFloat(e.target.value) || 0 } 
                                }))}
                                className="w-24 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                              />
                              <span className="text-gray-600">% change</span>
                            </>
                          )}

                          {options.pricingUpdate?.type === 'fixed' && (
                            <>
                              <span className="text-gray-600">₹</span>
                              <input
                                type="number"
                                value={options.pricingUpdate.basePrice || options.pricingUpdate.value}
                                onChange={(e) => setOptions(prev => ({ 
                                  ...prev, 
                                  pricingUpdate: { 
                                    ...prev.pricingUpdate!, 
                                    basePrice: parseFloat(e.target.value) || 0,
                                    value: parseFloat(e.target.value) || 0
                                  } 
                                }))}
                                className="w-32 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                              />
                              <span className="text-gray-600">per night</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Availability Update */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {(options.availabilityUpdate?.isAvailable ?? true) ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-red-600" />
                        )}
                        <span className="ml-2 font-medium">Availability for selected dates</span>
                      </div>
                      {options.updateAvailability && (
                        <button
                          type="button"
                          onClick={() => setOptions(prev => ({ ...prev, updateAvailability: false, availabilityUpdate: undefined }))}
                          className="text-sm text-gray-500 hover:text-gray-700"
                          title="Clear availability change"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <div className="mt-3 ml-7">
                      <label className="inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={options.availabilityUpdate?.isAvailable ?? true}
                          onChange={(e) => setOptions(prev => ({
                            ...prev,
                            updateAvailability: true,
                            availabilityUpdate: { ...(prev.availabilityUpdate || { isAvailable: true }), isAvailable: e.target.checked }
                          }))}
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${
                          (options.availabilityUpdate?.isAvailable ?? true) ? 'bg-green-600' : 'bg-red-600'
                        }`}></div>
                        <span className={`ml-3 text-sm ${(options.availabilityUpdate?.isAvailable ?? true) ? 'text-green-700' : 'text-red-700'}`}>
                          {(options.availabilityUpdate?.isAvailable ?? true) ? 'Available' : 'Unavailable'}
                        </span>
                      </label>

                      {!(options.availabilityUpdate?.isAvailable ?? true) && (
                        <input
                          type="text"
                          value={options.availabilityUpdate?.reason || ''}
                          onChange={(e) => setOptions(prev => ({ 
                            ...prev, 
                            updateAvailability: true,
                            availabilityUpdate: { ...prev.availabilityUpdate!, reason: e.target.value } 
                          }))}
                          placeholder="Reason for unavailability (optional)"
                          className="mt-3 w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-2">Preview Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Rooms:</span>
                    <div className="text-blue-900">{preview.summary.totalRooms}</div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Dates:</span>
                    <div className="text-blue-900">{preview.summary.totalDates}</div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Price Changes:</span>
                    <div className="text-blue-900">{preview.summary.priceChanges}</div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Availability Changes:</span>
                    <div className="text-blue-900">{preview.summary.availabilityChanges}</div>
                  </div>
                </div>
              </div>

              {/* Conflicts */}
              {preview.conflicts && preview.conflicts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Conflicts & Warnings</h4>
                  {preview.conflicts.map((conflict, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        conflict.severity === 'error' 
                          ? 'bg-red-50 border-red-200 text-red-800' 
                          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      }`}
                    >
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        <span className="font-medium">Room {conflict.roomNumber} - {conflict.date}</span>
                      </div>
                      <div className="mt-1 text-sm">{conflict.message}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Affected Rooms */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Affected Rooms</h4>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Room</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        {options.updatePricing && (
                          <>
                            <th className="px-4 py-2 text-left">Current Price</th>
                            <th className="px-4 py-2 text-left">New Price</th>
                          </>
                        )}
                        {options.updateAvailability && (
                          <>
                            <th className="px-4 py-2 text-left">Current Status</th>
                            <th className="px-4 py-2 text-left">New Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.affectedRooms.map((room, index) => (
                        <tr key={index} className={`border-t ${room.error ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-2 font-medium">{room.roomNumber}</td>
                          <td className="px-4 py-2 capitalize">{room.roomType.replace('_', ' ')}</td>
                          {options.updatePricing && (
                            <>
                              <td className="px-4 py-2">
                                {room.error ? (
                                  <div className="flex items-center text-red-600">
                                    <AlertTriangle className="w-4 h-4 mr-1" />
                                    <span>Error loading price</span>
                                  </div>
                                ) : (
                                  `₹${room.currentPrice}`
                                )}
                              </td>
                              <td className="px-4 py-2 font-medium text-green-600">
                                {room.error ? (
                                  <div className="flex items-center text-red-600">
                                    <AlertTriangle className="w-4 h-4 mr-1" />
                                    <span>Error</span>
                                  </div>
                                ) : (
                                  `₹${room.newPrice}`
                                )}
                              </td>
                            </>
                          )}
                          {options.updateAvailability && (
                            <>
                              <td className="px-4 py-2">
                                {room.error ? (
                                  <div className="flex items-center text-yellow-600">
                                    <AlertTriangle className="w-4 h-4 mr-1" />
                                    <span>Status unknown</span>
                                  </div>
                                ) : (
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    room.currentAvailability ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {room.currentAvailability ? 'Available' : 'Unavailable'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                {room.error ? (
                                  <div className="flex items-center text-yellow-600">
                                    <AlertTriangle className="w-4 h-4 mr-1" />
                                    <span>Status unknown</span>
                                  </div>
                                ) : (
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    room.newAvailability ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {room.newAvailability ? 'Available' : 'Unavailable'}
                                  </span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'applying' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Applying bulk changes...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div>
            {step === 'preview' && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back to Configure
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            
            {step === 'configure' && (
              <button
                onClick={handleGeneratePreview}
                disabled={!isConfigurationValid() || loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" />
                {loading ? 'Generating...' : 'Preview Changes'}
              </button>
            )}
            
            {step === 'preview' && (
              <button
                onClick={handleApplyChanges}
                disabled={loading || (preview?.conflicts?.some(c => c.severity === 'error') || false)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                Apply Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};