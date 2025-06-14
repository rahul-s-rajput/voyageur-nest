import React from 'react';
import { X } from 'lucide-react';
import { BookingFilters, Booking } from '../types/booking';

interface BookingFiltersPanelProps {
  filters: BookingFilters;
  onChange: (filters: BookingFilters) => void;
  onClear: () => void;
}

export const BookingFiltersPanel: React.FC<BookingFiltersPanelProps> = ({
  filters,
  onChange,
  onClear
}) => {
  const statusOptions: Booking['status'][] = ['confirmed', 'pending', 'cancelled', 'checked-in', 'checked-out'];
  const paymentStatusOptions: Booking['paymentStatus'][] = ['paid', 'partial', 'unpaid'];

  const handleStatusChange = (status: Booking['status'], checked: boolean) => {
    const currentStatuses = filters.status || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);
    
    onChange({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined
    });
  };

  const handlePaymentStatusChange = (paymentStatus: Booking['paymentStatus'], checked: boolean) => {
    const currentPaymentStatuses = filters.paymentStatus || [];
    const newPaymentStatuses = checked
      ? [...currentPaymentStatuses, paymentStatus]
      : currentPaymentStatuses.filter(s => s !== paymentStatus);
    
    onChange({
      ...filters,
      paymentStatus: newPaymentStatuses.length > 0 ? newPaymentStatuses : undefined
    });
  };

  const formatStatusLabel = (status: string) => {
    return status.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <button
          onClick={onClear}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <X className="w-4 h-4 mr-1" />
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <div className="space-y-2">
            <input
              type="date"
              placeholder="Start Date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={filters.dateRange?.start || ''}
              onChange={(e) => onChange({
                ...filters,
                dateRange: {
                  start: e.target.value,
                  end: filters.dateRange?.end || ''
                }
              })}
            />
            <input
              type="date"
              placeholder="End Date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={filters.dateRange?.end || ''}
              onChange={(e) => onChange({
                ...filters,
                dateRange: {
                  start: filters.dateRange?.start || '',
                  end: e.target.value
                }
              })}
            />
          </div>
        </div>

        {/* Guest Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Guest Name</label>
          <input
            type="text"
            placeholder="Enter guest name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={filters.guestName || ''}
            onChange={(e) => onChange({
              ...filters,
              guestName: e.target.value || undefined
            })}
          />
        </div>

        {/* Room Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
          <input
            type="text"
            placeholder="Enter room number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={filters.roomNo || ''}
            onChange={(e) => onChange({
              ...filters,
              roomNo: e.target.value || undefined
            })}
          />
        </div>

        {/* Booking Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Booking Status</label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {statusOptions.map(status => (
              <label key={status} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.status?.includes(status) || false}
                  onChange={(e) => handleStatusChange(status, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{formatStatusLabel(status)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
          <div className="space-y-2">
            {paymentStatusOptions.map(paymentStatus => (
              <label key={paymentStatus} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.paymentStatus?.includes(paymentStatus) || false}
                  onChange={(e) => handlePaymentStatusChange(paymentStatus, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{formatStatusLabel(paymentStatus)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 