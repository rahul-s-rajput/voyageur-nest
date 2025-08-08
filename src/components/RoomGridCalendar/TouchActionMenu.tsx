import React from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  PencilIcon, 
  EyeIcon, 
  XMarkIcon,
  CheckIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Room } from '../../types/property';
import { Booking } from '../../types/booking';
import { bookingService } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface TouchActionMenuProps {
  room: Room;
  date: Date;
  booking?: Booking;
  showPricing?: boolean;
  onClose: () => void;
  onBookingClick?: (booking: Booking) => void;
  onCellClick?: (room: Room, date: Date) => void;
  // Optional handlers (if not provided, built-ins will run)
  onCancelBooking?: (booking: Booking) => void;
  onCheckIn?: (booking: Booking) => void;
  onCheckOut?: (booking: Booking) => void;
  onDeleteBooking?: (booking: Booking) => void;
}

export const TouchActionMenu: React.FC<TouchActionMenuProps> = ({
  room,
  date,
  booking,
  showPricing = false,
  onClose,
  onBookingClick,
  onCellClick,
  onCancelBooking,
  onCheckIn,
  onCheckOut,
  onDeleteBooking,
}) => {
  const actions: Array<{ icon: any; label: string; action: () => void; color?: 'blue' | 'green' | 'red' | 'gray' }> = [];

  if (booking) {
    // Actions for occupied cells
    actions.push({
      icon: EyeIcon,
      label: 'View Booking',
      action: () => onBookingClick?.(booking),
      color: 'blue',
    });
    actions.push({
      icon: PencilIcon,
      label: 'Edit Booking',
      action: () => onBookingClick?.(booking),
      color: 'green',
    });
    // Cancel (soft)
    actions.push({
      icon: XMarkIcon,
      label: 'Cancel Booking',
      action: async () => {
        if (onCancelBooking) return onCancelBooking(booking);
        const ok = await bookingService.cancelBooking(booking.id);
        if (ok) toast.success('Booking cancelled');
      },
      color: 'red',
    });
    // Check-in: update status and auto-open QR in BookingDetails
    actions.push({
      icon: CheckIcon,
      label: 'Check-in',
      action: async () => {
        if (onCheckIn) return onCheckIn(booking);
        const updated = await bookingService.updateBooking(booking.id, { status: 'checked-in' as any });
        if (updated) {
          toast.success('Guest checked-in');
          try {
            sessionStorage.setItem('open_qr_for_booking_id', booking.id);
          } catch {}
          onBookingClick?.(updated);
        }
      },
      color: 'green',
    });
    // Check-out: only if already checked-in
    actions.push({
      icon: ArrowRightOnRectangleIcon,
      label: 'Check-out',
      action: async () => {
        if (onCheckOut) return onCheckOut(booking);
        // Verify latest status before checking out
        const latest = await bookingService.getBookingById(booking.id);
        if (!latest) {
          toast.error('Unable to fetch booking');
          return;
        }
        if (latest.status !== 'checked-in') {
          toast.error('Check-out allowed only after check-in');
          return;
        }
        const updated = await bookingService.updateBooking(booking.id, { status: 'checked-out' as any });
        if (updated) toast.success('Guest checked-out');
      },
      color: 'blue',
    });
    // Delete (cancelled only)
    actions.push({
      icon: TrashIcon,
      label: 'Delete (Cancelled Only)',
      action: async () => {
        if (onDeleteBooking) return onDeleteBooking(booking);
        if (!booking.cancelled) {
          toast.error('Delete allowed only for cancelled bookings');
          return;
        }
        const ok = await bookingService.deleteBooking(booking.id);
        if (ok) toast.success('Booking deleted');
      },
      color: 'gray',
    });
  } else {
    // Actions for available cells
    actions.push({
      icon: PlusIcon,
      label: 'New Booking',
      action: () => onCellClick?.(room, date),
      color: 'blue',
    });
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl p-6 m-4 max-w-sm w-full shadow-xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          {actions.map(({ icon: Icon, label, action, color }, idx) => (
            <button
              key={idx}
              onClick={action}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors
                ${color === 'blue' ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800'
                : color === 'green' ? 'bg-green-50 hover:bg-green-100 border-green-200 text-green-800'
                : color === 'red' ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-800'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TouchActionMenu;