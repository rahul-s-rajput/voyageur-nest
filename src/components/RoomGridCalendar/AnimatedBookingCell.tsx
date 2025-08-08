import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookingCell, BookingCellProps } from './BookingCell';

interface AnimatedBookingCellProps extends BookingCellProps {
  isUpdating?: boolean;
  updateType?: 'created' | 'updated' | 'deleted';
  lastUpdateTime?: number;
}

export const AnimatedBookingCell: React.FC<AnimatedBookingCellProps> = ({
  isUpdating = false,
  updateType,
  lastUpdateTime,
  ...cellProps
}) => {
  const [showUpdateFlash, setShowUpdateFlash] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (isUpdating && lastUpdateTime) {
      setShowUpdateFlash(true);
      setFlashKey(prev => prev + 1);
      
      const timer = setTimeout(() => setShowUpdateFlash(false), 1500);
      return () => clearTimeout(timer);
    } else {
      // Clear flash immediately when not updating
      setShowUpdateFlash(false);
    }
  }, [isUpdating, lastUpdateTime]);

  const getAnimationVariants = () => {
    switch (updateType) {
      case 'created':
        return {
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { duration: 0.5, ease: "easeOut" }
        };
      case 'deleted':
        return {
          initial: { scale: 1, opacity: 1 },
          animate: { scale: 0.95, opacity: 0.7 },
          transition: { duration: 0.3 }
        };
      case 'updated':
        return {
          initial: { scale: 1 },
          animate: { scale: [1, 1.02, 1] },
          transition: { duration: 0.4 }
        };
      default:
        return {
          initial: { scale: 1, opacity: 1 },
          animate: { scale: 1, opacity: 1 },
          transition: { duration: 0.2 }
        };
    }
  };

  const getFlashColor = () => {
    switch (updateType) {
      case 'created':
        return 'bg-green-200';
      case 'updated':
        return 'bg-blue-200';
      case 'deleted':
        return 'bg-red-200';
      default:
        return 'bg-blue-200';
    }
  };

  const getRingColor = () => {
    switch (updateType) {
      case 'created':
        return 'ring-green-400';
      case 'updated':
        return 'ring-blue-400';
      case 'deleted':
        return 'ring-red-400';
      default:
        return 'ring-blue-400';
    }
  };

  const animationVariants = getAnimationVariants();

  return (
    <motion.div
      className={`relative ${showUpdateFlash ? `ring-2 ${getRingColor()} ring-opacity-75` : ''}`}
      {...animationVariants}
    >
      <BookingCell {...cellProps} />
      
      {/* Update flash overlay */}
      {showUpdateFlash && (
        <motion.div
          key={flashKey}
          className={`absolute inset-0 ${getFlashColor()} opacity-30 rounded pointer-events-none`}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      )}
      
      {/* Update type indicator */}
      {isUpdating && updateType && (
        <motion.div
          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
            updateType === 'created' ? 'bg-green-500' :
            updateType === 'updated' ? 'bg-blue-500' :
            'bg-red-500'
          }`}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.div>
  );
};