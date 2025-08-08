import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Booking } from '../types/booking';
import { Room } from '../types/room';

export interface GridUpdateEvent {
  type: 'booking_created' | 'booking_updated' | 'booking_deleted' | 'room_updated';
  data: {
    bookingId?: string;
    roomNo?: string;
    propertyId: string;
    dateRange?: { start: Date; end: Date };
    booking?: Booking;
    room?: Room;
  };
  timestamp: string;
}

interface UseRealTimeGridOptions {
  propertyId: string;
  dateRange: { start: Date; end: Date };
  onUpdate?: (event: GridUpdateEvent) => void;
}

export const useRealTimeGrid = ({
  propertyId,
  dateRange,
  onUpdate
}: UseRealTimeGridOptions) => {
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, GridUpdateEvent>>(new Map());
  const subscriptionRef = useRef<any>(null);
  const isCleaningUpRef = useRef<boolean>(false);

  const handleGridUpdate = useCallback((event: GridUpdateEvent) => {
    if (isCleaningUpRef.current) return;
    
    // Track the update briefly for UI feedback
    const updateId = `${event.type}_${event.data.bookingId || event.data.roomNo}_${Date.now()}`;
    setPendingUpdates(prev => new Map(prev).set(updateId, event));

    // Apply update immediately
    onUpdate?.(event);

    // Remove from pending after brief delay
    setTimeout(() => {
      if (!isCleaningUpRef.current) {
        setPendingUpdates(prev => {
          const newMap = new Map(prev);
          newMap.delete(updateId);
          return newMap;
        });
      }
    }, 1000); // Reduced from 3000ms to 1000ms
  }, [onUpdate]);

  const setupRealTimeSubscription = useCallback(() => {
    if (isCleaningUpRef.current) return;
    
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Subscribe to booking and room changes for the property
    const subscription = supabase
      .channel(`grid_updates_${propertyId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'bookings',
          filter: `property_id=eq.${propertyId}`
        }, 
        (payload) => {
          if (isCleaningUpRef.current) return;
          
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          
          try {
            let gridEvent: GridUpdateEvent;
            
            if (eventType === 'DELETE') {
              const oldData = payload.old as any;
              gridEvent = {
                type: 'booking_deleted',
                data: {
                  bookingId: oldData?.id || 'unknown',
                  propertyId,
                  roomNo: oldData?.room_no || 'unknown'
                },
                timestamp: new Date().toISOString()
              };
            } else if (payload.new && typeof payload.new === 'object') {
              const bookingData = payload.new as any;
              
              // Transform snake_case to camelCase
              const booking: Booking = {
                id: bookingData.id || '',
                propertyId: bookingData.property_id || propertyId,
                roomNo: bookingData.room_no || '',
                guestName: bookingData.guest_name || '',
                guestEmail: bookingData.guest_email,
                guestPhone: bookingData.guest_phone,
                checkIn: bookingData.check_in || '',
                checkOut: bookingData.check_out || '',
                numberOfRooms: bookingData.number_of_rooms || 1,
                numberOfGuests: bookingData.number_of_guests,
                noOfPax: bookingData.no_of_pax,
                adultChild: bookingData.adult_child,
                totalAmount: bookingData.total_amount || 0,
                status: bookingData.status || 'pending',
                cancelled: bookingData.cancelled || false,
                paymentStatus: bookingData.payment_status,
                paymentAmount: bookingData.payment_amount,
                paymentMode: bookingData.payment_mode,
                contactPhone: bookingData.contact_phone,
                contactEmail: bookingData.contact_email,
                specialRequests: bookingData.special_requests,
                notes: bookingData.notes,
                bookingDate: bookingData.booking_date,
                folioNumber: bookingData.folio_number,
                guestProfileId: bookingData.guest_profile_id,
                createdAt: bookingData.created_at || new Date().toISOString(),
                updatedAt: bookingData.updated_at || new Date().toISOString()
              };

              // Check if booking falls within our date range
              const bookingStart = new Date(booking.checkIn);
              const bookingEnd = new Date(booking.checkOut);
              const rangeStart = dateRange.start;
              const rangeEnd = dateRange.end;

              const isInRange = bookingStart <= rangeEnd && bookingEnd >= rangeStart;

              if (isInRange) {
                gridEvent = {
                  type: eventType === 'INSERT' ? 'booking_created' : 'booking_updated',
                  data: {
                    bookingId: booking.id,
                    propertyId,
                    roomNo: booking.roomNo,
                    booking,
                    dateRange
                  },
                  timestamp: new Date().toISOString()
                };
              } else {
                // Booking is outside our range, ignore silently
                return;
              }
            } else {
              return;
            }

            handleGridUpdate(gridEvent);
          } catch (error) {
            console.error('Failed to process booking update:', error);
          }
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `property_id=eq.${propertyId}`
        },
        (payload) => {
          if (isCleaningUpRef.current) return;
          
          try {
            if (payload.new && typeof payload.new === 'object') {
              const roomData = payload.new as any;
              
              // Transform snake_case to camelCase
              const room: Room = {
                id: roomData.id,
                propertyId: roomData.property_id,
                roomNumber: roomData.room_no,
                roomNo: roomData.room_no, // Keep both for compatibility
                roomType: roomData.room_type,
                floor: roomData.floor || 1,
                maxOccupancy: roomData.max_occupancy,
                basePrice: roomData.base_price || 0,
                seasonalPricing: roomData.seasonal_pricing || {},
                amenities: roomData.amenities || [],
                isActive: roomData.is_active,
                createdAt: roomData.created_at,
                updatedAt: roomData.updated_at
              };

              const gridEvent: GridUpdateEvent = {
                type: 'room_updated',
                data: {
                  roomNo: room.roomNumber,
                  propertyId,
                  room
                },
                timestamp: new Date().toISOString()
              };

              handleGridUpdate(gridEvent);
            }
          } catch (error) {
            console.error('Failed to process room update:', error);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;
  }, [propertyId, dateRange.start.getTime(), dateRange.end.getTime(), handleGridUpdate]);

  useEffect(() => {
    isCleaningUpRef.current = false;
    setupRealTimeSubscription();

    return () => {
      isCleaningUpRef.current = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [setupRealTimeSubscription]);

  // Simple optimistic update for immediate UI feedback
  const sendOptimisticUpdate = useCallback((update: Partial<GridUpdateEvent>) => {
    if (isCleaningUpRef.current) return '';
    
    const updateId = `optimistic_${Date.now()}`;
    const fullUpdate: GridUpdateEvent = {
      type: 'booking_updated',
      data: {
        propertyId,
        dateRange,
        ...update.data
      },
      timestamp: new Date().toISOString(),
      ...update
    };
    
    setPendingUpdates(prev => new Map(prev).set(updateId, fullUpdate));
    onUpdate?.(fullUpdate);
    
    return updateId;
  }, [propertyId, dateRange.start.getTime(), dateRange.end.getTime(), onUpdate]);

  const lastUpdateTime = (() => {
    const updates = Array.from(pendingUpdates.values());
    if (updates.length === 0) return null;
    const latest = updates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    return latest ? new Date(latest.timestamp).getTime() : null;
  })();

  return {
    pendingUpdates: Array.from(pendingUpdates.values()),
    lastUpdateTime,
    sendOptimisticUpdate,
    // Simplified return - no complex connection status or multiple update functions
    isSubscribed: !!subscriptionRef.current
  };
};